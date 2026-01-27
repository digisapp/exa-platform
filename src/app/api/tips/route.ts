import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getModelIdFromActorId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { sendTipReceivedEmail } from "@/lib/email";

// Admin client for inserting tip messages (bypasses RLS)
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Create a tip message in the conversation if conversationId provided
    if (conversationId) {
      const tipMessage = `🪙 Tip Sent — ${amount} Coins!`;
      // Use admin client to bypass RLS and ensure message is created
      const { error: msgError } = await adminClient
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: sender.id,
          content: tipMessage,
          is_system: true,
        });

      if (msgError) {
        console.error("Failed to create tip message:", msgError);
        // Non-critical error, tip was still successful
      }

      // Update conversation timestamp
      await adminClient
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    }

    // Get recipient display name for response and send email
    let recipientName = "Model";
    if (recipient.type === "model") {
      const { data: model } = await supabase
        .from("models")
        .select("email, first_name, username")
        .eq("id", recipientId)
        .single() as { data: { email: string | null; first_name: string | null; username: string } | null };
      recipientName = model?.first_name || model?.username || "Model";

      // Send email notification to model (non-blocking)
      if (model?.email) {
        // Get sender name
        let senderName = "Someone";
        if (sender.type === "fan") {
          const { data: fan } = await (supabase
            .from("fans") as any)
            .select("display_name")
            .eq("id", sender.id)
            .single();
          senderName = fan?.display_name || "A fan";
        } else if (sender.type === "model") {
          const { data: senderModel } = await (supabase
            .from("models") as any)
            .select("first_name, username")
            .eq("user_id", user.id)
            .single();
          senderName = senderModel?.first_name || senderModel?.username || "A model";
        }

        sendTipReceivedEmail({
          to: model.email,
          modelName: model.first_name || model.username || "Model",
          tipperName: senderName,
          amount: result.amount,
        }).catch((err) => console.error("Failed to send tip email:", err));
      }
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
