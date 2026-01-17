import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Admin client for password reset
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Helper to create fan profile
async function createFanProfile(supabase: any, userId: string, email: string, displayName: string) {
  // Create actor record
  const { data: actor, error: actorError } = await (supabase
    .from("actors") as any)
    .upsert({
      user_id: userId,
      type: "fan",
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (actorError) {
    console.error("Actor creation error:", actorError);
    return null;
  }

  const actorId = actor.id;

  // Create fan profile
  const { error: fanError } = await (supabase
    .from("fans") as any)
    .upsert({
      id: actorId,
      user_id: userId,
      email: email,
      display_name: displayName,
      coin_balance: 10, // Welcome bonus
    }, { onConflict: "user_id" });

  if (fanError) {
    console.error("Fan creation error:", fanError);
    return null;
  }

  // Record welcome bonus
  await (supabase.from("coin_transactions") as any).insert({
    actor_id: actorId,
    amount: 10,
    action: "signup_bonus",
    metadata: { reason: "Welcome bonus for new signup" },
  });

  return actorId;
}

// Helper to send password reset email for imported models
async function sendPasswordResetForImportedModel(email: string, origin: string) {
  try {
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    });
    if (error) {
      console.error("Password reset error:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Password reset error:", error);
    return false;
  }
}

// Helper to create model application
async function createModelApplication(
  supabase: any,
  userId: string,
  fanId: string | null,
  email: string,
  displayName: string,
  instagramUsername: string | null,
  tiktokUsername: string | null
) {
  const { error } = await (supabase.from("model_applications") as any)
    .insert({
      user_id: userId,
      fan_id: fanId,
      display_name: displayName,
      email: email,
      instagram_username: instagramUsername,
      tiktok_username: tiktokUsername,
      status: "pending",
    });

  if (error) {
    console.error("Model application error:", error);
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    // If this is a password recovery, redirect to reset password page
    if (!error && data.user && type === "recovery") {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }

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
            return NextResponse.redirect(`${origin}/pending-approval`);
          case "fan":
            return NextResponse.redirect(`${origin}/models`);
          case "brand":
            return NextResponse.redirect(`${origin}/models`);
          default:
            return NextResponse.redirect(`${origin}/models`);
        }
      }

      // No actor record - this could be:
      // 1. Email confirmation for new signup (type=signup)
      // 2. Legacy model invited by email
      // 3. OAuth user without profile

      // Check user metadata for signup info
      const userMeta = data.user.user_metadata || {};
      const signupType = userMeta.signup_type;
      const displayName = userMeta.display_name || data.user.email?.split("@")[0] || "User";
      const instagramUsername = userMeta.instagram_username || null;
      const tiktokUsername = userMeta.tiktok_username || null;

      // If this is a confirmed signup, create the profile
      if (type === "signup" || signupType) {
        // First check for legacy/imported model by email
        if (data.user.email) {
          const { data: modelByEmail } = await (supabase.from("models") as any)
            .select("id, user_id, is_approved, claimed_at")
            .eq("email", data.user.email)
            .is("user_id", null)
            .single();

          if (modelByEmail) {
            // Link existing model to user
            await (supabase.from("models") as any)
              .update({ user_id: data.user.id, claimed_at: new Date().toISOString() })
              .eq("id", modelByEmail.id);

            await (supabase.from("actors") as any)
              .upsert({
                id: modelByEmail.id,
                user_id: data.user.id,
                type: "model"
              });

            // This is an imported model - send password reset so they can set their own password
            await sendPasswordResetForImportedModel(data.user.email, origin);

            // Redirect to set-password page
            return NextResponse.redirect(`${origin}/auth/set-password`);
          }
        }

        // Create fan profile for new user
        const fanId = await createFanProfile(
          supabase,
          data.user.id,
          data.user.email || "",
          displayName
        );

        // If model signup, also create application
        if (signupType === "model" && (instagramUsername || tiktokUsername)) {
          await createModelApplication(
            supabase,
            data.user.id,
            fanId,
            data.user.email || "",
            displayName,
            instagramUsername,
            tiktokUsername
          );
          return NextResponse.redirect(`${origin}/pending-approval`);
        }

        // Fan signup - redirect to models page
        return NextResponse.redirect(`${origin}/models`);
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
              .update({ user_id: data.user.id, claimed_at: new Date().toISOString() })
              .eq("id", modelByEmail.id);

            // Create actor record for this model
            await (supabase.from("actors") as any)
              .insert({
                id: modelByEmail.id,
                user_id: data.user.id,
                type: "model"
              });

            // Send password reset for imported model
            await sendPasswordResetForImportedModel(data.user.email, origin);
            return NextResponse.redirect(`${origin}/auth/set-password`);
          }

          if (modelByEmail.is_approved) {
            return NextResponse.redirect(`${origin}/dashboard`);
          }
          return NextResponse.redirect(`${origin}/pending-approval`);
        }
      }

      // New user - redirect to fan signup
      return NextResponse.redirect(`${origin}/fan/signup`);
    }
  }

  // Auth error - redirect to signin with error
  return NextResponse.redirect(`${origin}/signin?error=auth`);
}
