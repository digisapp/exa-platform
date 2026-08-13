import { createClient } from "@/lib/supabase/server";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { escapeIlike } from "@/lib/utils";
import { sendNewMessageNotificationEmail } from "@/lib/email";
import { sendPushToActor } from "@/lib/push";
import { assertVirtualFirst } from "@/lib/moderation/virtual-first";
import { logger } from "@/lib/logger";
import {
  CHAT_MEDIA_MAX_COINS,
  CHAT_MEDIA_MIN_COINS,
  messageCoinCost,
} from "@/lib/coin-config";
import {
  isChatMediaPath,
  isValidChatMediaStoragePath,
  signChatMediaUrls,
} from "@/lib/chat-media";

// Service role client for creating conversations (bypasses RLS)
const adminClient = createServiceRoleClient();

// Zod schema for message validation
const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID").optional().nullable(),
  targetModelUsername: z.string().min(1).max(100).optional().nullable(),
  content: z.string().max(5000, "Message is too long").optional().nullable(),
  // Either an http(s) URL (legacy chat media, library-attached content) or a
  // chat-media storage path from /api/upload/chat (src/lib/chat-media.ts)
  mediaUrl: z.string().max(2048, "URL is too long").refine(
    (val) =>
      isChatMediaPath(val)
        ? isValidChatMediaStoragePath(val)
        : z.string().url().safeParse(val).success,
    { message: "Invalid media URL" }
  ).optional().nullable(),
  mediaType: z.string().refine(
    (val) => /^(image|video|audio)(\/[\w.+-]+)?$/.test(val),
    { message: "Invalid media type" }
  ).optional().nullable(),
  mediaPrice: z
    .number()
    .int()
    .min(CHAT_MEDIA_MIN_COINS, `Minimum price is ${CHAT_MEDIA_MIN_COINS} coins`)
    .max(CHAT_MEDIA_MAX_COINS, `Maximum price is ${CHAT_MEDIA_MAX_COINS.toLocaleString()} coins`)
    .optional()
    .nullable(),
  replyToId: z.string().uuid("Invalid reply message ID").optional().nullable(),
}).refine(
  (data) => data.content?.trim() || data.mediaUrl,
  { message: "Message content or media required", path: ["content"] }
).refine(
  (data) => data.conversationId || data.targetModelUsername,
  { message: "conversationId or targetModelUsername required", path: ["conversationId"] }
);

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

    // Validate request body with Zod schema
    const validationResult = sendMessageSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { conversationId: providedConversationId, targetModelUsername, content, mediaUrl, mediaType, mediaPrice, replyToId } = validationResult.data;
    let conversationId = providedConversationId || null;

    // EXA stickers: pin sticker-typed media to the public stickers bucket so
    // arbitrary image URLs can't be dressed up in borderless sticker rendering,
    // and keep them free — the paid paths are tips and priced media.
    if (mediaType === "image/sticker") {
      const stickerUrlPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stickers/`;
      if (!mediaUrl || !mediaUrl.startsWith(stickerUrlPrefix)) {
        return NextResponse.json({ error: "Invalid sticker" }, { status: 400 });
      }
      if (mediaPrice) {
        return NextResponse.json({ error: "Stickers cannot be priced" }, { status: 400 });
      }
    }

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!sender) {
      return NextResponse.json(
        { error: "Sender not found" },
        { status: 400 }
      );
    }

    const suspended = await assertNotSuspended(sender.id);
    if (suspended) return suspended;

    // Only models can set a media price, and only when media is attached
    if (mediaPrice && (sender.type !== "model" || !mediaUrl)) {
      return NextResponse.json(
        { error: "Only models can set a price on media messages" },
        { status: 400 }
      );
    }

    // Chat-media storage paths are uploads scoped to the uploader's ACTOR
    // folder (/api/upload/chat) — a sender must not be able to link (and have
    // us sign) someone else's private media.
    if (mediaUrl && isChatMediaPath(mediaUrl) && !mediaUrl.startsWith(`${sender.id}/`)) {
      return NextResponse.json(
        { error: "Media does not belong to this user" },
        { status: 403 }
      );
    }

    // Check if brand has active subscription
    if (sender.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
        .select("subscription_tier, subscription_status")
        .eq("id", sender.id)
        .maybeSingle();

      const hasActiveSubscription =
        brand?.subscription_status === "active" &&
        !!brand?.subscription_tier &&
        brand.subscription_tier !== "free";

      if (!hasActiveSubscription) {
        return NextResponse.json({
          error: "Subscription required",
          message: "Please subscribe to message models",
          code: "SUBSCRIPTION_REQUIRED"
        }, { status: 403 });
      }
    }

    // Virtual-first hard block: fans/brands can't ask to meet in person or
    // exchange off-platform contact info. Runs before any conversation is
    // created so a blocked attempt leaves no side effects.
    const virtualFirstBlock = await assertVirtualFirst({
      userId: user.id,
      sender,
      content,
      context: "send",
    });
    if (virtualFirstBlock) return virtualFirstBlock;

    // If targetModelUsername provided, find or create conversation
    if (!conversationId && targetModelUsername) {
      // Look up model
      const { data: targetModel } = await supabase
        .from("models")
        .select("id, user_id, username")
        .ilike("username", escapeIlike(targetModelUsername.toLowerCase()))
        .maybeSingle();

      if (!targetModel || !targetModel.user_id) {
        return NextResponse.json({ error: "Model not found" }, { status: 404 });
      }

      // Get model's actor ID
      const { data: targetActor } = await adminClient
        .from("actors")
        .select("id")
        .eq("user_id", targetModel.user_id)
        .maybeSingle();

      if (!targetActor) {
        return NextResponse.json({ error: "Model actor not found" }, { status: 404 });
      }

      if (targetActor.id === sender.id) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }

      // Check for existing conversation between these two actors
      const { data: senderParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", sender.id);

      if (senderParticipations && senderParticipations.length > 0) {
        // Batched: one .in() with every id fails outright past ~300 UUIDs
        // (16KB URL limit) — the admin actor sits in 700+ conversations, and
        // a failed check would silently fork a duplicate conversation.
        const convIds = senderParticipations.map(p => p.conversation_id);
        for (let i = 0; i < convIds.length && !conversationId; i += 200) {
          const { data: match } = await adminClient
            .from("conversation_participants")
            .select("conversation_id")
            .eq("actor_id", targetActor.id)
            .in("conversation_id", convIds.slice(i, i + 200))
            .limit(1)
            .maybeSingle();

          if (match) {
            conversationId = match.conversation_id;
          }
        }
      }

      // Create new conversation if none found
      if (!conversationId) {
        const { data: newConv, error: convError } = await adminClient
          .from("conversations")
          .insert({ type: "direct", title: null })
          .select()
          .single();

        if (convError || !newConv) {
          logger.error("Failed to create conversation", convError);
          return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
        }

        const { error: partInsertError } = await adminClient
          .from("conversation_participants")
          .insert([
            { conversation_id: newConv.id, actor_id: sender.id },
            { conversation_id: newConv.id, actor_id: targetActor.id },
          ]);

        if (partInsertError) {
          logger.error("Failed to add participants", partInsertError);
          await adminClient.from("conversations").delete().eq("id", newConv.id);
          return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
        }

        conversationId = newConv.id;
      }
    }

    if (!conversationId) {
      return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
    }

    // Verify sender is part of conversation
    const { data: participation, error: partError } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("actor_id", sender.id)
      .maybeSingle();

    if (partError) {
      logger.error("Participation check error", partError);
      return NextResponse.json(
        { error: "Failed to verify conversation access" },
        { status: 500 }
      );
    }

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Get all participants to find the recipient (include user_id for model lookup)
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("actor_id, actors(id, type, user_id)")
      .eq("conversation_id", conversationId)
      .neq("actor_id", sender.id) as { data: any[] | null };

    const recipient = participants?.[0];

    // Check if either user has blocked the other
    if (recipient?.actors?.id) {
      const { data: isBlocked } = await supabase.rpc("is_blocked", {
        p_actor_id_1: sender.id,
        p_actor_id_2: recipient.actors.id,
      });

      if (isBlocked) {
        return NextResponse.json(
          { error: "Unable to send message", code: "BLOCKED" },
          { status: 403 }
        );
      }
    }

    // Determine if coins are required and get model ID for coin transfer
    let coinsRequired = 0;
    let recipientModelId: string | null = null;

    if (sender.type === "model" || sender.type === "admin") {
      // Models and admins message for free
      coinsRequired = 0;
    } else {
      // Fan/Brand messaging model: COSTS COINS
      if (recipient?.actors?.type === "model" && recipient?.actors?.user_id) {
        // Look up the model's actual ID and message rate using user_id
        const { data: recipientModel } = await supabase
          .from("models")
          .select("id, message_rate")
          .eq("user_id", recipient.actors.user_id)
          .maybeSingle() as { data: { id: string; message_rate: number | null } | null };

        if (recipientModel) {
          recipientModelId = recipientModel.id;
          coinsRequired = messageCoinCost(recipientModel.message_rate);
        }
      }
    }

    // Use atomic function for message sending with coin transfer
    // Pass the actual model ID (not actor ID) for coin crediting.
    // Called via service-role client: send_message_with_coins is REVOKEd from
    // authenticated/anon; sender.id is derived from the authenticated session.
    const { data: rpcData, error: rpcError } = await (adminClient.rpc as any)(
      "send_message_with_coins",
      {
        p_conversation_id: conversationId,
        p_sender_id: sender.id,
        p_recipient_id: recipientModelId ?? null,
        p_content: content || "",
        p_media_url: mediaUrl ?? null,
        p_media_type: mediaType ?? null,
        p_coin_amount: coinsRequired,
        p_media_price: mediaPrice ?? null,
        p_reply_to_id: replyToId ?? null,
      }
    );
    if (rpcError) {
      logger.error("RPC error", rpcError);
      return NextResponse.json(
        { error: rpcError.message || "Failed to send message" },
        { status: 500 }
      );
    }

    const result = (rpcData ?? {}) as Record<string, any>;

    if (!result.success) {
      logger.error("RPC returned failure", result);
      // Handle specific errors
      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          {
            error: "Insufficient coins",
            required: result.required,
            balance: result.balance,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 500 }
      );
    }

    // Fetch the created message for response (use admin client to avoid replication lag)
    const { data: rawMessage } = await adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, created_at")
      .eq("id", result.message_id)
      .single();

    // Chat-media paths must go back to the sender as signed URLs so the
    // optimistic bubble's replacement renders (no strip needed: the sender
    // always sees their own media).
    const message = rawMessage
      ? (await signChatMediaUrls(adminClient, [rawMessage]))[0]
      : rawMessage;

    // ─── First-message email notification ───────────────────────────────
    // Send email only on the FIRST message from this sender in this conversation.
    // This prevents spam while ensuring neither party misses the initial contact.
    if (conversationId && recipient?.actors) {
      try {
        const { count: senderMessageCount } = await adminClient
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", conversationId)
          .eq("sender_id", sender.id);

        if (senderMessageCount !== null && senderMessageCount <= 1) {
          // This is the first message from this sender — notify the recipient
          const recipientUserId = recipient.actors.user_id;
          if (recipientUserId) {
            const { data: { user: recipientUser } } = await adminClient.auth.admin.getUserById(recipientUserId);
            if (recipientUser?.email) {
              // Get sender display name
              let senderDisplayName = "Someone";
              if (sender.type === "model") {
                const { data: senderModel } = await adminClient.from("models").select("username").eq("user_id", user.id).maybeSingle();
                senderDisplayName = senderModel?.username || "A model";
              } else if (sender.type === "fan") {
                const { data: senderFan } = await adminClient.from("fans").select("display_name, username").eq("user_id", user.id).maybeSingle();
                senderDisplayName = senderFan?.display_name || senderFan?.username || "A fan";
              } else if (sender.type === "brand") {
                const { data: senderBrand } = await adminClient.from("brands").select("company_name").eq("user_id", user.id).maybeSingle();
                senderDisplayName = senderBrand?.company_name || "A brand";
              }

              // Get recipient display name
              let recipientDisplayName = "there";
              if (recipient.actors.type === "model") {
                const { data: recipientModel } = await adminClient.from("models").select("first_name, username").eq("user_id", recipientUserId).maybeSingle();
                recipientDisplayName = recipientModel?.first_name || recipientModel?.username || "there";
              } else if (recipient.actors.type === "fan") {
                const { data: recipientFan } = await adminClient.from("fans").select("display_name, username").eq("user_id", recipientUserId).maybeSingle();
                recipientDisplayName = recipientFan?.display_name || recipientFan?.username || "there";
              } else if (recipient.actors.type === "brand") {
                const { data: recipientBrand } = await adminClient.from("brands").select("company_name").eq("user_id", recipientUserId).maybeSingle();
                recipientDisplayName = recipientBrand?.company_name || "there";
              }

              const conversationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com"}/chats/${conversationId}`;

              sendNewMessageNotificationEmail({
                to: recipientUser.email,
                recipientName: recipientDisplayName,
                senderName: senderDisplayName,
                senderType: sender.type as "model" | "fan" | "brand",
                messagePreview: content || "(Media message)",
                conversationUrl,
              }).catch((err) => logger.error("First message notification email error", err));
            }
          }
        }
      } catch (emailErr) {
        // Don't fail the message send if email notification fails
        logger.error("First message notification check error", emailErr);
      }
    }

    // ─── Web push to the model (fire-and-forget, calls/start pattern) ────
    // Fan/brand → model is the paid direction (send_message_with_coins just
    // credited the model), and models are the only push audience in v1 —
    // fans have no opt-in surface (deferred), so we gate rather than rely
    // on the no-subscription no-op. Unlike email (first message only) this
    // fires on EVERY message: tag = conversation id, so a rapid burst in
    // one conversation REPLACES the previous notification instead of
    // stacking — that's the whole dedup story, no DB tracking needed.
    // Per-actor 'messages' preference is enforced inside sendPushToActor.
    if (
      conversationId &&
      recipient?.actors?.type === "model" &&
      (sender.type === "fan" || sender.type === "brand")
    ) {
      const recipientActorId: string = recipient.actors.id;
      const pushConversationId = conversationId;
      (async () => {
        let senderName = sender.type === "brand" ? "A brand" : "A fan";
        if (sender.type === "fan") {
          const { data: senderFan } = await adminClient
            .from("fans")
            .select("display_name, username")
            .eq("user_id", user.id)
            .maybeSingle();
          senderName = senderFan?.display_name || senderFan?.username || "A fan";
        } else {
          const { data: senderBrand } = await adminClient
            .from("brands")
            .select("company_name")
            .eq("user_id", user.id)
            .maybeSingle();
          senderName = senderBrand?.company_name || "A brand";
        }
        const mediaLabel = mediaType === "image/sticker"
          ? "a sticker"
          : mediaType?.startsWith("video")
            ? "a video"
            : mediaType?.startsWith("audio")
              ? "a voice note"
              : "a photo";
        const preview = content?.trim()
          ? content.trim().slice(0, 90)
          : `Sent you ${mediaLabel}`;
        await sendPushToActor(
          recipientActorId,
          {
            title: `New message from ${senderName}`,
            body: preview,
            url: `/chats/${pushConversationId}`,
            tag: `chat-${pushConversationId}`,
          },
          "messages"
        );
      })().catch((err) => logger.error("Message push error", err));
    }

    return NextResponse.json({
      success: true,
      message,
      coinsDeducted: result.coins_deducted || 0,
      conversationId: conversationId,
    });
  } catch (error) {
    logger.error("Send message error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
