import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username are required" },
        { status: 400 }
      );
    }

    // Validate username
    const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }
    if (cleanUsername.length > 20) {
      return NextResponse.json(
        { error: "Username must be 20 characters or less" },
        { status: 400 }
      );
    }

    // Validate password
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if username is taken
    const { data: existingModel } = await supabase
      .from("models")
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingFan } = await supabase
      .from("fans")
      .select("id")
      .eq("username", cleanUsername)
      .single();

    const { data: existingBrand } = await supabase
      .from("brands")
      .select("id")
      .eq("username", cleanUsername)
      .single();

    if (existingModel || existingFan || existingBrand) {
      return NextResponse.json(
        { error: "This username is already taken" },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password,
      email_confirm: true,
      user_metadata: {
        display_name: cleanUsername,
      },
    });

    if (authError) {
      if (authError.message.includes("already registered") || authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "This email is already registered. Please sign in instead." },
          { status: 400 }
        );
      }
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // Create actor record
    const { data: actor, error: actorError } = await supabase
      .from("actors")
      .insert({
        user_id: userId,
        type: "fan",
      })
      .select()
      .single();

    if (actorError) {
      console.error("Actor error:", actorError);
      // Clean up auth user if actor creation fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    // Create fan profile
    const { error: fanError } = await supabase
      .from("fans")
      .insert({
        id: actor.id,
        user_id: userId,
        email: email.toLowerCase().trim(),
        username: cleanUsername,
        display_name: cleanUsername,
        coin_balance: 10, // Welcome bonus
      });

    if (fanError) {
      console.error("Fan error:", fanError);
      // Clean up
      await supabase.from("actors").delete().eq("id", actor.id);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Failed to create fan profile" },
        { status: 500 }
      );
    }

    // Record the welcome bonus transaction
    await supabase.from("coin_transactions").insert({
      actor_id: actor.id,
      amount: 10,
      action: "signup_bonus",
      metadata: { reason: "Welcome bonus for new fan signup" },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: email.toLowerCase().trim(),
        username: cleanUsername,
      },
    });
  } catch (error) {
    console.error("Fan signup error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
