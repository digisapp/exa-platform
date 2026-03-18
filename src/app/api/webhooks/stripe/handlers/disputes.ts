import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";

export async function handleChargeRefunded(charge: Stripe.Charge, supabaseAdmin: SupabaseClient) {
  const paymentIntentId = typeof charge.payment_intent === "string"
    ? charge.payment_intent
    : (charge.payment_intent as any)?.id;

  if (!paymentIntentId) {
    console.error("No payment intent on refunded charge:", charge.id);
    return;
  }

  // Find coin purchase transaction linked to this payment intent
  const { data: transaction } = await supabaseAdmin
    .from("coin_transactions")
    .select("id, actor_id, amount, action")
    .eq("action", "purchase")
    .contains("metadata", { stripe_payment_intent: paymentIntentId })
    .maybeSingle();

  if (!transaction) {
    // Not a coin purchase (ticket, shop, subscription, etc.) — log for awareness
    console.log("Refund received for non-coin payment:", paymentIntentId, "charge:", charge.id);
    return;
  }

  // IDEMPOTENCY: check if refund was already processed
  const { data: existingRefund } = await supabaseAdmin
    .from("coin_transactions")
    .select("id")
    .eq("actor_id", transaction.actor_id)
    .eq("action", "refund")
    .contains("metadata", { stripe_charge_id: charge.id })
    .maybeSingle();

  if (existingRefund) {
    console.log("Duplicate refund webhook ignored for charge:", charge.id);
    return;
  }

  // Deduct coins — DB CHECK constraint prevents balance going below 0
  const { error } = await supabaseAdmin.rpc("add_coins", {
    p_actor_id: transaction.actor_id,
    p_amount: -transaction.amount,
    p_action: "refund",
    p_metadata: {
      original_transaction_id: transaction.id,
      stripe_charge_id: charge.id,
      stripe_payment_intent: paymentIntentId,
      refund_reason: (charge as any).refunds?.data?.[0]?.reason || "requested_by_customer",
    },
  });

  if (error) {
    console.error("Failed to deduct coins for refund (balance may be insufficient):", {
      error,
      actor_id: transaction.actor_id,
      amount: transaction.amount,
      charge_id: charge.id,
    });
    return;
  }

  console.log("Coins deducted for refund:", transaction.amount, "actor:", transaction.actor_id, "charge:", charge.id);
}

export async function handleChargeDisputeCreated(dispute: Stripe.Dispute, supabaseAdmin: SupabaseClient) {
  console.error("Stripe dispute created - flagging account:", {
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    amount: dispute.amount,
    reason: dispute.reason,
    status: dispute.status,
  });

  // Find the actor who made this payment and flag their account
  const disputeChargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id;
  if (disputeChargeId) {
    // Look up the payment intent from the charge
    try {
      const disputeCharge = await stripe.charges.retrieve(disputeChargeId);
      const disputePI = typeof disputeCharge.payment_intent === "string"
        ? disputeCharge.payment_intent
        : (disputeCharge.payment_intent as any)?.id;

      if (disputePI) {
        // Find coin transaction linked to this payment
        const { data: disputeTx } = await supabaseAdmin
          .from("coin_transactions")
          .select("actor_id")
          .eq("action", "purchase")
          .contains("metadata", { stripe_payment_intent: disputePI })
          .maybeSingle();

        if (disputeTx?.actor_id) {
          // Flag the fan account as disputed
          await supabaseAdmin
            .from("fans")
            .update({ is_suspended: true })
            .eq("id", disputeTx.actor_id);

          console.log("Account flagged/suspended due to dispute:", disputeTx.actor_id, "dispute:", dispute.id);
        }
      }
    } catch (disputeErr) {
      console.error("Error flagging account for dispute:", disputeErr);
    }
  }
}

export async function handleChargeDisputeClosed(dispute: Stripe.Dispute, supabaseAdmin: SupabaseClient) {
  console.log("Stripe dispute closed:", {
    dispute_id: dispute.id,
    charge_id: dispute.charge,
    status: dispute.status,
  });

  // If dispute was lost or won, update account accordingly
  if (dispute.status === "won") {
    // Dispute resolved in our favor — unsuspend the account
    const closedChargeId = typeof dispute.charge === "string" ? dispute.charge : (dispute.charge as any)?.id;
    if (closedChargeId) {
      try {
        const closedCharge = await stripe.charges.retrieve(closedChargeId);
        const closedPI = typeof closedCharge.payment_intent === "string"
          ? closedCharge.payment_intent
          : (closedCharge.payment_intent as any)?.id;

        if (closedPI) {
          const { data: closedTx } = await supabaseAdmin
            .from("coin_transactions")
            .select("actor_id")
            .eq("action", "purchase")
            .contains("metadata", { stripe_payment_intent: closedPI })
            .maybeSingle();

          if (closedTx?.actor_id) {
            await supabaseAdmin
              .from("fans")
              .update({ is_suspended: false })
              .eq("id", closedTx.actor_id);

            console.log("Account unsuspended after dispute won:", closedTx.actor_id);
          }
        }
      } catch (closedErr) {
        console.error("Error unsuspending account after dispute:", closedErr);
      }
    }
  }
}
