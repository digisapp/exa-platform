import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendTravelPartnershipEmail } from "@/lib/email";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const travelOutreachSchema = z.object({
      contacts: z.array(z.object({
        id: z.string(),
        email: z.string().email(),
        brand_name: z.string(),
        contact_name: z.string().nullable(),
      })).min(1, "No contacts provided"),
      subject: z.string().min(1, "Subject is required"),
      body: z.string().min(1, "Body is required"),
    });
    const parsed = travelOutreachSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { contacts, subject, body: emailBody } = parsed.data;

    let sent = 0;
    let failed = 0;
    const results: { email: string; success: boolean; error?: string }[] = [];

    for (const contact of contacts) {
      try {
        const result = await sendTravelPartnershipEmail({
          to: contact.email,
          brandName: contact.brand_name,
          contactName: contact.contact_name,
          subject,
          bodyText: emailBody,
        });

        if (result.success) {
          sent++;

          // Log in brand_outreach_emails
          await supabase.from("brand_outreach_emails").insert({
            contact_id: contact.id,
            subject,
            body_html: emailBody,
            sent_by: user.id,
            email_type: "travel_partnership",
            resend_message_id: (result as any).messageId,
            status: "sent",
          });

          // Update contact status to contacted (only if still new)
          await supabase
            .from("brand_outreach_contacts")
            .update({
              status: "contacted",
              last_contacted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", contact.id)
            .eq("status", "new");

          results.push({ email: contact.email, success: true });
        } else {
          failed++;
          results.push({
            email: contact.email,
            success: false,
            error: String(result.error),
          });
        }

        // Small delay between sends to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (error) {
        failed++;
        results.push({
          email: contact.email,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: contacts.length,
      results,
    });
  } catch (error: unknown) {
    console.error("Travel outreach send error:", error);
    const message = error instanceof Error ? error.message : "Failed to send emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
