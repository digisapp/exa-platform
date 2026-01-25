import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const DEFAULT_MESSAGE_COST = 10; // Default coins if model hasn't set a rate

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
    const { conversationId, content, mediaUrl, mediaType } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID required" },
        { status: 400 }
      );
    }

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: "Message content or media required" },
        { status: 400 }
      );
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

    // Check if brand has active subscription
    if (sender.type === "brand") {
      const { data: brand } = await (supabase
        .from("brands") as any)
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

    // Verify sender is part of conversation
    const { data: participation } = await supabase
      .from("conversation_participants")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("actor_id", sender.id)
      .single() as { data: any };

    if (!participation) {
      return NextResponse.json(
        { error: "Not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Get all participants to find the recipient
    const { data: participants } = await supabase
      .from("conversation_participants")
      .select("actor_id, actors(id, type)")
      .eq("conversation_id", conversationId)
      .neq("actor_id", sender.id) as { data: any[] | null };

    const recipient = participants?.[0];

    // Check if either user has blocked the other
    if (recipient?.actors?.id) {
      const { data: isBlocked } = await (supabase.rpc as any)("is_blocked", {
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

    // Determine if coins are required
    let coinsRequired = 0;

    if (sender.type === "model" && recipient?.actors?.type === "model") {
      // Model-to-model: FREE
      coinsRequired = 0;
    } else if (sender.type === "model") {
      // Model replying to fan/brand: FREE
      coinsRequired = 0;
    } else {
      // Fan/Brand messaging model: COSTS COINS
      if (recipient?.actors?.type === "model") {
        // Look up the model's actual message rate
        const { data: recipientModel } = await supabase
          .from("models")
          .select("message_rate")
          .eq("id", recipient.actor_id)
          .single() as { data: { message_rate: number | null } | null };

        // Use model's rate or default, with minimum of DEFAULT_MESSAGE_COST
        const modelRate = recipientModel?.message_rate ?? DEFAULT_MESSAGE_COST;
        coinsRequired = Math.max(DEFAULT_MESSAGE_COST, modelRate);
      }
    }

    // Use atomic function for message sending with coin transfer
    const { data: result, error: rpcError } = await (supabase.rpc as any)(
      "send_message_with_coins",
      {
        p_conversation_id: conversationId,
        p_sender_id: sender.id,
        p_recipient_id: recipient?.actors?.id || null,
        p_content: content || null,
        p_media_url: mediaUrl || null,
        p_media_type: mediaType || null,
        p_coin_amount: coinsRequired,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    if (!result.success) {
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
    const { data: message } = await (supabase
      .from("messages") as any)
      .select("*")
      .eq("id", result.message_id)
      .single();

    return NextResponse.json({
      success: true,
      message,
      coinsDeducted: result.coins_deducted || 0,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
