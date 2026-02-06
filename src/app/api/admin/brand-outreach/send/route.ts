import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { sendBrandOutreachEmail } from "@/lib/email";

interface ContactToEmail {
  id: string;
  email: string;
  brand_name: string;
  contact_name: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { contacts, subject, body: emailBody } = body as {
      contacts: ContactToEmail[];
      subject: string;
      body: string;
    };

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    if (!subject || !emailBody) {
      return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
    }

    let sent = 0;
    let failed = 0;
    const results: { email: string; success: boolean; error?: string }[] = [];

    // Send emails one at a time with a small delay to avoid rate limiting
    for (const contact of contacts) {
      try {
        const result = await sendBrandOutreachEmail({
          to: contact.email,
          brandName: contact.brand_name,
          contactName: contact.contact_name,
          subject,
          bodyText: emailBody,
        });

        if (result.success) {
          sent++;

          // Log the email in the database
          await (supabase as any).from("brand_outreach_emails").insert({
            contact_id: contact.id,
            subject,
            body_html: emailBody,
            sent_by: user.id,
            email_type: "outreach",
            resend_message_id: result.messageId,
            status: "sent",
          });

          // Update the contact status and last_contacted_at
          await (supabase as any)
            .from("brand_outreach_contacts")
            .update({
              status: "contacted",
              last_contacted_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", contact.id)
            .eq("status", "new"); // Only update if still "new"

          results.push({ email: contact.email, success: true });
        } else {
          failed++;
          results.push({
            email: contact.email,
            success: false,
            error: String(result.error),
          });
        }

        // Small delay between emails to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));
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
    console.error("Brand outreach send error:", error);
    const message = error instanceof Error ? error.message : "Failed to send emails";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
