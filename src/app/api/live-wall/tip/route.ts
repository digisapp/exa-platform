import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { assertNotSuspended } from "@/lib/auth/suspension";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { notifyModelEarning } from "@/lib/earning-notifications";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";

const adminClient = createServiceRoleClient();

const tipSchema = z.object({
  messageId: z.string().uuid("Invalid message ID"),
  amount: z
    .number()
    .int()
    .min(1, "Minimum tip is 1 coin")
    .max(10000, "Maximum tip is 10,000 coins"),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "tips",
      user.id
    );
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const validation = tipSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { messageId, amount } = validation.data;

    // Get sender's actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    const suspended = await assertNotSuspended(actor.id);
    if (suspended) return suspended;

    // Call atomic tip function via service-role client: tip_live_wall_message is
    // REVOKEd from authenticated/anon; actor.id is derived from the session.
    const { data: rpcData, error: rpcError } = await (adminClient.rpc as any)(
      "tip_live_wall_message",
      {
        p_tipper_actor_id: actor.id,
        p_message_id: messageId,
        p_amount: amount,
      }
    );

    if (rpcError) {
      logger.error("Tip RPC error", rpcError);
      return NextResponse.json(
        { error: "Failed to send tip" },
        { status: 500 }
      );
    }

    const result = (rpcData ?? {}) as Record<string, any>;

    if (!result.success) {
      if (result.error === "Insufficient coins") {
        return NextResponse.json(
          {
            error: "Insufficient coins",
            balance: result.balance,
            required: result.required,
          },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: result.error || "Failed to send tip" },
        { status: 400 }
      );
    }

    // Light the bell for sub-super tips + web push for ALL amounts.
    // tip_live_wall_message already inserts a 'tip_received' notification
    // itself for amounts >= 50 (20260426000002) — skipBell covers that gap
    // or super tips would double-notify; the RPC sends no push, so push
    // fires for every amount. Recipient must be a CLAIMED model (bell/push
    // are model-only and unclaimed imports are never touched).
    try {
      const { data: wallMessage } = await (adminClient
        .from("live_wall_messages") as any)
        .select("actor_id")
        .eq("id", messageId)
        .single();
      if (wallMessage?.actor_id) {
        const { data: recipientActor } = await (adminClient
          .from("actors") as any)
          .select("type, user_id")
          .eq("id", wallMessage.actor_id)
          .single();
        if (recipientActor?.type === "model") {
          await notifyModelEarning(adminClient, {
            recipientUserId: recipientActor.user_id,
            recipientActorId: wallMessage.actor_id,
            type: "live_wall_tip_received",
            title: "💰 Live Wall tip",
            message: `You received a ${amount}-coin tip on the Live Wall`,
            amountCoins: amount,
            metadata: { message_id: messageId, tipper_actor_id: actor.id },
            skipBell: amount >= 50,
            push: {
              body: `You received a ${amount}-coin tip (${formatUsd(coinsToUsd(amount))}) on the Live Wall`,
            },
          });
        }
      }
    } catch (notifyError) {
      // Never fail a successful tip over a bell row
      logger.error("Live wall tip notification error", notifyError);
    }

    return NextResponse.json({
      success: true,
      amount: result.amount,
      newBalance: result.new_balance,
      tipTotal: result.tip_total,
    });
  } catch (error) {
    logger.error("Live wall tip error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
