import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const MESSAGE_COST = 10; // Coins required to message a model

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
        coinsRequired = MESSAGE_COST;
      }
    }

    // If coins required, deduct them
    if (coinsRequired > 0) {
      // Get sender's coin balance (for non-models, we'd need a different table)
      // For now, we assume sender is a model or brand with coins
      const { data: senderModel } = await supabase
        .from("models")
        .select("coin_balance")
        .eq("id", sender.id)
        .single() as { data: { coin_balance: number } | null };

      const balance = senderModel?.coin_balance || 0;

      if (balance < coinsRequired) {
        return NextResponse.json(
          {
            error: "Insufficient coins",
            required: coinsRequired,
            balance: balance,
          },
          { status: 402 }
        );
      }

      // Deduct coins using RPC
      const { data: deducted, error: deductError } = await (supabase.rpc as any)(
        "deduct_coins",
        {
          p_actor_id: sender.id,
          p_amount: coinsRequired,
          p_action: "message_sent",
          p_metadata: { conversation_id: conversationId },
        }
      );

      if (deductError || !deducted) {
        return NextResponse.json(
          { error: "Failed to deduct coins" },
          { status: 500 }
        );
      }
    }

    // Insert the message
    const { data: message, error: messageError } = await (supabase
      .from("messages") as any)
      .insert({
        conversation_id: conversationId,
        sender_id: sender.id,
        content: content || null,
        media_url: mediaUrl || null,
        media_type: mediaType || null,
        is_system: false,
      })
      .select()
      .single();

    if (messageError) {
      return NextResponse.json(
        { error: `Failed to send message: ${messageError.message}` },
        { status: 500 }
      );
    }

    // Update conversation's updated_at
    await (supabase
      .from("conversations") as any)
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Update sender's last_read_at
    await (supabase
      .from("conversation_participants") as any)
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("actor_id", sender.id);

    return NextResponse.json({
      success: true,
      message,
      coinsDeducted: coinsRequired,
    });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
