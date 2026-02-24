import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { escapeIlike } from "@/lib/utils";

const DEFAULT_MESSAGE_COST = 10; // Default coins if model hasn't set a rate

// Service role client for creating conversations (bypasses RLS)
const adminClient = createServiceRoleClient();

// Zod schema for message validation
const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID").optional().nullable(),
  targetModelUsername: z.string().min(1).max(100).optional().nullable(),
  content: z.string().max(5000, "Message is too long").optional().nullable(),
  mediaUrl: z.string().url("Invalid media URL").max(2048, "URL is too long").optional().nullable(),
  mediaType: z.enum(["image", "video", "audio"]).optional().nullable(),
  mediaPrice: z.number().int().min(10, "Minimum price is 10 coins").max(10000, "Maximum price is 10,000 coins").optional().nullable(),
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

    const { conversationId: providedConversationId, targetModelUsername, content, mediaUrl, mediaType, mediaPrice } = validationResult.data;
    let conversationId = providedConversationId || null;
    let conversationCreated = false;

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

      const hasActiveSubscription = brand?.subscription_status === "active" ||
        (brand?.subscription_tier && brand.subscription_tier !== "free");

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
          console.error("Failed to create conversation:", convError);
          return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
        }

        const { error: partInsertError } = await adminClient
          .from("conversation_participants")
          .insert([
            { conversation_id: newConv.id, actor_id: sender.id },
            { conversation_id: newConv.id, actor_id: targetActor.id },
          ]);

        if (partInsertError) {
          console.error("Failed to add participants:", partInsertError);
          await adminClient.from("conversations").delete().eq("id", newConv.id);
          return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });
        }

        conversationId = newConv.id;
        conversationCreated = true;
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
      console.error("Participation check error:", partError);
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
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "send_message_with_coins",
      {
        p_conversation_id: conversationId,
        p_sender_id: sender.id,
        p_recipient_id: recipientModelId as string,  // This is the model's table ID, not actor ID
        p_content: content || "",
        p_media_url: mediaUrl || undefined,
        p_media_type: mediaType || undefined,
        p_coin_amount: coinsRequired,
        p_media_price: mediaPrice || undefined,
      }
    );
    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    const result = (rpcData ?? {}) as Record<string, any>;

    if (!result.success) {
      console.error("RPC returned failure:", result);
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

    // Fetch the created message for response
    const { data: message } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, media_url, media_type, media_price, media_viewed_by, is_system, created_at")
      .eq("id", result.message_id)
      .single();

    return NextResponse.json({
      success: true,
      message,
      coinsDeducted: result.coins_deducted || 0,
      conversationId: conversationId,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
