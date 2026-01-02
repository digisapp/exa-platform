import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Generate a secure but readable password
function generatePassword(): string {
  const adjectives = ['Happy', 'Sunny', 'Lucky', 'Bright', 'Swift', 'Cool', 'Star', 'Blue', 'Pink', 'Gold'];
  const nouns = ['Model', 'Star', 'Light', 'Wave', 'Cloud', 'Dream', 'Spark', 'Glow', 'Rose', 'Sky'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 4 digit number
  return `${adjective}${noun}${number}!`;
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
    const { createClient: createServiceClient } = await import("@supabase/supabase-js");
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

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

    // Create or update actor record
    const { data: existingActor } = await serviceSupabase
      .from("actors")
      .select("id")
      .eq("user_id", userId)
      .single();

    let actorId: string;

    if (existingActor) {
      actorId = existingActor.id;
      // Update actor type to model if needed
      await serviceSupabase
        .from("actors")
        .update({ type: "model" })
        .eq("id", actorId);
    } else {
      const { data: newActor, error: actorError } = await serviceSupabase
        .from("actors")
        .insert({ user_id: userId, type: "model" })
        .select()
        .single();

      if (actorError) {
        console.error("Failed to create actor:", actorError);
        return NextResponse.json({ error: "Failed to create actor record" }, { status: 500 });
      }
      actorId = newActor.id;
    }

    // Update model with user_id
    const { error: modelError } = await serviceSupabase
      .from("models")
      .update({
        user_id: userId,
        id: actorId, // Update model id to match actor id
        invite_token: null,
        claimed_at: new Date().toISOString()
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
          id: actorId,
          user_id: userId,
          email: model.email,
          display_name: model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username,
          coin_balance: 0
        });
    }

    return NextResponse.json({
      success: true,
      email: model.email,
      password,
    });
  } catch (error) {
    console.error("Create login error:", error);
    return NextResponse.json(
      { error: "Failed to create login" },
      { status: 500 }
    );
  }
}
