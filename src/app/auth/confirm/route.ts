import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Handles email confirmation via token_hash (bypasses PKCE code_verifier requirement)
// This is needed because server-generated confirmation links (via generateLink)
// don't have a matching PKCE code_verifier stored in the user's browser.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/signin?error=invalid_link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash,
    type,
  });

  if (error || !data.user) {
    console.error("Email verification error:", error?.message);
    return NextResponse.redirect(`${origin}/signin?error=verification_failed`);
  }

  // User is now verified and has a session - redirect based on type
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", data.user.id)
    .single() as { data: { id: string; type: string } | null };

  if (actor) {
    switch (actor.type) {
      case "admin":
        return NextResponse.redirect(`${origin}/admin`);
      case "model": {
        const { data: model } = await supabase
          .from("models")
          .select("is_approved")
          .eq("user_id", data.user.id)
          .single();
        if (model?.is_approved) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
        return NextResponse.redirect(`${origin}/pending-approval`);
      }
      case "fan":
        // Check if they have a pending model application
        const { data: app } = await supabase
          .from("model_applications")
          .select("id, status")
          .eq("user_id", data.user.id)
          .eq("status", "pending")
          .single();
        if (app) {
          return NextResponse.redirect(`${origin}/pending-approval`);
        }
        return NextResponse.redirect(`${origin}/dashboard`);
      case "brand":
        return NextResponse.redirect(`${origin}/dashboard`);
      default:
        return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // No actor yet - check user metadata for signup type
  const signupType = data.user.user_metadata?.signup_type;
  if (signupType === "model") {
    return NextResponse.redirect(`${origin}/pending-approval`);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
