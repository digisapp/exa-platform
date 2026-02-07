import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

import crypto from "crypto";

// Generate a cryptographically secure password
function generatePassword(): string {
  return crypto.randomBytes(18).toString("base64url");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get model
    const { data: model } = await (supabase
      .from("models") as any)
      .select("id, email, user_id, first_name, last_name, username")
      .eq("id", id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    if (!model.email) {
      return NextResponse.json({ error: "Model has no email address" }, { status: 400 });
    }

    // Check if already has a login
    if (model.user_id) {
      return NextResponse.json({ error: "Model already has a login" }, { status: 400 });
    }

    // Generate password
    const password = generatePassword();

    // Create auth user using service role
    const serviceSupabase = createServiceRoleClient();

    // Check if user already exists in auth
    const { data: existingUsers } = await serviceSupabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === model.email);

    let userId: string;

    if (existingUser) {
      // Update existing user's password
      const { error: updateError } = await serviceSupabase.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );
      if (updateError) {
        console.error("Failed to update user:", updateError);
        return NextResponse.json({ error: "Failed to update user password" }, { status: 500 });
      }
      userId = existingUser.id;
    } else {
      // Create new auth user
      const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
        email: model.email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username
        }
      });

      if (authError) {
        console.error("Failed to create auth user:", authError);
        return NextResponse.json({ error: authError.message }, { status: 500 });
      }
      userId = authData.user.id;
    }

    // The model already has an id that references the actors table.
    // We need to update the existing actor record with the user_id, not create a new one.
    const { data: existingActor } = await serviceSupabase
      .from("actors")
      .select("id, user_id")
      .eq("id", id) // Use model's id which is also the actor's id
      .single();

    if (existingActor) {
      // Update existing actor with user_id
      const { error: actorUpdateError } = await serviceSupabase
        .from("actors")
        .update({ user_id: userId, type: "model" })
        .eq("id", id);

      if (actorUpdateError) {
        console.error("Failed to update actor:", actorUpdateError);
        return NextResponse.json({ error: "Failed to update actor record" }, { status: 500 });
      }
    } else {
      // Actor doesn't exist - this shouldn't happen for a valid model, but handle it
      // Create actor with the same id as the model
      const { error: actorError } = await serviceSupabase
        .from("actors")
        .insert({ id: id, user_id: userId, type: "model" });

      if (actorError) {
        console.error("Failed to create actor:", actorError);
        return NextResponse.json({ error: "Failed to create actor record" }, { status: 500 });
      }
    }

    // Update model with user_id and approve them (don't change the id!)
    const { error: modelError } = await serviceSupabase
      .from("models")
      .update({
        user_id: userId,
        invite_token: null,
        claimed_at: new Date().toISOString(),
        is_approved: true, // Auto-approve when admin creates login
      })
      .eq("id", id);

    if (modelError) {
      console.error("Failed to update model:", modelError);
      return NextResponse.json({ error: "Failed to link model to account" }, { status: 500 });
    }

    // Create fan record if not exists
    const { data: existingFan } = await serviceSupabase
      .from("fans")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!existingFan) {
      await serviceSupabase
        .from("fans")
        .insert({
          id: id, // Use model's id (same as actor id)
          user_id: userId,
          email: model.email,
          display_name: model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username,
          coin_balance: 0
        });
    }

    return NextResponse.json({
      success: true,
      email: model.email,
      message: "Login created. Password has been set — share it securely with the model.",
    });
  } catch (error) {
    console.error("Create login error:", error);
    return NextResponse.json(
      { error: "Failed to create login" },
      { status: 500 }
    );
  }
}
