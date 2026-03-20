import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Resend Inbound Webhook
 *
 * Receives inbound emails from Resend when someone replies to an email
 * sent from examodels.com. Stores the email in the emails table.
 *
 * Setup in Resend Dashboard:
 * 1. Go to Resend > Webhooks
 * 2. Add endpoint: https://www.examodels.com/api/webhooks/resend
 * 3. Subscribe to: email.received (inbound)
 *
 * For inbound emails specifically:
 * 1. Go to Resend > Domains > examodels.com > Inbound
 * 2. Enable inbound and set webhook URL
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    // Resend sends different event types
    const eventType = payload.type;

    // Handle inbound email
    if (eventType === "email.received") {
      const data = payload.data;
      const supabaseAdmin = createServiceRoleClient();

      // Extract sender info
      const fromEmail = data.from || data.envelope?.from || "";
      const fromName = data.from_name || fromEmail.split("@")[0] || "";
      const toEmail = Array.isArray(data.to) ? data.to[0] : (data.to || "");
      const subject = data.subject || "(no subject)";
      const bodyHtml = data.html || null;
      const bodyText = data.text || null;
      const cc = Array.isArray(data.cc) ? data.cc.join(", ") : (data.cc || null);

      // Try to find the original outbound email this is replying to (thread matching)
      let threadId = null;
      const inReplyTo = data.headers?.["in-reply-to"] || data.headers?.["In-Reply-To"];
      const references = data.headers?.["references"] || data.headers?.["References"];

      if (inReplyTo || references) {
        // Extract Resend message ID from headers
        const refIds = (references || inReplyTo || "").split(/\s+/).filter(Boolean);
        for (const refId of refIds) {
          // Clean angle brackets: <msg_id> -> msg_id
          const cleanId = refId.replace(/[<>]/g, "");
          const { data: parentEmail } = await (supabaseAdmin
            .from("emails" as any) as any)
            .select("id")
            .eq("resend_message_id", cleanId)
            .single();

          if (parentEmail) {
            threadId = parentEmail.id;
            break;
          }
        }
      }

      // If no thread found by headers, try matching by from_email + recent outbound
      if (!threadId) {
        const { data: recentOutbound } = await (supabaseAdmin
          .from("emails" as any) as any)
          .select("id")
          .eq("direction", "outbound")
          .eq("to_email", fromEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (recentOutbound) {
          threadId = recentOutbound.id;
        }
      }

      // Store the inbound email
      await (supabaseAdmin.from("emails" as any) as any).insert({
        direction: "inbound",
        thread_id: threadId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        cc,
        status: "received",
        metadata: {
          resend_event_id: payload.id,
          headers: data.headers || {},
          attachments: data.attachments?.length || 0,
        },
      });

      // If this is a reply to an outbound email, mark the outbound as "replied"
      if (threadId) {
        await (supabaseAdmin.from("emails" as any) as any)
          .update({ status: "replied", replied_at: new Date().toISOString() })
          .eq("id", threadId)
          .eq("direction", "outbound");
      }

      return NextResponse.json({ success: true });
    }

    // Handle outbound delivery status updates
    if (eventType === "email.delivered" || eventType === "email.bounced") {
      const messageId = payload.data?.email_id;
      if (messageId) {
        const supabaseAdmin = createServiceRoleClient();
        const newStatus = eventType === "email.delivered" ? "delivered" : "bounced";
        await (supabaseAdmin.from("emails" as any) as any)
          .update({ status: newStatus })
          .eq("resend_message_id", messageId)
          .eq("direction", "outbound");
      }
      return NextResponse.json({ success: true });
    }

    // Acknowledge other event types
    return NextResponse.json({ success: true, ignored: true });
  } catch (error) {
    console.error("Resend webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
