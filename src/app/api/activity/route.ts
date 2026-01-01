import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Update user's last active timestamp
export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Get actor type to only update the relevant table
    const { data: actor } = await (supabase
      .from("actors") as any)
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Only update the relevant table based on actor type
    if (actor.type === "model") {
      await (supabase.from("models") as any)
        .update({ last_active_at: now })
        .eq("user_id", user.id);
    } else if (actor.type === "fan") {
      await (supabase.from("fans") as any)
        .update({ last_active_at: now })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity tracking error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
