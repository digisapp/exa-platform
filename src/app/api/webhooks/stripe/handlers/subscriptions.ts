import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { logger } from "@/lib/logger";

export async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription & Record<string, any>,
  supabaseAdmin: SupabaseClient
) {
  const brandId = subscription.metadata?.brand_id;
  if (!brandId) {
    return;
  }

  const status = subscription.status;
  const tier = subscription.metadata?.tier as BrandTier;
  const periodEnd = (subscription as any).current_period_end;

  await supabaseAdmin
    .from("brands")
    .update({
      subscription_status: status,
      subscription_tier: tier || "free",
      subscription_ends_at: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("id", brandId);
}

export async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription & Record<string, any>,
  supabaseAdmin: SupabaseClient
) {
  const brandId = subscription.metadata?.brand_id;
  if (!brandId) return;

  // When subscription is canceled, pause the account but keep coins
  // Admin can manually reactivate when brand resubscribes
  // Coins are NOT removed - they're held in the account
  await supabaseAdmin
    .from("brands")
    .update({
      subscription_status: "paused",
      // Keep the tier info for reference, but mark as paused
      // is_verified stays as is - admin decides if it should be removed
      stripe_subscription_id: null,
    })
    .eq("id", brandId);
}

export async function grantMonthlyCoins(invoice: Stripe.Invoice, supabaseAdmin: SupabaseClient) {
  const invoiceSubscription = (invoice as any).subscription;
  const subscriptionId = typeof invoiceSubscription === "string"
    ? invoiceSubscription
    : invoiceSubscription?.id;

  if (!subscriptionId) return;

  // Get subscription to find tier info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const brandId = subscription.metadata?.brand_id;
  const actorId = subscription.metadata?.actor_id;
  const tier = subscription.metadata?.tier as BrandTier;

  if (!brandId || !actorId || !tier) {
    logger.error("Missing metadata for coin grant", undefined, { brandId, actorId, tier });
    return;
  }

  const tierConfig = BRAND_SUBSCRIPTION_TIERS[tier];
  if (!tierConfig || tierConfig.monthlyCoins <= 0) return;

  // IDEMPOTENCY CHECK: Prevent duplicate coin grants from webhook retries
  const { data: existingRenewal } = await supabaseAdmin
    .from("coin_transactions")
    .select("id")
    .eq("actor_id", actorId)
    .eq("action", "subscription_renewal")
    .contains("metadata", { invoice_id: invoice.id })
    .maybeSingle();

  if (existingRenewal) {
    logger.info("Duplicate webhook ignored - renewal coins already granted for invoice", { invoiceId: invoice.id });
    return;
  }

  // Grant monthly coins
  const { error } = await supabaseAdmin.rpc("add_coins", {
    p_actor_id: actorId,
    p_amount: tierConfig.monthlyCoins,
    p_action: "subscription_renewal",
    p_metadata: {
      tier,
      invoice_id: invoice.id,
      stripe_subscription_id: subscriptionId,
    },
  });

  if (error) {
    logger.error("Error granting renewal coins", error);
  } else {
    // Set idempotency_key for DB-level duplicate prevention
    await supabaseAdmin
      .from("coin_transactions")
      .update({ idempotency_key: `renewal_${invoice.id}` })
      .eq("actor_id", actorId)
      .eq("action", "subscription_renewal")
      .contains("metadata", { invoice_id: invoice.id });
  }

  // Update coins_granted_at
  await supabaseAdmin
    .from("brands")
    .update({ coins_granted_at: new Date().toISOString() })
    .eq("id", brandId);
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, supabaseAdmin: SupabaseClient) {
  logger.error("Invoice payment failed", undefined, { invoiceId: invoice.id });
  // Update subscription status to past_due
  const failedSubId = (invoice as any).subscription;
  if (failedSubId) {
    const subscriptionId = typeof failedSubId === "string"
      ? failedSubId
      : failedSubId.id;
    await supabaseAdmin
      .from("brands")
      .update({ subscription_status: "past_due" })
      .eq("stripe_subscription_id", subscriptionId);
  }
}
