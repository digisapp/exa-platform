import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const adminClient = createServiceRoleClient();

const ALLOWED_EMOJIS = ["🔥", "❤️", "👑"] as const;

const reactSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  emoji: z.string().refine(
    (val): val is (typeof ALLOWED_EMOJIS)[number] =>
      (ALLOWED_EMOJIS as readonly string[]).includes(val),
    { message: "Invalid emoji" }
  ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "general",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = reactSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { messageId, emoji } = validation.data;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Use atomic toggle function
    const { data: reactions, error } = await (adminClient.rpc as any)(
      "toggle_live_wall_reaction",
      {
        p_message_id: messageId,
        p_actor_id: actor.id,
        p_emoji: emoji,
      }
    );

    if (error) {
      console.error("Reaction toggle error:", error);
      return NextResponse.json(
        { error: "Failed to toggle reaction" },
        { status: 500 }
      );
    }

    if (reactions?.error) {
      return NextResponse.json(
        { error: reactions.error },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, reactions });
  } catch (error) {
    console.error("Live wall react error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
