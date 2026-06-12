import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import twilio from "twilio";
import { logger } from "@/lib/logger";
import { z } from "zod";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

// Cap broadcast size so a single (or compromised) admin call can't fan out
// unbounded Twilio spend. Comfortably above the full model roster.
const MAX_RECIPIENTS = 10_000;

const sendSmsSchema = z.object({
  phoneNumbers: z
    .array(z.string().min(1).max(32))
    .min(1, "No phone numbers provided")
    .max(MAX_RECIPIENTS, `Too many recipients (max ${MAX_RECIPIENTS})`),
  message: z
    .string()
    .trim()
    .min(1, "Message is required")
    .max(1600, "Message too long (max 1600 characters)"),
  modelIds: z.array(z.string()).max(MAX_RECIPIENTS).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Check admin auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Check Twilio config
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment." },
        { status: 500 }
      );
    }

    const parsed = sendSmsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    const { phoneNumbers, message, modelIds } = parsed.data;

    // Honor sms_opt_out — drop opted-out recipients before sending.
    // Lookup is best-effort by both model_id (when provided) and phone number,
    // since admin UIs may build the list from either source.
    const optedOutIds = new Set<string>();
    const optedOutPhones = new Set<string>();
    {
      const idsToCheck = (modelIds || []).filter(Boolean);
      const phonesToCheck = phoneNumbers.filter(Boolean);

      const checks: Promise<any>[] = [];
      if (idsToCheck.length) {
        checks.push(
          (supabase.from("models") as any)
            .select("id, phone")
            .in("id", idsToCheck)
            .eq("sms_opt_out", true)
        );
      }
      if (phonesToCheck.length) {
        checks.push(
          (supabase.from("models") as any)
            .select("id, phone")
            .in("phone", phonesToCheck)
            .eq("sms_opt_out", true)
        );
      }
      const checkResults = await Promise.all(checks);
      for (const r of checkResults) {
        for (const row of (r?.data || []) as Array<{ id: string; phone: string | null }>) {
          if (row.id) optedOutIds.add(row.id);
          if (row.phone) optedOutPhones.add(row.phone);
        }
      }
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Send messages
    const results = {
      sent: 0,
      failed: 0,
      skippedOptOut: 0,
      errors: [] as string[],
    };

    // Create a batch record for this broadcast
    const { data: broadcast } = await supabase
      .from("sms_broadcasts")
      .insert({
        sent_by: user.id,
        message,
        recipient_count: phoneNumbers.length,
        status: "sending",
      })
      .select()
      .single();

    const broadcastId = broadcast?.id;

    // Send to each number
    for (let i = 0; i < phoneNumbers.length; i++) {
      const phone = phoneNumbers[i];
      const modelId = modelIds?.[i];

      // Skip opted-out recipients (TCPA compliance)
      if ((modelId && optedOutIds.has(modelId)) || optedOutPhones.has(phone)) {
        results.skippedOptOut++;
        continue;
      }

      try {
        // Normalize phone number
        let normalizedPhone = phone.replace(/\D/g, "");
        if (normalizedPhone.length === 10) {
          normalizedPhone = "1" + normalizedPhone;
        }
        if (!normalizedPhone.startsWith("+")) {
          normalizedPhone = "+" + normalizedPhone;
        }

        // Send SMS
        const smsResult = await client.messages.create({
          body: message,
          from: fromNumber,
          to: normalizedPhone,
        });

        // Log the message
        await supabase.from("sms_logs").insert({
          broadcast_id: broadcastId,
          model_id: modelId || null,
          phone_number: normalizedPhone,
          message,
          direction: "outbound",
          status: smsResult.status,
          twilio_sid: smsResult.sid,
        });

        results.sent++;
      } catch (error) {
        results.failed++;
        const errorMsg = error instanceof Error ? error.message : "Unknown error";
        results.errors.push(`${phone}: ${errorMsg}`);

        // Log failed attempt
        await supabase.from("sms_logs").insert({
          broadcast_id: broadcastId,
          model_id: modelId || null,
          phone_number: phone,
          message,
          direction: "outbound",
          status: "failed",
          error_message: errorMsg,
        });
      }
    }

    // Update broadcast status
    if (broadcastId) {
      await supabase
        .from("sms_broadcasts")
        .update({
          status: results.failed === phoneNumbers.length ? "failed" : "completed",
          sent_count: results.sent,
          failed_count: results.failed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", broadcastId);
    }

    return NextResponse.json({
      success: true,
      sent: results.sent,
      failed: results.failed,
      skippedOptOut: results.skippedOptOut,
      errors: results.errors.slice(0, 10), // Limit errors returned
    });
  } catch (error) {
    logger.error("SMS send error", error);
    return NextResponse.json(
      { error: "Failed to send messages" },
      { status: 500 }
    );
  }
}
