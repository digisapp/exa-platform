import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Update user's last active timestamp
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor type to only update the relevant table
    const { data: actor } = await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ success: false }, { status: 404 });
    }

    const now = new Date().toISOString();

    // Only update the relevant table based on actor type
    if (actor.type === "model") {
      await supabase.from("models")
        .update({ last_active_at: now })
        .eq("user_id", user.id);
    } else if (actor.type === "fan") {
      const fansTable = supabase.from("fans") as any;
      await fansTable
        .update({ last_active_at: now })
        .eq("user_id", user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Activity tracking error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
