import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { displayName } = await request.json();

    if (!displayName?.trim()) {
      return NextResponse.json(
        { error: "Display name is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user already has an actor record
    const { data: existingActor } = await (supabase
      .from("actors") as any)
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (existingActor) {
      return NextResponse.json(
        { error: "Account already exists", type: (existingActor as { type: string }).type },
        { status: 409 }
      );
    }

    // Create actor record with type "fan"
    const { data: actor, error: actorError } = await (supabase
      .from("actors") as any)
      .insert({
        user_id: user.id,
        type: "fan",
      })
      .select()
      .single();

    if (actorError) {
      console.error("Actor creation error:", actorError);
      return NextResponse.json(
        { error: "Failed to create account" },
        { status: 500 }
      );
    }

    const actorId = (actor as { id: string }).id;

    // Create fan profile
    const { error: fanError } = await (supabase
      .from("fans") as any)
      .insert({
        id: actorId,
        user_id: user.id,
        email: user.email,
        display_name: displayName.trim(),
        coin_balance: 10, // Welcome bonus!
      });

    if (fanError) {
      console.error("Fan creation error:", fanError);
      // Rollback actor creation
      await (supabase.from("actors") as any).delete().eq("id", actorId);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    // Record the welcome bonus transaction
    await (supabase.from("coin_transactions") as any).insert({
      actor_id: actorId,
      amount: 10,
      action: "signup_bonus",
      metadata: { reason: "Welcome bonus for new signup" },
    });

    return NextResponse.json({
      success: true,
      actorId: actorId,
    });
  } catch (error) {
    console.error("Create fan error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
