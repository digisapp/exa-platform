import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if user exists by looking up in models or fans tables
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    const { data: fan } = await supabase
      .from("fans")
      .select("id")
      .eq("email", email.toLowerCase())
      .single();

    // If no user found in either table
    if (!model && !fan) {
      return NextResponse.json(
        { error: "No account found with this email address" },
        { status: 404 }
      );
    }

    // User exists, send reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${request.headers.get("origin")}/auth/reset-password`,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
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
