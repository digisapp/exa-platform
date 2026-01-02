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
      // Already exists - check if fan profile exists too
      const { data: existingFan } = await (supabase
        .from("fans") as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingFan) {
        // Everything exists, just return success (idempotent)
        return NextResponse.json({
          success: true,
          actorId: existingActor.id,
          existing: true,
        });
      }

      // Actor exists but no fan - create fan profile
      const { error: fanError } = await (supabase
        .from("fans") as any)
        .upsert({
          id: existingActor.id,
          user_id: user.id,
          email: user.email,
          display_name: displayName.trim(),
          coin_balance: 10,
        }, { onConflict: "user_id" });

      if (fanError) {
        console.error("Fan upsert error:", fanError);
        return NextResponse.json(
          { error: "Failed to create profile" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        actorId: existingActor.id,
        existing: true,
      });
    }

    // Create actor record with type "fan"
    const { data: actor, error: actorError } = await (supabase
      .from("actors") as any)
      .upsert({
        user_id: user.id,
        type: "fan",
      }, { onConflict: "user_id" })
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

    // Create fan profile with upsert
    const { error: fanError } = await (supabase
      .from("fans") as any)
      .upsert({
        id: actorId,
        user_id: user.id,
        email: user.email,
        display_name: displayName.trim(),
        coin_balance: 10, // Welcome bonus!
      }, { onConflict: "user_id" });

    if (fanError) {
      console.error("Fan creation error:", fanError);
      return NextResponse.json(
        { error: "Failed to create profile" },
        { status: 500 }
      );
    }

    // Record the welcome bonus transaction (only if new)
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
