import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

    const body = await request.json();
    const { recipientId, initialMessage } = body;

    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient ID required" },
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
      return NextResponse.json({ error: "Sender not found" }, { status: 400 });
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
    const { data: conversation, error: convError } = await (supabase
      .from("conversations") as any)
      .insert({
        type: "direct",
        title: null,
      })
      .select()
      .single() as { data: { id: string } | null; error: any };

    if (convError || !conversation) {
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    // Add both participants
    const { error: participantError } = await (supabase
      .from("conversation_participants") as any)
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

    // If initial message provided, send it
    if (initialMessage) {
      // Determine coin cost
      let coinsRequired = 0;
      if (sender.type !== "model" && recipient.type === "model") {
        coinsRequired = 10;
      }

      // Check balance if coins required
      if (coinsRequired > 0) {
        // Get balance based on actor type
        let balance = 0;

        if (sender.type === "fan") {
          const { data: senderFan } = await supabase
            .from("fans")
            .select("coin_balance")
            .eq("id", sender.id)
            .single() as { data: { coin_balance: number } | null };
          balance = senderFan?.coin_balance || 0;
        } else {
          const { data: senderModel } = await supabase
            .from("models")
            .select("coin_balance")
            .eq("id", sender.id)
            .single() as { data: { coin_balance: number } | null };
          balance = senderModel?.coin_balance || 0;
        }

        if (balance < coinsRequired) {
          // Delete the conversation since we can't send the message
          await supabase
            .from("conversations")
            .delete()
            .eq("id", conversation.id);

          return NextResponse.json(
            {
              error: "Insufficient coins to send message",
              required: coinsRequired,
              balance: balance,
            },
            { status: 402 }
          );
        }

        // Deduct coins (handles both fans and models)
        await (supabase.rpc as any)("deduct_coins", {
          p_actor_id: sender.id,
          p_amount: coinsRequired,
          p_action: "message_sent",
          p_metadata: { conversation_id: conversation.id },
        });
      }

      // Send the message
      await (supabase.from("messages") as any).insert({
        conversation_id: conversation.id,
        sender_id: sender.id,
        content: initialMessage,
        is_system: false,
      });

      // Update sender's last_read_at
      await (supabase
        .from("conversation_participants") as any)
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversation.id)
        .eq("actor_id", sender.id);
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
