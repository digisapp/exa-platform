import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect") || "/models";

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

      if (actor) {
        // User already has an account - redirect based on type
        if (actor.type === "admin") {
          return NextResponse.redirect(`${origin}/admin`);
        } else if (actor.type === "model") {
          // Check if model is approved
          const { data: model } = await (supabase.from("models") as any)
            .select("id, is_approved")
            .eq("user_id", data.user.id)
            .single();

          if (model?.is_approved) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
          // Not approved model - treat as fan
          return NextResponse.redirect(`${origin}/models`);
        } else {
          // Fan, brand, or other - go to models page
          return NextResponse.redirect(`${origin}${redirect}`);
        }
      }

      // Check if user has a model profile (legacy check)
      const { data: model } = await (supabase.from("models") as any)
        .select("id, username, is_approved")
        .eq("user_id", data.user.id)
        .single();

      if (model) {
        // If model is approved, go to dashboard
        if (model.is_approved) {
          return NextResponse.redirect(`${origin}/dashboard`);
        }
        // Not approved - go to models page
        return NextResponse.redirect(`${origin}/models`);
      }

      // Also check by email in case user_id wasn't set
      if (data.user.email) {
        const { data: modelByEmail } = await (supabase.from("models") as any)
          .select("id, username, user_id, is_approved")
          .eq("email", data.user.email)
          .single();

        if (modelByEmail) {
          // Update the model record with user_id if not set
          if (!modelByEmail.user_id) {
            await (supabase.from("models") as any)
              .update({ user_id: data.user.id })
              .eq("id", modelByEmail.id);
          }

          if (modelByEmail.is_approved) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
          return NextResponse.redirect(`${origin}/models`);
        }
      }

      // New user - redirect to onboarding (creates fan account)
      return NextResponse.redirect(`${origin}/onboarding`);
    }
  }

  // Auth error - redirect to signin with error
  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
