import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { centsToCoins } from "@/lib/coin-config";
import { logger } from "@/lib/logger";

// A refund (charge.refunded) and a lost chargeback (charge.dispute.closed with
// status "lost") both mean the money is gone, so both run the same full
// reversal: claw back coins/products and undo fulfillment. Every step is
// idempotent — coin clawbacks via a unique idempotency_key, product reversals
// via a status guard — so Stripe redelivery is a no-op.

type ReversalContext = {
  reason: "refund" | "chargeback";
};

function getPaymentIntentId(charge: Stripe.Charge): string | null {
  return typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : (charge.payment_intent as { id?: string } | null)?.id ?? null;
}

async function getChargePaymentIntentId(chargeId: string): Promise<string | null> {
  const charge = await stripe.charges.retrieve(chargeId);
  return getPaymentIntentId(charge);
}

// Removes coins atomically with debt/clamp handling (see clawback_coins RPC).
// allowNegative=true lets a fan's balance go negative (debt) for coins they
// already spent; false clamps at 0 so an earner isn't pushed into debt.
async function clawbackCoins(
  supabaseAdmin: SupabaseClient,
  actorId: string | null | undefined,
  coins: number,
  action: string,
  metadata: Record<string, unknown>,
  idempotencyKey: string,
  allowNegative: boolean
): Promise<void> {
  if (!actorId || !coins || coins <= 0) return;
  const { data, error } = await supabaseAdmin.rpc("clawback_coins", {
    p_actor_id: actorId,
    p_amount: coins,
    p_action: action,
    p_metadata: metadata,
    p_idempotency_key: idempotencyKey,
    p_allow_negative: allowNegative,
  });
  if (error) {
    logger.error("clawback_coins failed", error, { actorId, coins, action });
    return;
  }
  const res = data as { shortfall?: number; duplicate?: boolean } | null;
  if (res?.shortfall && res.shortfall > 0) {
    logger.warn("Coin clawback shortfall (balance below amount owed)", {
      actorId,
      action,
      ...res,
    });
  }
}

// Each reversal returns true if the payment intent belonged to it (matched),
// regardless of whether work was needed — so the orchestrator stops at the
// owning product.

async function reverseCoinPurchase(
  supabaseAdmin: SupabaseClient,
  pi: string,
  ctx: ReversalContext
): Promise<boolean> {
  const { data: tx } = await supabaseAdmin
    .from("coin_transactions")
    .select("id, actor_id, amount")
    .eq("action", "purchase")
    .contains("metadata", { stripe_payment_intent: pi })
    .maybeSingle();
  if (!tx) return false;

  // Key on the payment_intent (stable across the refund and lost-dispute events
  // for the same charge) so a refund followed by a chargeback can't claw back
  // the same coins twice. Coins have no status field to guard on like products do.
  await clawbackCoins(
    supabaseAdmin,
    tx.actor_id,
    tx.amount,
    "refund",
    { original_transaction_id: tx.id, stripe_payment_intent: pi, reason: ctx.reason },
    `coins:${pi}`,
    true // fan may go into debt for coins already spent
  );
  return true;
}

async function reverseTicketPurchase(
  supabaseAdmin: SupabaseClient,
  pi: string,
  ctx: ReversalContext
): Promise<boolean> {
  const { data: purchase } = await supabaseAdmin
    .from("ticket_purchases")
    .select("id, status, quantity, fan_id, affiliate_commission_id")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!purchase) return false;
  if (purchase.status === "refunded" || purchase.status === "cancelled") return true;

  // status -> refunded fires the update_ticket_quantity_sold trigger, which
  // decrements ticket_tiers.quantity_sold automatically.
  await supabaseAdmin
    .from("ticket_purchases")
    .update({ status: "refunded" })
    .eq("id", purchase.id);

  // Claw back the fan's purchase-bonus coins (10 per ticket). These were a free
  // promo reward, so clamp at 0 rather than pushing the fan into debt over them.
  if (purchase.fan_id && purchase.quantity) {
    await clawbackCoins(
      supabaseAdmin,
      purchase.fan_id,
      10 * purchase.quantity,
      "ticket_purchase_reversal",
      { ticket_purchase_id: purchase.id, reason: ctx.reason },
      `ticket_fan:${pi}`,
      false
    );
  }

  // Cancel the affiliate commission and claw back the coins credited to the
  // model (clamped — don't push the model into debt for a buyer's refund).
  if (purchase.affiliate_commission_id) {
    const { data: commission } = await supabaseAdmin
      .from("affiliate_commissions")
      .select("id, model_id, commission_amount_cents, status")
      .eq("id", purchase.affiliate_commission_id)
      .maybeSingle();
    if (commission && commission.status !== "cancelled") {
      await supabaseAdmin
        .from("affiliate_commissions")
        .update({ status: "cancelled" })
        .eq("id", commission.id);
      const coins = centsToCoins(commission.commission_amount_cents || 0);
      await clawbackCoins(
        supabaseAdmin,
        commission.model_id,
        coins,
        "affiliate_commission_reversal",
        { ticket_purchase_id: purchase.id, commission_id: commission.id, reason: ctx.reason },
        `ticket_aff:${pi}`,
        false
      );
    }
  }
  return true;
}

async function reverseShopOrder(
  supabaseAdmin: SupabaseClient,
  pi: string,
  ctx: ReversalContext
): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from("shop_orders")
    .select("id, payment_status, affiliate_model_id, affiliate_code, affiliate_commission")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!order) return false;
  if (order.payment_status === "refunded") return true;

  await supabaseAdmin
    .from("shop_orders")
    .update({ payment_status: "refunded", status: "cancelled" })
    .eq("id", order.id);

  const { data: items } = await supabaseAdmin
    .from("shop_order_items")
    .select("variant_id, quantity")
    .eq("order_id", order.id);

  for (const item of items || []) {
    // Stock was reserved at checkout (not at the webhook), so restore it here.
    await supabaseAdmin.rpc("release_stock", {
      p_variant_id: item.variant_id,
      p_quantity: item.quantity,
    });
    // Reverse the total_sold stats counter (needs product_id from the variant).
    const { data: variant } = await supabaseAdmin
      .from("shop_product_variants")
      .select("product_id")
      .eq("id", item.variant_id)
      .maybeSingle();
    if (variant?.product_id) {
      await supabaseAdmin.rpc("increment_total_sold", {
        p_product_id: variant.product_id,
        p_quantity: -item.quantity,
      });
    }
  }

  await supabaseAdmin
    .from("shop_order_items")
    .update({ fulfillment_status: "cancelled" })
    .eq("order_id", order.id);

  // Shop affiliate earnings are held in shop_affiliate_earnings (not credited as
  // coins), so reversal cancels the earning row and rolls back code stats.
  if (order.affiliate_model_id && (order.affiliate_commission ?? 0) > 0) {
    await supabaseAdmin
      .from("shop_affiliate_earnings")
      .update({ status: "cancelled" })
      .eq("order_id", order.id)
      .neq("status", "cancelled");
    if (order.affiliate_code) {
      const { data: code } = await supabaseAdmin
        .from("shop_affiliate_codes")
        .select("order_count, total_earnings")
        .eq("code", order.affiliate_code)
        .maybeSingle();
      if (code) {
        await supabaseAdmin
          .from("shop_affiliate_codes")
          .update({
            order_count: Math.max(0, (code.order_count || 0) - 1),
            total_earnings: Math.max(0, (code.total_earnings || 0) - order.affiliate_commission),
          })
          .eq("code", order.affiliate_code);
      }
    }
  }

  void ctx;
  return true;
}

async function reverseWorkshopRegistration(
  supabaseAdmin: SupabaseClient,
  pi: string,
  ctx: ReversalContext
): Promise<boolean> {
  const { data: reg } = await supabaseAdmin
    .from("workshop_registrations")
    .select("id, status")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!reg) return false;
  if (reg.status === "refunded" || reg.status === "cancelled") return true;

  // status -> refunded fires update_workshop_spots_sold, decrementing spots_sold.
  await supabaseAdmin
    .from("workshop_registrations")
    .update({ status: "refunded" })
    .eq("id", reg.id);

  // Cancel future installments so the cron stops charging the saved card. These
  // are off-session cron charges, not a Stripe subscription, so refunding the
  // first charge does not stop the plan on its own.
  await supabaseAdmin
    .from("workshop_installments")
    .update({ status: "cancelled" })
    .eq("registration_id", reg.id)
    .in("status", ["pending", "processing"]);

  void ctx;
  return true;
}

async function reverseContentProgramPayment(
  supabaseAdmin: SupabaseClient,
  pi: string,
  ctx: ReversalContext
): Promise<boolean> {
  // Content program is a monthly subscription: a refund applies to one month,
  // not the whole enrollment, so only the payment row is reversed (enrollment
  // stays active; cancellation is a separate admin action).
  const { data: payment } = await supabaseAdmin
    .from("content_program_payments")
    .select("id, status")
    .eq("stripe_payment_intent_id", pi)
    .maybeSingle();
  if (!payment) return false;
  if (payment.status === "refunded") return true;

  await supabaseAdmin
    .from("content_program_payments")
    .update({ status: "refunded", credits_toward_swim_week: 0 })
    .eq("id", payment.id);

  void ctx;
  return true;
}

async function reversePaymentIntent(
  supabaseAdmin: SupabaseClient,
  pi: string | null,
  ctx: ReversalContext
): Promise<void> {
  if (!pi) {
    logger.error("Cannot reverse: no payment intent id", { reason: ctx.reason });
    return;
  }

  const handlers = [
    reverseCoinPurchase,
    reverseTicketPurchase,
    reverseShopOrder,
    reverseWorkshopRegistration,
    reverseContentProgramPayment,
  ];

  for (const handler of handlers) {
    try {
      if (await handler(supabaseAdmin, pi, ctx)) {
        logger.info("Reversed payment", { handler: handler.name, pi, reason: ctx.reason });
        return;
      }
    } catch (err) {
      logger.error("Reversal handler threw", err, { handler: handler.name, pi });
    }
  }

  logger.warn("Refund/chargeback for unrecognized payment — needs manual review", {
    pi,
    reason: ctx.reason,
  });
}

export async function handleChargeRefunded(charge: Stripe.Charge, supabaseAdmin: SupabaseClient) {
  const paymentIntentId = getPaymentIntentId(charge);
  if (!paymentIntentId) {
    logger.error("No payment intent on refunded charge", { charge: charge.id });
    return;
  }
  // Auto-reversal assumes a full refund (it claws back the whole purchase).
  // Partial refunds would over-reverse, so route them to manual review.
  if (charge.amount_refunded < charge.amount) {
    logger.warn("Partial refund — needs manual reversal", {
      charge: charge.id,
      pi: paymentIntentId,
      amount: charge.amount,
      amount_refunded: charge.amount_refunded,
    });
    return;
  }
  await reversePaymentIntent(supabaseAdmin, paymentIntentId, { reason: "refund" });
}

export async function handleChargeDisputeCreated(dispute: Stripe.Dispute, supabaseAdmin: SupabaseClient) {
  logger.error("Stripe dispute created - flagging account", {
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
  });

  const disputeChargeId =
    typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as { id?: string } | null)?.id;
  if (!disputeChargeId) return;

  try {
    const disputePI = await getChargePaymentIntentId(disputeChargeId);
    if (!disputePI) return;

    const { data: disputeTx } = await supabaseAdmin
      .from("coin_transactions")
      .select("actor_id")
      .eq("action", "purchase")
      .contains("metadata", { stripe_payment_intent: disputePI })
      .maybeSingle();

    if (disputeTx?.actor_id) {
      await supabaseAdmin.from("fans").update({ is_suspended: true }).eq("id", disputeTx.actor_id);
      logger.info("Account suspended due to dispute", { actor: disputeTx.actor_id, dispute: dispute.id });
    }
  } catch (disputeErr) {
    logger.error("Error flagging account for dispute", disputeErr, { dispute: dispute.id });
  }
}

export async function handleChargeDisputeClosed(dispute: Stripe.Dispute, supabaseAdmin: SupabaseClient) {
  logger.info("Stripe dispute closed", {
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    status: dispute.status,
  });

  const closedChargeId =
    typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as { id?: string } | null)?.id;
  if (!closedChargeId) return;

  if (dispute.status === "won") {
    // Resolved in our favor — unsuspend the fan.
    try {
      const closedPI = await getChargePaymentIntentId(closedChargeId);
      if (!closedPI) return;
      const { data: closedTx } = await supabaseAdmin
        .from("coin_transactions")
        .select("actor_id")
        .eq("action", "purchase")
        .contains("metadata", { stripe_payment_intent: closedPI })
        .maybeSingle();
      if (closedTx?.actor_id) {
        await supabaseAdmin.from("fans").update({ is_suspended: false }).eq("id", closedTx.actor_id);
        logger.info("Account unsuspended after dispute won", { actor: closedTx.actor_id });
      }
    } catch (closedErr) {
      logger.error("Error unsuspending account after dispute", closedErr, { dispute: dispute.id });
    }
  } else if (dispute.status === "lost") {
    // Money is gone — reverse coins/products. The fan stays suspended.
    try {
      const lostPI = await getChargePaymentIntentId(closedChargeId);
      await reversePaymentIntent(supabaseAdmin, lostPI, { reason: "chargeback" });
    } catch (lostErr) {
      logger.error("Error reversing lost dispute", lostErr, { dispute: dispute.id });
    }
  }
}
