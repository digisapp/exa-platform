import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { stripLockedMediaUrl } from "@/lib/ppv";
import { signChatMediaUrls } from "@/lib/chat-media";
import { z } from "zod";
import { logger } from "@/lib/logger";

// Service client: clients can no longer SELECT messages.media_url (column
// grants, migration 20260711100005). This route may read it because it
// verifies conversation membership first and strips locked media per-viewer.
const adminClient = createServiceRoleClient();

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
    const { data: participation, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("actor_id", sender.id)
      .maybeSingle();

    if (partError || !participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Build query - filter out soft-deleted messages.
    // Membership was verified above, so the service client may read media_url;
    // locked media is stripped per-viewer before the response.
    let query = adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, deleted_at, created_at, reply_to_id")
      .eq("conversation_id", conversationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE + 1); // Fetch one extra to check if there are more

    // If "before" is provided, get messages created before that message
    // (scoped to this conversation so a foreign message ID can't be probed)
    if (before) {
      const { data: beforeMessage } = await adminClient
        .from("messages")
        .select("created_at")
        .eq("id", before)
        .eq("conversation_id", conversationId)
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

    // Strip media_url from locked PPV messages (prevent client-side URL
    // inspection), THEN sign surviving chat-media storage paths into
    // short-lived URLs (src/lib/chat-media.ts) — never sign what was stripped.
    const sanitizedMessages = await signChatMediaUrls(
      adminClient,
      sortedMessages.map((msg: any) => stripLockedMediaUrl(msg, sender.id))
    );

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

    // Batch-fetch replied-to message snippets
    const replyToIds = [...new Set(
      sanitizedMessages
        .map((m: any) => m.reply_to_id)
        .filter(Boolean)
    )];
    const repliedMessagesMap: Record<string, { id: string; content: string | null; sender_id: string; media_type: string | null }> = {};

    if (replyToIds.length > 0) {
      const { data: repliedMessages } = await supabase
        .from("messages")
        .select("id, content, sender_id, media_type")
        .in("id", replyToIds);

      if (repliedMessages) {
        for (const msg of repliedMessages) {
          repliedMessagesMap[msg.id] = msg;
        }
      }
    }

    return NextResponse.json({
      messages: sanitizedMessages,
      reactions: reactionsMap,
      repliedMessages: repliedMessagesMap,
      hasMore,
    }, {
      headers: { "Cache-Control": "private, no-cache" },
    });
  } catch (error) {
    logger.error("List messages error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
