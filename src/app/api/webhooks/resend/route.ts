import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { classifyAndDraftReply, sendAutoReply } from "@/lib/ai-email";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET!;

// Basic spam indicators
const SPAM_PATTERNS = [
  /\b(viagra|cialis|lottery|winner|inheritance|nigerian|prince)\b/i,
  /\b(buy now|act now|limited time|click here|unsubscribe)\b/i,
  /\b(casino|betting|crypto.?currency|bitcoin.?invest)\b/i,
];

function isLikelySpam(subject: string, text: string): boolean {
  const combined = `${subject} ${text}`;
  let score = 0;
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(combined)) score++;
  }
  // Flag if 2+ spam patterns match
  return score >= 2;
}

/**
 * Parse "Name <email>" format into { name, email }
 */
function parseEmailAddress(raw: string): { name: string; email: string } {
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  return { name: raw.split("@")[0] || "", email: raw.trim() };
}

/**
 * Resend Inbound Webhook
 *
 * Webhook payload for email.received only contains metadata.
 * Must call GET /emails/receiving/{id} to get the actual email body.
 *
 * Resend payload format:
 * {
 *   "type": "email.received",
 *   "created_at": "...",
 *   "data": {
 *     "email_id": "uuid",
 *     "from": "Name <email>",
 *     "to": ["email"],
 *     "cc": [],
 *     "bcc": [],
 *     "subject": "...",
 *     "message_id": "<...>",
 *     "attachments": [...]
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const body = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    if (!svixId || !svixTimestamp || !svixSignature) {
      return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
    }

    const wh = new Webhook(RESEND_WEBHOOK_SECRET);
    let payload: any;
    try {
      payload = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as any;
    } catch {
      console.error("Resend webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const eventType = payload.type;

    // Handle inbound email
    if (eventType === "email.received") {
      const data = payload.data;
      const emailId = data.email_id;

      if (!emailId) {
        console.error("Resend webhook: missing email_id");
        return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
      }

      // Fetch the full email content from Resend API
      const resendRes = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });

      if (!resendRes.ok) {
        console.error("Failed to fetch email from Resend:", resendRes.status);
        return NextResponse.json({ error: "Failed to fetch email content" }, { status: 500 });
      }

      const fullEmail = await resendRes.json();

      // Parse sender
      const fromRaw = fullEmail.from || data.from || "";
      const { name: fromName, email: fromEmail } = parseEmailAddress(fromRaw);
      const toEmail = Array.isArray(fullEmail.to) ? fullEmail.to[0] : (fullEmail.to || "");
      const subject = fullEmail.subject || data.subject || "(no subject)";
      const bodyHtml = fullEmail.html || null;
      const bodyText = fullEmail.text || null;
      const cc = Array.isArray(fullEmail.cc) ? fullEmail.cc.join(", ") : null;
      const headers = fullEmail.headers || {};
      const messageId = fullEmail.message_id || data.message_id || null;

      // Spam check
      if (isLikelySpam(subject, bodyText || "")) {
        console.log(`Spam detected from ${fromEmail}: ${subject}`);
        return NextResponse.json({ success: true, spam: true });
      }

      const supabaseAdmin = createServiceRoleClient() as any;

      // Thread detection: In-Reply-To header → message_id match → subject match → sender match
      let threadId = null;

      // 1. Try In-Reply-To / References headers
      const inReplyTo = headers["in-reply-to"] || headers["In-Reply-To"];
      const references = headers["references"] || headers["References"];

      if (inReplyTo || references) {
        const refIds = (references || inReplyTo || "").split(/\s+/).filter(Boolean);
        for (const refId of refIds) {
          const cleanId = refId.replace(/[<>]/g, "");
          const { data: parentEmail } = await supabaseAdmin
            .from("emails")
            .select("id")
            .eq("resend_message_id", cleanId)
            .single();

          if (parentEmail) {
            threadId = parentEmail.id;
            break;
          }
        }
      }

      // 2. Subject-based fallback (strip Re:/Fwd: and match)
      if (!threadId && subject) {
        const cleanSubject = subject.replace(/^(Re|Fwd|Fw):\s*/gi, "").trim();
        if (cleanSubject) {
          const { data: subjectMatch } = await supabaseAdmin
            .from("emails")
            .select("id")
            .eq("direction", "outbound")
            .eq("to_email", fromEmail)
            .ilike("subject", cleanSubject)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (subjectMatch) {
            threadId = subjectMatch.id;
          }
        }
      }

      // 3. Sender-based fallback (most recent outbound to this sender)
      if (!threadId) {
        const { data: recentOutbound } = await supabaseAdmin
          .from("emails")
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

      // User linking: match from_email to a model, fan, or brand
      let linkedActorId: string | null = null;
      let linkedActorType: string | null = null;

      // Look up user by email in auth.users (service role can list users)
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({
        filter: fromEmail,
        perPage: 1,
      });

      if (users && users.length > 0) {
        const { data: linkedActor } = await supabaseAdmin
          .from("actors")
          .select("id, type")
          .eq("user_id", users[0].id)
          .single();

        if (linkedActor) {
          linkedActorId = linkedActor.id;
          linkedActorType = linkedActor.type;
        }
      }

      // Store the inbound email
      const { data: savedEmail } = await supabaseAdmin.from("emails").insert({
        direction: "inbound",
        thread_id: threadId,
        resend_message_id: emailId,
        from_email: fromEmail,
        from_name: fromName,
        to_email: toEmail,
        subject,
        body_html: bodyHtml,
        body_text: bodyText,
        cc,
        status: "received",
        metadata: {
          message_id: messageId,
          headers,
          attachments: fullEmail.attachments?.length || 0,
          linked_actor_id: linkedActorId,
          linked_actor_type: linkedActorType,
        },
      }).select("id").single();

      // AI: classify email and draft a response (non-blocking)
      if (savedEmail?.id) {
        classifyAndDraftReply({
          fromEmail,
          fromName,
          subject,
          bodyText,
          bodyHtml,
          linkedActorType,
        }).then(async (ai) => {
          // Mark spam emails so they don't clutter the inbox
          const updateData: any = {
            ai_category: ai.category,
            ai_confidence: ai.confidence,
            ai_summary: ai.summary,
            ai_draft_html: ai.draftHtml || null,
            ai_draft_text: ai.draftText || null,
            ai_processed_at: new Date().toISOString(),
          };
          if (ai.category === "spam") {
            updateData.status = "read"; // Auto-dismiss spam
          }
          await supabaseAdmin.from("emails").update(updateData).eq("id", savedEmail.id);

          // Never auto-reply to spam — check if auto-reply is enabled for legit emails
          if (ai.autoSendable && ai.category !== "spam") {
            const { data: setting } = await supabaseAdmin
              .from("platform_settings")
              .select("value")
              .eq("key", "ai_auto_reply_enabled")
              .single();

            if (setting?.value === true) {
              await sendAutoReply({
                emailId: savedEmail.id,
                toEmail: fromEmail,
                subject,
                draftHtml: ai.draftHtml,
                draftText: ai.draftText,
                category: ai.category,
                confidence: ai.confidence,
                supabaseAdmin,
              });
            }
          }
        }).catch((err) => {
          console.error("AI email processing failed:", err);
        });
      }

      // Mark the original outbound as "replied"
      if (threadId) {
        await supabaseAdmin
          .from("emails")
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
        const supabaseAdmin = createServiceRoleClient() as any;
        const newStatus = eventType === "email.delivered" ? "delivered" : "bounced";
        await supabaseAdmin
          .from("emails")
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
