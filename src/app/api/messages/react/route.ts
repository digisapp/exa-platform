import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Allowed emojis for reactions
const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"] as const;

const reactSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.enum(ALLOWED_EMOJIS),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const body = await request.json();
    const parsed = reactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { messageId, emoji } = parsed.data;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Verify the message exists and user is a participant
    const { data: message } = await (supabase
      .from("messages") as any)
      .select("id, conversation_id")
      .eq("id", messageId)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is a participant in this conversation
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", message.conversation_id)
      .eq("actor_id", actor.id)
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Check if reaction already exists
    const { data: existingReaction } = await (supabase
      .from("message_reactions") as any)
      .select("id")
      .eq("message_id", messageId)
      .eq("actor_id", actor.id)
      .eq("emoji", emoji)
      .single();

    if (existingReaction) {
      // Remove reaction (toggle off)
      await (supabase
        .from("message_reactions") as any)
        .delete()
        .eq("id", existingReaction.id);

      return NextResponse.json({
        success: true,
        action: "removed",
        emoji,
      });
    } else {
      // Add reaction
      const { error: insertError } = await (supabase
        .from("message_reactions") as any)
        .insert({
          message_id: messageId,
          actor_id: actor.id,
          emoji,
        });

      if (insertError) {
        console.error("Insert reaction error:", insertError);
        return NextResponse.json(
          { error: "Failed to add reaction" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "added",
        emoji,
      });
    }
  } catch (error) {
    console.error("React error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get reactions for a message
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResponse = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!messageId || !uuidRegex.test(messageId)) {
      return NextResponse.json(
        { error: "Valid message ID required" },
        { status: 400 }
      );
    }

    // Get actor for authorization
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Verify user is a participant in the message's conversation
    const { data: message } = await (supabase
      .from("messages") as any)
      .select("conversation_id")
      .eq("id", messageId)
      .single();

    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("actor_id")
      .eq("conversation_id", message.conversation_id)
      .eq("actor_id", actor.id)
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Get reactions grouped by emoji
    const { data: reactions, error } = await (supabase
      .from("message_reactions") as any)
      .select("emoji, actor_id")
      .eq("message_id", messageId);

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch reactions" },
        { status: 500 }
      );
    }

    // Group by emoji with count
    const grouped: Record<string, { count: number; actorIds: string[] }> = {};
    for (const reaction of reactions || []) {
      if (!grouped[reaction.emoji]) {
        grouped[reaction.emoji] = { count: 0, actorIds: [] };
      }
      grouped[reaction.emoji].count++;
      grouped[reaction.emoji].actorIds.push(reaction.actor_id);
    }

    return NextResponse.json({
      reactions: grouped,
    });
  } catch (error) {
    console.error("Get reactions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
