import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/admin/email/reply
 * Send a reply or new email from admin, stores in DB
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to, subject, bodyHtml, bodyText, replyToEmailId } = await request.json();

  if (!to || !subject || (!bodyHtml && !bodyText)) {
    return NextResponse.json(
      { error: "to, subject, and body (html or text) are required" },
      { status: 400 }
    );
  }

  try {
    // Send via Resend
    const { data: resendResponse, error: resendError } = await resend.emails.send({
      from: "EXA Models <hello@examodels.com>",
      to: [to],
      subject,
      html: bodyHtml || undefined,
      text: bodyText || undefined,
      replyTo: "hello@inbound.examodels.com",
    });

    if (resendError) {
      return NextResponse.json(
        { error: resendError.message },
        { status: 500 }
      );
    }

    // Store in DB
    const supabaseAdmin = createServiceRoleClient() as any;
    const { data: savedEmail, error: dbError } = await supabaseAdmin
      .from("emails")
      .insert({
        direction: "outbound",
        thread_id: replyToEmailId || null,
        resend_message_id: resendResponse?.id || null,
        from_email: "hello@examodels.com",
        from_name: "EXA Models",
        to_email: to,
        subject,
        body_html: bodyHtml || null,
        body_text: bodyText || null,
        status: "sent",
        sent_by: user.id,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Failed to store sent email:", dbError);
    }

    // If replying to an inbound email, update its status
    if (replyToEmailId) {
      await supabaseAdmin.from("emails")
        .update({ status: "replied", replied_at: new Date().toISOString() })
        .eq("id", replyToEmailId)
        .eq("direction", "inbound");
    }

    return NextResponse.json({
      success: true,
      emailId: savedEmail?.id,
      resendId: resendResponse?.id,
    });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
