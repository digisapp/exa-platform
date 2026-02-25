import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const DEFAULT_MESSAGE_COST = 5; // Default coins if model hasn't set a rate

const newConversationSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  initialMessage: z.string().min(1, "Message cannot be empty").max(5000, "Message is too long"),
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
    const rateLimitResult = await checkEndpointRateLimit(request, "messages", user.id);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();
    const validationResult = newConversationSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { recipientId, initialMessage } = validationResult.data;

    // Get sender's actor info
    const { data: sender } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!sender) {
      return NextResponse.json({ error: "Sender not found" }, { status: 400 });
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

    // Can't message yourself
    if (sender.id === recipientId) {
      return NextResponse.json(
        { error: "Cannot message yourself" },
        { status: 400 }
      );
    }

    // Verify recipient exists
    const { data: recipient } = await supabase
      .from("actors")
      .select("id, type")
      .eq("id", recipientId)
      .single() as { data: { id: string; type: string } | null };

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Check if either user has blocked the other
    const { data: isBlocked } = await supabase.rpc("is_blocked", {
      p_actor_id_1: sender.id,
      p_actor_id_2: recipientId,
    });

    if (isBlocked) {
      return NextResponse.json(
        { error: "Unable to message this user", code: "BLOCKED" },
        { status: 403 }
      );
    }

    // Check if conversation already exists between these two users
    const { data: existingParticipations } = await supabase
      .from("conversation_participants")
      .select("conversation_id")
      .eq("actor_id", sender.id) as { data: { conversation_id: string }[] | null };

    let existingConversationId: string | null = null;

    if (existingParticipations && existingParticipations.length > 0) {
      // Check if any of sender's conversations include the recipient
      const conversationIds = existingParticipations.map(
        (p) => p.conversation_id
      );

      const { data: recipientParticipation } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", recipientId)
        .in("conversation_id", conversationIds)
        .limit(1)
        .single() as { data: { conversation_id: string } | null };

      if (recipientParticipation) {
        existingConversationId = recipientParticipation.conversation_id;
      }
    }

    if (existingConversationId) {
      // Return existing conversation
      return NextResponse.json({
        success: true,
        conversationId: existingConversationId,
        isNew: false,
      });
    }

    // Create new conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({
        type: "direct",
        title: null,
      })
      .select()
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Add both participants
    const { error: participantError } = await supabase
      .from("conversation_participants")
      .insert([
        {
          conversation_id: conversation.id,
          actor_id: sender.id,
        },
        {
          conversation_id: conversation.id,
          actor_id: recipientId,
        },
      ]);

    if (participantError) {
      // Cleanup: delete the conversation
      await supabase.from("conversations").delete().eq("id", conversation.id);
      return NextResponse.json(
        { error: "Failed to add participants" },
        { status: 500 }
      );
    }

    // Send the initial message using atomic RPC (coin transfer + message in one transaction)
    let coinsRequired = 0;
    let recipientModelId: string | null = null;

    if (sender.type !== "model" && recipient.type === "model") {
      const { data: recipientActor } = await supabase
        .from("actors")
        .select("user_id")
        .eq("id", recipientId)
        .single() as { data: { user_id: string } | null };

      if (recipientActor) {
        const { data: recipientModel } = await supabase
          .from("models")
          .select("id, message_rate")
          .eq("user_id", recipientActor.user_id)
          .maybeSingle() as { data: { id: string; message_rate: number | null } | null };

        if (recipientModel) {
          recipientModelId = recipientModel.id;
          const modelRate = recipientModel.message_rate ?? DEFAULT_MESSAGE_COST;
          coinsRequired = Math.max(DEFAULT_MESSAGE_COST, modelRate);
        }
      }
    }

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "send_message_with_coins",
      {
        p_conversation_id: conversation.id,
        p_sender_id: sender.id,
        p_recipient_id: recipientModelId || "",
        p_content: initialMessage,
        p_media_url: undefined,
        p_media_type: undefined,
        p_coin_amount: coinsRequired,
      }
    );
    const result = rpcData as Record<string, any>;

    if (rpcError) {
      await supabase.from("conversations").delete().eq("id", conversation.id);
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
    }

    if (!result.success) {
      await supabase.from("conversations").delete().eq("id", conversation.id);

      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          { error: "Insufficient coins to send message", required: result.required, balance: result.balance },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId: conversation.id,
      isNew: true,
    });
  } catch (error) {
    console.error("New conversation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
