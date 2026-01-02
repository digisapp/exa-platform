import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { rateLimit, getClientIP } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    // Rate limit: 5 requests per 60 seconds per IP (increased for better UX)
    const clientIP = getClientIP(request);
    const rateLimitResult = rateLimit(`forgot-password:${clientIP}`, {
      limit: 5,
      windowSeconds: 60,
    });

    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        }
      );
    }

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Use admin client to check if user exists in auth
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user exists in auth.users
    const { data: authUsers } = await adminClient.auth.admin.listUsers();
    const userExists = authUsers?.users?.some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    // Also check models and fans tables as fallback
    const supabase = await createClient();

    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    const { data: fan } = await supabase
      .from("fans")
      .select("id")
      .eq("email", normalizedEmail)
      .single();

    // If no user found anywhere
    if (!userExists && !model && !fan) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    // Get origin for redirect URL
    const origin = request.headers.get("origin") || "https://www.examodels.com";

    // User exists, send reset email using admin client for reliability
    const { error } = await adminClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${origin}/auth/reset-password`,
    });

    if (error) {
      console.error("Reset password email error:", error);
      return NextResponse.json(
        { error: "Failed to send reset email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
