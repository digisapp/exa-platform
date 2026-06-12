import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendModelApplicationReceivedEmail } from "@/lib/email";

// Re-send the application-received email (with its confirm link) for the
// signed-in user's pending application. Used by the spam-folder case on
// the pending-approval page.
export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "auth");
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = createServiceRoleClient();
    const { data: application } = await (adminClient
      .from("model_applications") as any)
      .select("email, display_name, email_confirm_token, email_confirmed_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application) {
      return NextResponse.json({ error: "No pending application found" }, { status: 404 });
    }

    if (application.email_confirmed_at) {
      return NextResponse.json({ success: true, alreadyConfirmed: true });
    }

    const { data: fan } = await (adminClient.from("fans") as any)
      .select("preferred_language")
      .eq("user_id", user.id)
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
    console.error("Resend application confirmation error:", error);
    return NextResponse.json({ error: "Failed to resend confirmation" }, { status: 500 });
  }
}
