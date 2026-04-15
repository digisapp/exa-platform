import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = markReadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { conversationId } = parsed.data;

    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Verify participation and reset unread count atomically
    const { data: updated, error } = await (supabase
      .from("conversation_participants") as any)
      .update({
        last_read_at: new Date().toISOString(),
        unread_count: 0,
      })
      .eq("conversation_id", conversationId)
      .eq("actor_id", actor.id)
      .select("conversation_id")
      .maybeSingle();

    if (error) {
      logger.error("Mark read error", error);
      return NextResponse.json({ error: "Failed to mark as read" }, { status: 500 });
    }

    if (!updated) {
      return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Mark read error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
