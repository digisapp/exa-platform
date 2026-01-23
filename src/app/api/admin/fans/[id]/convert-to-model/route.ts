import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

async function isAdmin(supabase: any, userId: string) {
  const { data: actor } = await supabase
    .from("actors")
    .select("type")
    .eq("user_id", userId)
    .single();
  return actor?.type === "admin";
}

// POST - Convert fan to model
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fanId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(supabase, user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the fan record
    const { data: fan, error: fanError } = await (supabase
      .from("fans") as any)
      .select("id, user_id, email, display_name, coin_balance")
      .eq("id", fanId)
      .single();

    if (fanError || !fan) {
      return NextResponse.json({ error: "Fan not found" }, { status: 404 });
    }

    // Update the actor type from 'fan' to 'model'
    const { error: actorError } = await (supabase
      .from("actors") as any)
      .update({ type: "model" })
      .eq("user_id", fan.user_id)
      .eq("type", "fan");

    if (actorError) {
      console.error("Error updating actor:", actorError);
      throw actorError;
    }

    // Create a basic model profile
    const username = (fan.display_name || fan.email?.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 20) + Math.random().toString(36).slice(2, 6);

    const { error: modelError } = await (supabase
      .from("models") as any)
      .insert({
        user_id: fan.user_id,
        email: fan.email,
        username: username,
        first_name: fan.display_name || "New",
        last_name: "Model",
        is_approved: true, // Auto-approve since admin initiated conversion
        coin_balance: fan.coin_balance || 0,
      });

    if (modelError) {
      console.error("Error creating model:", modelError);
      // Try to rollback actor change
      await (supabase
        .from("actors") as any)
        .update({ type: "fan" })
        .eq("user_id", fan.user_id);
      throw modelError;
    }

    // Delete the fan record
    await (supabase
      .from("fans") as any)
      .delete()
      .eq("id", fanId);

    return NextResponse.json({
      success: true,
      message: "Fan converted to model successfully",
      username,
    });
  } catch (error: unknown) {
    console.error("Convert to model error:", error);
    const message = error instanceof Error ? error.message : "Failed to convert to model";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
