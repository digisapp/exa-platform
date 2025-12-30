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

    // Update last_active_at for model
    const { error: modelError } = await (supabase
      .from("models") as any)
      .update({ last_active_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // Also update for fan if exists
    const { error: fanError } = await (supabase
      .from("fans") as any)
      .update({ last_active_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity tracking error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
