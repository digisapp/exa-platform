import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { TICKET_CONFIG } from "@/lib/ticket-config";

// Create admin client for webhook (no auth context)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // Check if this is a subscription checkout
        if (session.mode === "subscription") {
          await handleSubscriptionCheckout(session);
          break;
        }

        // Check if this is a trip application payment
        if (session.metadata?.type === "trip_application") {
          await handleTripPayment(session);
          break;
        }

        // Check if this is a ticket purchase
        if (session.metadata?.type === "ticket_purchase") {
          await handleTicketPurchase(session);
          break;
        }

        // Handle regular coin purchase
        const actorId = session.metadata?.actor_id;
        const coinsStr = session.metadata?.coins;
        const userId = session.metadata?.user_id;

        if (!actorId || !coinsStr) {
          console.error("Missing metadata in checkout session:", session.id, { actorId, coinsStr });
          return NextResponse.json({ error: "Missing required metadata" }, { status: 400 });
        }

        const coins = parseInt(coinsStr, 10);
        if (isNaN(coins) || coins <= 0) {
          console.error("Invalid coins value in checkout session:", session.id, { coinsStr, coins });
          return NextResponse.json({ error: "Invalid coins value" }, { status: 400 });
        }

        const { error: creditError } = await supabaseAdmin.rpc("add_coins", {
          p_actor_id: actorId,
          p_amount: coins,
          p_action: "purchase",
          p_metadata: {
            stripe_session_id: session.id,
            stripe_payment_intent: session.payment_intent,
            amount_paid: session.amount_total,
            currency: session.currency,
          },
        });

        if (creditError) {
          console.error("Error crediting coins:", creditError);
          return NextResponse.json({ error: "Failed to credit coins" }, { status: 500 });
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        // Grant monthly coins on successful invoice payment (renewal)
        const subscriptionId = (invoice as any).subscription;
        if (subscriptionId && invoice.billing_reason === "subscription_cycle") {
          await grantMonthlyCoins(invoice);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.error("Invoice payment failed:", invoice.id);
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
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error("Payment failed:", paymentIntent.id, paymentIntent.last_payment_error?.message);
        break;
      }

      default:
        // Unhandled event type
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const brandId = session.metadata?.brand_id;
  const actorId = session.metadata?.actor_id;
  const tier = session.metadata?.tier as BrandTier;
  const billingCycle = session.metadata?.billing_cycle;
  const monthlyCoins = parseInt(session.metadata?.monthly_coins || "0", 10);

  if (!brandId || !tier) {
    console.error("Missing brand subscription metadata:", session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  // Update brand with subscription info
  const { error: updateError } = await supabaseAdmin
    .from("brands")
    .update({
      subscription_tier: tier,
      subscription_status: "active",
      stripe_subscription_id: subscriptionId,
      billing_cycle: billingCycle,
      is_verified: tier === "pro" || tier === "enterprise", // Pro+ get verified badge
      coins_granted_at: new Date().toISOString(),
    })
    .eq("id", brandId);

  if (updateError) {
    console.error("Error updating brand subscription:", updateError);
    return;
  }

  // Grant initial coins
  if (monthlyCoins > 0 && actorId) {
    const { error: coinError } = await supabaseAdmin.rpc("add_coins", {
      p_actor_id: actorId,
      p_amount: monthlyCoins,
      p_action: "subscription_grant",
      p_metadata: {
        tier,
        billing_cycle: billingCycle,
        stripe_subscription_id: subscriptionId,
      },
    });

    if (coinError) {
      console.error("Error granting subscription coins:", coinError);
    }
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
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

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
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

async function grantMonthlyCoins(invoice: Stripe.Invoice) {
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
    console.error("Missing metadata for coin grant:", { brandId, actorId, tier });
    return;
  }

  const tierConfig = BRAND_SUBSCRIPTION_TIERS[tier];
  if (!tierConfig || tierConfig.monthlyCoins <= 0) return;

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
    console.error("Error granting renewal coins:", error);
  }

  // Update coins_granted_at
  await supabaseAdmin
    .from("brands")
    .update({ coins_granted_at: new Date().toISOString() })
    .eq("id", brandId);
}

async function handleTripPayment(session: Stripe.Checkout.Session) {
  const gigId = session.metadata?.gig_id;
  const modelId = session.metadata?.model_id;
  const tripNumber = session.metadata?.trip_number;

  if (!gigId || !modelId || !tripNumber) {
    console.error("Missing trip payment metadata:", session.id);
    return;
  }

  // Update the gig application with payment success
  const { error } = await supabaseAdmin
    .from("gig_applications")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
      amount_paid: session.amount_total,
      status: "approved", // Auto-approve paid spots
    })
    .eq("gig_id", gigId)
    .eq("model_id", modelId);

  if (error) {
    console.error("Error updating trip payment:", error);
    return;
  }

  // Update spots_filled count on the gig
  const { data: gig } = await supabaseAdmin
    .from("gigs")
    .select("spots_filled")
    .eq("id", gigId)
    .single();

  if (gig) {
    await supabaseAdmin
      .from("gigs")
      .update({ spots_filled: (gig.spots_filled || 0) + 1 })
      .eq("id", gigId);
  }

  console.log("Trip payment successful:", { gigId, modelId, tripNumber });
}

async function handleTicketPurchase(session: Stripe.Checkout.Session) {
  const eventId = session.metadata?.event_id;
  const tierId = session.metadata?.tier_id;
  const quantity = parseInt(session.metadata?.quantity || "1", 10);
  const buyerEmail = session.metadata?.buyer_email;
  const affiliateModelId = session.metadata?.affiliate_model_id || null;
  const affiliateClickId = session.metadata?.affiliate_click_id || null;

  if (!eventId || !tierId || !buyerEmail) {
    console.error("Missing ticket purchase metadata:", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  // Update ticket purchase to completed
  const { data: purchase, error: updateError } = await supabaseAdmin
    .from("ticket_purchases")
    .update({
      status: "completed",
      stripe_payment_intent_id: paymentIntentId,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id)
    .select("id, total_price_cents, affiliate_model_id")
    .single();

  if (updateError) {
    console.error("Error updating ticket purchase:", updateError);
    // Try to create the purchase if it doesn't exist
    const { error: insertError } = await supabaseAdmin
      .from("ticket_purchases")
      .insert({
        ticket_tier_id: tierId,
        event_id: eventId,
        buyer_email: buyerEmail,
        buyer_name: session.metadata?.buyer_name || null,
        buyer_phone: session.metadata?.buyer_phone || null,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        quantity: quantity,
        unit_price_cents: Math.round((session.amount_total || 0) / quantity),
        total_price_cents: session.amount_total || 0,
        affiliate_model_id: affiliateModelId || null,
        affiliate_click_id: affiliateClickId || null,
        status: "completed",
        completed_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error creating ticket purchase:", insertError);
      return;
    }
  }

  const totalPriceCents = purchase?.total_price_cents || session.amount_total || 0;
  const modelId = purchase?.affiliate_model_id || affiliateModelId;

  // Handle affiliate commission if there's a referring model
  if (modelId) {
    await processAffiliateCommission(
      modelId,
      eventId,
      affiliateClickId,
      purchase?.id || session.id,
      totalPriceCents
    );
  }

  console.log("Ticket purchase successful:", { eventId, tierId, quantity, buyerEmail });
}

async function processAffiliateCommission(
  modelId: string,
  eventId: string,
  clickId: string | null,
  purchaseId: string,
  saleCents: number
) {
  // Calculate commission (20%)
  const commissionRate = TICKET_CONFIG.COMMISSION_RATE;
  const commissionCents = Math.round(saleCents * commissionRate);

  if (commissionCents <= 0) return;

  // Verify model exists (models.id = actors.id due to FK constraint)
  const { data: model } = await supabaseAdmin
    .from("models")
    .select("id")
    .eq("id", modelId)
    .single();

  if (!model?.id) {
    console.error("Model not found for commission:", modelId);
    return;
  }

  // models.id references actors.id, so modelId IS the actor ID
  const actorId = modelId;

  // Create commission record
  const { data: commission, error: commissionError } = await supabaseAdmin
    .from("affiliate_commissions")
    .insert({
      model_id: modelId,
      event_id: eventId,
      click_id: clickId,
      order_id: purchaseId,
      sale_amount_cents: saleCents,
      commission_rate: commissionRate,
      commission_amount_cents: commissionCents,
      status: "confirmed", // Instant - no pending state
    })
    .select("id")
    .single();

  if (commissionError) {
    console.error("Error creating commission record:", commissionError);
    return;
  }

  // Credit coins to model (1 coin = 1 cent)
  const coinsToCredit = commissionCents;

  const { error: coinError } = await supabaseAdmin.rpc("add_coins", {
    p_actor_id: actorId,
    p_amount: coinsToCredit,
    p_action: "affiliate_commission",
    p_metadata: {
      event_id: eventId,
      purchase_id: purchaseId,
      sale_amount_cents: saleCents,
      commission_rate: commissionRate,
      commission_cents: commissionCents,
      commission_id: commission?.id,
    },
  });

  if (coinError) {
    console.error("Error crediting affiliate coins:", coinError);
    return;
  }

  // Update purchase with commission ID
  await supabaseAdmin
    .from("ticket_purchases")
    .update({ affiliate_commission_id: commission?.id })
    .eq("id", purchaseId);

  console.log("Affiliate commission processed:", {
    modelId,
    coinsToCredit,
    commissionCents,
    saleCents,
  });
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
