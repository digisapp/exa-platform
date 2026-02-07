import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimitAsync, getClientIP } from "@/lib/rate-limit";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 60 seconds per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = await rateLimitAsync(`forgot-password:${clientIP}`, {
      limit: 3,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      // Still return 200 with generic message to avoid enumeration
      return NextResponse.json({
        success: true,
        message: "If an account exists for this email, you'll receive a reset link. Please also check your spam folder.",
      });
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use admin client for generating the reset link
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Always use production URL for redirect
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com"}/auth/reset-password`;

    // Generate the password reset link using admin API
    // This gives us the link without sending Supabase's email
    const { data, error } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: normalizedEmail,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      // Log errors server-side but don't expose to user
      // Common error: user doesn't exist - we don't want to reveal this
      console.error("Generate link error:", error.message, "for email:", normalizedEmail);
    }

    // If we got a link, send our custom email via Resend
    if (data?.properties?.action_link) {
      const emailResult = await sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl: data.properties.action_link,
      });

      if (!emailResult.success) {
        console.error("Failed to send password reset email:", emailResult.error);
      }
    }

    // Always return success with generic message (prevents enumeration)
    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, you'll receive a reset link. Please also check your spam folder.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return 200 to avoid leaking info
    return NextResponse.json({
      success: true,
      message: "If an account exists for this email, you'll receive a reset link. Please also check your spam folder.",
    });
  }
}
