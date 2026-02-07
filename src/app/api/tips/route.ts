import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { sendTipReceivedEmail } from "@/lib/email";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Zod schema for tip validation
const tipSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  amount: z.number().int("Amount must be a whole number").min(1, "Minimum tip is 1 coin").max(100000, "Maximum tip is 100,000 coins"),
  conversationId: z.string().uuid("Invalid conversation ID").optional().nullable(),
});

// Admin client for inserting tip messages (bypasses RLS)
const adminClient = createServiceRoleClient();

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

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate request body with Zod schema
    const validationResult = tipSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { recipientId, amount, conversationId } = validationResult.data;

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

    // Get sender name for the tip message
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
    } else if (sender.type === "brand") {
      const { data: brand } = await (supabase
        .from("brands") as any)
        .select("company_name")
        .eq("id", sender.id)
        .single();
      senderName = brand?.company_name || "A brand";
    }

    // Find or create conversation and add tip message
    let finalConversationId = conversationId;

    if (!finalConversationId) {
      // Find existing conversation between sender and recipient
      const { data: senderParticipations } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("actor_id", sender.id);

      if (senderParticipations && senderParticipations.length > 0) {
        const conversationIds = senderParticipations.map(p => p.conversation_id);

        // Check if recipient is in any of these conversations
        const { data: recipientParticipation } = await adminClient
          .from("conversation_participants")
          .select("conversation_id")
          .eq("actor_id", recipientId)
          .in("conversation_id", conversationIds)
          .limit(1)
          .maybeSingle();

        if (recipientParticipation) {
          finalConversationId = recipientParticipation.conversation_id;
        }
      }

      // Create new conversation if none exists
      if (!finalConversationId) {
        const { data: conversation } = await adminClient
          .from("conversations")
          .insert({ type: "direct", title: null })
          .select()
          .single();

        if (conversation) {
          await adminClient
            .from("conversation_participants")
            .insert([
              { conversation_id: conversation.id, actor_id: sender.id },
              { conversation_id: conversation.id, actor_id: recipientId },
            ]);
          finalConversationId = conversation.id;
        }
      }
    }

    // Create tip message in conversation
    if (finalConversationId) {
      const tipMessage = `💝 ${senderName.replace(/[<>]/g, "")} sent a ${amount} coin tip!`;
      const { error: msgError } = await adminClient
        .from("messages")
        .insert({
          conversation_id: finalConversationId,
          sender_id: sender.id,
          content: tipMessage,
          is_system: true,
        });

      if (msgError) {
        console.error("Failed to create tip message:", msgError);
      }

      // Update conversation timestamp
      await adminClient
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalConversationId);
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
