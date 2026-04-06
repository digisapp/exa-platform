import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Sum unread counts across all non-archived conversations
    const { data, error } = await (supabase
      .from("conversation_participants") as any)
      .select("unread_count")
      .eq("actor_id", actor.id)
      .eq("is_archived", false);

    if (error) {
      console.error("Unread count error:", error);
      return NextResponse.json({ error: "Failed to get unread count" }, { status: 500 });
    }

    const totalUnread = (data || []).reduce(
      (sum: number, row: { unread_count: number }) => sum + (row.unread_count || 0),
      0
    );

    return NextResponse.json({ unreadCount: totalUnread }, {
      headers: { "Cache-Control": "private, no-cache, max-age=0" },
    });
  } catch (error) {
    console.error("Unread count error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
