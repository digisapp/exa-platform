import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendEmailConfirmationEmail } from "@/lib/email";
import { rateLimitAsync, getClientIP } from "@/lib/rate-limit";

// Admin client to generate links
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 60 seconds per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimitAsync(`send-confirmation:${clientIP}`, {
      limit: 3,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json({
        success: true,
        message: "If the email exists, a confirmation link has been sent.",
      });
    }

    const { email, displayName, signupType } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const redirectUrl = "https://www.examodels.com/auth/callback?type=signup";

    // Use magiclink type to generate a link that will log the user in
    // This works for both confirming email and passwordless login
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      // Log but don't expose to user
      console.error("Generate link error:", error.message, "for email:", normalizedEmail);
      // Still return success to prevent enumeration
      return NextResponse.json({
        success: true,
        message: "If the email exists, a confirmation link has been sent.",
      });
    }

    // Send our custom email via Resend
    if (data?.properties?.action_link) {
      const emailResult = await sendEmailConfirmationEmail({
        to: normalizedEmail,
        confirmUrl: data.properties.action_link,
        displayName: displayName || undefined,
        signupType: signupType || "fan",
      });

      if (!emailResult.success) {
        console.error("Failed to send confirmation email:", emailResult.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Confirmation email sent!",
    });
  } catch (error) {
    console.error("Send confirmation error:", error);
    return NextResponse.json({
      success: true,
      message: "If the email exists, a confirmation link has been sent.",
    });
  }
}
