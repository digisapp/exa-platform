import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 3 requests per 60 seconds per IP
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`forgot-password:${clientIP}`, {
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

    // Use admin client for reliable email sending
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Always use production URL for redirect (must match Supabase allowed redirects)
    // Go directly to reset-password page which handles code exchange
    const redirectUrl = "https://www.examodels.com/auth/reset-password";

    // Always attempt to send reset email - don't check if user exists
    // This prevents email enumeration attacks
    const { error } = await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: redirectUrl,
    });

    // Log errors server-side but don't expose to user
    if (error) {
      console.error("Reset password error:", error.message, "for email:", normalizedEmail);
    }

    // Always return success with generic message
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
