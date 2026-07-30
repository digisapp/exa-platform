import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { sendModelApplicationReceivedEmail } from "@/lib/email";
import { withAuth } from "@/lib/auth/with-auth";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

// Admin fix for a mistyped signup email. Every email (confirm link, approval,
// login recovery) goes to the address on file, so a typo strands the applicant
// in pending forever — resending just re-delivers to the wrong inbox. This
// corrects the application row, the auth login email, and the fan record,
// rotates the confirm token (invalidating any link sent to the old address),
// then sends a fresh confirm email to the corrected one. Approval stays gated
// on her clicking that link, so email ownership remains proven.
export const POST = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    const newEmail = parsed.data.email;

    const adminClient = createServiceRoleClient();
    const { data: application } = await (adminClient
      .from("model_applications") as any)
      .select("id, email, display_name, status, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can have their email fixed." },
        { status: 400 }
      );
    }

    if (application.email?.toLowerCase() === newEmail) {
      return NextResponse.json(
        { error: "That's already the email on file — use Resend confirm email instead." },
        { status: 400 }
      );
    }

    // Fix the login email first — it's the step that can fail (address already
    // registered to another account), and nothing else should change if it does.
    if (application.user_id) {
      const { error: authError } = await adminClient.auth.admin.updateUserById(
        application.user_id,
        { email: newEmail, email_confirm: true }
      );
      if (authError) {
        const conflict = /already|exists|registered/i.test(authError.message);
        return NextResponse.json(
          {
            error: conflict
              ? "That email already belongs to another account."
              : "Failed to update login email",
          },
          { status: conflict ? 409 : 500 }
        );
      }
    }

    const newToken = crypto.randomUUID();
    const { error: updateError } = await (adminClient
      .from("model_applications") as any)
      .update({
        email: newEmail,
        email_confirm_token: newToken,
        email_confirmed_at: null,
      })
      .eq("id", id);

    if (updateError) {
      throw updateError;
    }

    // Keep the fan record's copy in sync; its language drives the email template
    let preferredLanguage = "en";
    if (application.user_id) {
      const { data: fan } = await (adminClient.from("fans") as any)
        .update({ email: newEmail })
        .eq("user_id", application.user_id)
        .select("preferred_language")
        .maybeSingle();
      preferredLanguage = fan?.preferred_language || "en";
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";
    const result = await sendModelApplicationReceivedEmail({
      to: newEmail,
      modelName: application.display_name || "there",
      language: preferredLanguage,
      confirmUrl: `${origin}/api/auth/confirm-application?token=${newToken}`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Email updated, but sending the confirm link failed — use Resend confirm email." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, email: newEmail });
  },
  { requireType: "admin" }
);
