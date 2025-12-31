import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

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
        // User has account - redirect based on type
        switch (actor.type) {
          case "admin":
            return NextResponse.redirect(`${origin}/admin`);
          case "model":
            // Check if model is approved
            const { data: model } = await (supabase.from("models") as any)
              .select("id, is_approved")
              .eq("user_id", data.user.id)
              .single();
            if (model?.is_approved) {
              return NextResponse.redirect(`${origin}/dashboard`);
            }
            return NextResponse.redirect(`${origin}/models`);
          case "fan":
            return NextResponse.redirect(`${origin}/models`);
          case "brand":
            return NextResponse.redirect(`${origin}/models`);
          default:
            return NextResponse.redirect(`${origin}/models`);
        }
      }

      // Legacy: Check if model exists by email (for invited models)
      if (data.user.email) {
        const { data: modelByEmail } = await (supabase.from("models") as any)
          .select("id, user_id, is_approved")
          .eq("email", data.user.email)
          .single();

        if (modelByEmail) {
          // Link model to user if not already linked
          if (!modelByEmail.user_id) {
            await (supabase.from("models") as any)
              .update({ user_id: data.user.id })
              .eq("id", modelByEmail.id);

            // Create actor record for this model
            await (supabase.from("actors") as any)
              .insert({
                id: modelByEmail.id,
                user_id: data.user.id,
                type: "model"
              });
          }

          if (modelByEmail.is_approved) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
          return NextResponse.redirect(`${origin}/models`);
        }
      }

      // New user - redirect to fan signup
      return NextResponse.redirect(`${origin}/fan/signup`);
    }
  }

  // Auth error - redirect to signin with error
  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
