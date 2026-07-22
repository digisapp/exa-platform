import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { NextRequest, NextResponse } from "next/server";
import { sendTipReceivedEmail } from "@/lib/email";
import { notifyModelEarning } from "@/lib/earning-notifications";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";
import { z } from "zod";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { TIP_GIFT_KEYS, giftByKey, formatTipMessage } from "@/lib/tip-config";

// Zod schema for tip validation
const tipSchema = z.object({
  recipientId: z.string().uuid("Invalid recipient ID"),
  amount: z.number().int("Amount must be a whole number").min(1, "Minimum tip is 1 coin").max(100000, "Maximum tip is 100,000 coins"),
  conversationId: z.string().uuid("Invalid conversation ID").optional().nullable(),
  // A gift is just a named presentation of a fixed-amount tip — same coins,
  // same RPC. Key must match a known gift and the amount must match its price.
  gift: z.enum(TIP_GIFT_KEYS).optional().nullable(),
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

    const { recipientId, amount, conversationId, gift: giftKey } = validationResult.data;

    const gift = giftByKey(giftKey);
    if (giftKey && (!gift || gift.amount !== amount)) {
      return NextResponse.json(
        { error: "Gift amount mismatch" },
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

    const suspended = await assertNotSuspended(sender.id);
    if (suspended) return suspended;

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

    // Transfer coins using the database function.
    // Called via the service-role client: transfer_coins is REVOKEd from
    // authenticated/anon (money RPC lockdown), and sender.id is derived from
    // the authenticated session above, so this cannot be used to drain others.
    const { data: rpcData, error: transferError } = await adminClient.rpc(
      "transfer_coins",
      {
        p_sender_id: sender.id,
        p_recipient_id: recipientId,
        p_amount: amount,
        p_metadata: {
          conversation_id: conversationId || null,
          tip_type: "direct",
          gift: gift?.key || null,
        },
      }
    );
    const result = rpcData as Record<string, any>;

    if (transferError) {
      logger.error("Transfer error", transferError);
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
      const { data: fan } = await supabase
        .from("fans")
        .select("display_name")
        .eq("id", sender.id)
        .single();
      senderName = fan?.display_name || "A fan";
    } else if (sender.type === "model") {
      const { data: senderModel } = await supabase
        .from("models")
        .select("username")
        .eq("user_id", user.id)
        .single();
      senderName = senderModel?.username || "A model";
    } else if (sender.type === "brand") {
      const { data: brand } = await supabase
        .from("brands")
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
        const conversationIds = senderParticipations.map((p: any) => p.conversation_id);

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
      const tipMessage = formatTipMessage(senderName.replace(/[<>]/g, ""), amount, gift);
      const { error: msgError } = await adminClient
        .from("messages")
        .insert({
          conversation_id: finalConversationId,
          sender_id: sender.id,
          content: tipMessage,
          is_system: true,
        });

      if (msgError) {
        logger.error("Failed to create tip message", msgError);
      }

      // Update conversation timestamp
      await adminClient
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalConversationId);
    }

    // Get recipient display name for response and send email.
    // Service client: user_id is needed for the bell notification and may
    // not be readable cross-user through RLS.
    let recipientName = "Model";
    if (recipient.type === "model") {
      const { data: model } = await adminClient
        .from("models")
        .select("email, first_name, username, user_id")
        .eq("id", recipientId)
        .single() as { data: { email: string | null; first_name: string | null; username: string; user_id: string | null } | null };
      recipientName = model?.username || "Model";

      // Send email notification to model (non-blocking)
      if (model?.email) {
        sendTipReceivedEmail({
          to: model.email,
          modelName: model.first_name || model.username || "Model",
          tipperName: senderName,
          amount: result.amount,
        }).catch((err) => logger.error("Failed to send tip email", err));
      }

      // Light the bell + web push ('earnings' toggle) for claimed models
      // only (helper no-ops when user_id is null — unclaimed imports
      // untouched). Push deep-links into the conversation so the model can
      // thank the tipper; recipientId IS the actor id.
      await notifyModelEarning(adminClient, {
        recipientUserId: model?.user_id,
        recipientActorId: recipientId,
        type: "tip_received",
        title: "💰 Tip received",
        message: `${senderName} tipped you ${result.amount} coins`,
        amountCoins: result.amount,
        metadata: {
          sender_id: sender.id,
          conversation_id: finalConversationId || null,
          gift: gift?.key || null,
        },
        push: {
          body: `${senderName} tipped you ${result.amount} coins (${formatUsd(coinsToUsd(result.amount))})`,
          url: finalConversationId ? `/chats/${finalConversationId}` : "/wallet",
        },
      });
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.sender_new_balance,
      recipientName,
      conversationId: finalConversationId || null,
    });
  } catch (error) {
    logger.error("Tip error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
