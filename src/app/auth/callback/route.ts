import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const isSignup = searchParams.get("signup") === "true";
  const redirect = searchParams.get("redirect") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if user has an actor record
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", data.user.id)
        .single() as { data: { id: string; type: string } | null };

      // If new signup and no actor, redirect to onboarding
      if (!actor && isSignup) {
        return NextResponse.redirect(`${origin}/onboarding`);
      }

      // If has actor, redirect to appropriate dashboard
      if (actor) {
        if (actor.type === "admin") {
          return NextResponse.redirect(`${origin}/admin`);
        }
        return NextResponse.redirect(`${origin}${redirect}`);
      }

      // Existing user without actor (edge case) - send to onboarding
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error - redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
