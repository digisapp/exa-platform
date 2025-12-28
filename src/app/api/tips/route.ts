import { createClient } from "@/lib/supabase/server";
import { getModelIdFromActorId } from "@/lib/ids";
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
    const { recipientId, amount, conversationId } = body;

    // Validate inputs
    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient ID required" },
        { status: 400 }
      );
    }

    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: "Invalid tip amount" },
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

    // Can't tip yourself
    if (sender.id === recipientId) {
      return NextResponse.json(
        { error: "Cannot tip yourself" },
        { status: 400 }
      );
    }

    // Get recipient info
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

    // Transfer coins using the database function
    const { data: result, error: transferError } = await (supabase.rpc as any)(
      "transfer_coins",
      {
        p_sender_id: sender.id,
        p_recipient_id: recipientId,
        p_amount: amount,
        p_metadata: {
          conversation_id: conversationId || null,
          tip_type: "direct",
        },
      }
    );

    if (transferError) {
      console.error("Transfer error:", transferError);
      return NextResponse.json(
        { error: "Failed to process tip" },
        { status: 500 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          balance: result.balance,
          required: result.required,
        },
        { status: 402 }
      );
    }

    // Award points to recipient for receiving tip (+2)
    const recipientModelId = await getModelIdFromActorId(supabase, recipientId);
    if (recipientModelId) {
      const { error: pointsError } = await (supabase.rpc as any)("award_points", {
        p_model_id: recipientModelId,
        p_action: "tip_received",
        p_points: 2,
        p_metadata: { sender_actor_id: sender.id, amount },
      });
      if (pointsError) {
        console.error("Failed to award points for tip:", pointsError);
        // Non-critical error, don't fail the tip
      }
    }

    // Get recipient display name for response
    let recipientName = "Model";
    if (recipient.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("first_name, username")
        .eq("id", recipientId)
        .single() as { data: { first_name: string | null; username: string } | null };
      recipientName = model?.first_name || model?.username || "Model";
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.sender_new_balance,
      recipientName,
    });
  } catch (error) {
    console.error("Tip error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
