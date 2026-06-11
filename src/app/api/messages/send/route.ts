import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { escapeIlike } from "@/lib/utils";
import { sendNewMessageNotificationEmail } from "@/lib/email";
import { detectInPersonRequest } from "@/lib/in-person-request";
import { logger } from "@/lib/logger";

// Virtual-first policy: a fan with this many flagged messages in the last 7 days
// gets their account flagged for trust & safety review. Soft warning + auto-flag
// is the primary lever; account-level flag is the escalation for repeat offenders.
const ACCOUNT_FLAG_THRESHOLD = 3;
const ACCOUNT_FLAG_WINDOW_DAYS = 7;

const DEFAULT_MESSAGE_COST = 5; // Default coins if model hasn't set a rate

// Service role client for creating conversations (bypasses RLS)
const adminClient = createServiceRoleClient();

// Zod schema for message validation
const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID").optional().nullable(),
  targetModelUsername: z.string().min(1).max(100).optional().nullable(),
  content: z.string().max(5000, "Message is too long").optional().nullable(),
  mediaUrl: z.string().url("Invalid media URL").max(2048, "URL is too long").optional().nullable(),
  mediaType: z.string().refine(
    (val) => /^(image|video|audio)(\/[\w.+-]+)?$/.test(val),
    { message: "Invalid media type" }
  ).optional().nullable(),
  mediaPrice: z.number().int().min(10, "Minimum price is 10 coins").max(10000, "Maximum price is 10,000 coins").optional().nullable(),
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

    // Only models can set a media price, and only when media is attached
    if (mediaPrice && (sender.type !== "model" || !mediaUrl)) {
      return NextResponse.json(
        { error: "Only models can set a price on media messages" },
        { status: 400 }
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
        const convIds = senderParticipations.map(p => p.conversation_id);
        const { data: match } = await adminClient
          .from("conversation_participants")
          .select("conversation_id")
          .eq("actor_id", targetActor.id)
          .in("conversation_id", convIds)
          .limit(1)
          .maybeSingle();

        if (match) {
          conversationId = match.conversation_id;
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
          // Use model's rate or default, with minimum of DEFAULT_MESSAGE_COST
          const modelRate = recipientModel.message_rate ?? DEFAULT_MESSAGE_COST;
          coinsRequired = Math.max(DEFAULT_MESSAGE_COST, modelRate);
        }
      }
    }

    // Use atomic function for message sending with coin transfer
    // Pass the actual model ID (not actor ID) for coin crediting
    const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
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
    const { data: message } = await adminClient
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, created_at")
      .eq("id", result.message_id)
      .single();

    // ─── Virtual-first auto-flag ────────────────────────────────────────
    // Only check fan/brand → model direction. Models are exempt (they may
    // legitimately discuss real-world bookings/shoots).
    if (
      result.message_id &&
      (sender.type === "fan" || sender.type === "brand") &&
      content
    ) {
      const detection = detectInPersonRequest(content);
      if (detection.matched) {
        try {
          const { error: flagError } = await adminClient
            .from("messages")
            .update({ is_flagged: true, flagged_reason: `in_person_request:${detection.phrase}` })
            .eq("id", result.message_id);
          if (flagError) {
            logger.error("Failed to flag in-person request message", flagError);
          }

          // Repeat-offender escalation — only fans have an account flag column.
          if (sender.type === "fan") {
            const windowStart = new Date(
              Date.now() - ACCOUNT_FLAG_WINDOW_DAYS * 24 * 60 * 60 * 1000
            ).toISOString();
            const { count } = await adminClient
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("sender_id", sender.id)
              .eq("is_flagged", true)
              .gte("created_at", windowStart);

            if ((count ?? 0) >= ACCOUNT_FLAG_THRESHOLD) {
              const { error: fanFlagError } = await adminClient
                .from("fans")
                .update({
                  flagged_for_review: true,
                  flagged_for_review_at: new Date().toISOString(),
                  flagged_for_review_reason: "repeated_in_person_requests",
                })
                .eq("user_id", user.id)
                .eq("flagged_for_review", false);
              if (fanFlagError) {
                logger.error("Failed to flag fan account for review", fanFlagError);
              }
            }
          }
        } catch (moderationErr) {
          logger.error("Virtual-first moderation error", moderationErr);
        }
      }
    }

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
                const { data: senderModel } = await adminClient.from("models").select("first_name, last_name, username").eq("user_id", user.id).maybeSingle();
                senderDisplayName = senderModel ? `${senderModel.first_name || ""} ${senderModel.last_name || ""}`.trim() || senderModel.username || "A model" : "A model";
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

              const conversationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com"}/messages?c=${conversationId}`;

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
