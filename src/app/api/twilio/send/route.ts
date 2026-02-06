import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

interface SendSMSRequest {
  phoneNumbers: string[];
  message: string;
  modelIds?: string[]; // For logging purposes
}

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

    // Check Twilio config
    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "Twilio not configured. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to environment." },
        { status: 500 }
      );
    }

    const body: SendSMSRequest = await request.json();
    const { phoneNumbers, message, modelIds } = body;

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.json({ error: "No phone numbers provided" }, { status: 400 });
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > 1600) {
      return NextResponse.json({ error: "Message too long (max 1600 characters)" }, { status: 400 });
    }

    // Initialize Twilio client
    const client = twilio(accountSid, authToken);

    // Send messages
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Create a batch record for this broadcast
    const { data: broadcast } = await (supabase as any)
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
        await (supabase as any).from("sms_logs").insert({
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
        await (supabase as any).from("sms_logs").insert({
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
      await (supabase as any)
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
      errors: results.errors.slice(0, 10), // Limit errors returned
    });
  } catch (error) {
    console.error("SMS send error:", error);
    return NextResponse.json(
      { error: "Failed to send messages" },
      { status: 500 }
    );
  }
}
