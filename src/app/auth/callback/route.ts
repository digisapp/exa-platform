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
      // Check if user has an actor record (admin check)
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", data.user.id)
        .single() as { data: { id: string; type: string } | null };

      // If admin, redirect to admin dashboard
      if (actor?.type === "admin") {
        return NextResponse.redirect(`${origin}/admin`);
      }

      // Check if user already has a model profile
      const { data: model } = await (supabase.from("models") as any)
        .select("id, username")
        .eq("user_id", data.user.id)
        .single();

      // If model exists, go to dashboard
      if (model) {
        return NextResponse.redirect(`${origin}${redirect}`);
      }

      // Also check by email in case user_id wasn't set
      if (data.user.email) {
        const { data: modelByEmail } = await (supabase.from("models") as any)
          .select("id, username, user_id")
          .eq("email", data.user.email)
          .single();

        if (modelByEmail) {
          // Update the model record with user_id if not set
          if (!modelByEmail.user_id) {
            await (supabase.from("models") as any)
              .update({ user_id: data.user.id })
              .eq("id", modelByEmail.id);
          }
          return NextResponse.redirect(`${origin}${redirect}`);
        }
      }

      // New user - redirect to onboarding
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error - redirect to signin with error
  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
