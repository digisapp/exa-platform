import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendModelApplicationReceivedEmail } from "@/lib/email";

// Admin-triggered re-send of the application-received email (with its confirm
// link). The applicant-facing resend (/api/auth/resend-application-confirmation)
// only works for the signed-in applicant on her pending page — this is the
// admin's way to nudge an applicant whose original email landed in spam,
// since approval is blocked until email_confirmed_at is set.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const adminClient = createServiceRoleClient();
    const { data: application } = await (adminClient
      .from("model_applications") as any)
      .select("email, display_name, email_confirm_token, email_confirmed_at, status, user_id")
      .eq("id", id)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.email_confirmed_at) {
      return NextResponse.json(
        { error: "Email is already confirmed — just approve the application." },
        { status: 400 }
      );
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending applications can have a confirmation resent." },
        { status: 400 }
      );
    }

    const { data: fan } = await (adminClient.from("fans") as any)
      .select("preferred_language")
      .eq("user_id", application.user_id)
      .maybeSingle();

    const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";
    const result = await sendModelApplicationReceivedEmail({
      to: application.email,
      modelName: application.display_name || "there",
      language: fan?.preferred_language || "en",
      confirmUrl: `${origin}/api/auth/confirm-application?token=${application.email_confirm_token}`,
    });

    if (!result.success) {
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin resend application confirmation error:", error);
    return NextResponse.json(
      { error: "Failed to resend confirmation" },
      { status: 500 }
    );
  }
}
