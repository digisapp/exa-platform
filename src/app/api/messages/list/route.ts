import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const PAGE_SIZE = 50;

const listParamsSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  before: z.string().uuid("Invalid message ID").optional(),
});

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
    const params = listParamsSchema.safeParse({
      conversationId: searchParams.get("conversationId") || undefined,
      before: searchParams.get("before") || undefined,
    });

    if (!params.success) {
      const firstError = params.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { conversationId, before } = params.data;

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!sender) {
      return NextResponse.json(
        { error: "Actor not found" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("actor_id", sender.id)
      .single();

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Build query - filter out soft-deleted messages
    let query = supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, deleted_at, created_at")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1); // Fetch one extra to check if there are more

    // If "before" is provided, get messages created before that message
    if (before) {
      const { data: beforeMessage } = await supabase
        .from("messages")
        .select("created_at")
        .eq("id", before)
        .single();

      if (beforeMessage) {
        query = query.lt("created_at", beforeMessage.created_at);
      }
    }

    const { data: messages, error } = await query as { data: any[] | null; error: any };

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    const hasMore = (messages?.length || 0) > PAGE_SIZE;
    const resultMessages = hasMore ? messages?.slice(0, PAGE_SIZE) : messages;

    // Reverse to get chronological order (oldest first)
    const sortedMessages = (resultMessages || []).reverse();

    // Strip media_url from locked PPV messages (prevent client-side URL inspection)
    const sanitizedMessages = sortedMessages.map((msg: any) => {
      if (
        msg.media_price > 0 &&
        msg.sender_id !== sender.id &&
        !(msg.media_viewed_by ?? []).includes(sender.id)
      ) {
        return { ...msg, media_url: null };
      }
      return msg;
    });

    // Batch-fetch reactions for all messages
    const messageIds = sanitizedMessages.map((m: any) => m.id);
    const reactionsMap: Record<string, any[]> = {};

    if (messageIds.length > 0) {
      const { data: allReactions } = await supabase
        .from("message_reactions")
        .select("message_id, emoji, actor_id")
        .in("message_id", messageIds);

      if (allReactions) {
        for (const reaction of allReactions) {
          if (!reactionsMap[reaction.message_id]) {
            reactionsMap[reaction.message_id] = [];
          }
          reactionsMap[reaction.message_id].push(reaction);
        }
      }
    }

    return NextResponse.json({
      messages: sanitizedMessages,
      reactions: reactionsMap,
      hasMore,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    console.error("List messages error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
