import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const pinSchema = z.object({
  conversationId: z.string().uuid(),
  pinned: z.boolean(),
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
    const parsed = pinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { conversationId, pinned } = parsed.data;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Verify user is a participant before updating
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("actor_id", actor.id)
      .maybeSingle();

    if (!participation) {
      return NextResponse.json({ error: "Not a participant in this conversation" }, { status: 403 });
    }

    // Update pin status
    const { error } = await (supabase
      .from("conversation_participants") as any)
      .update({ is_pinned: pinned })
      .eq("conversation_id", conversationId)
      .eq("actor_id", actor.id);

    if (error) {
      logger.error("Pin update error", error);
      return NextResponse.json({ error: "Failed to update pin status" }, { status: 500 });
    }

    return NextResponse.json({ success: true, pinned });
  } catch (error) {
    logger.error("Pin error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
