import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { BrandTier } from "@/lib/stripe-config";
import { TICKET_CONFIG } from "@/lib/ticket-config";
import { sendTicketPurchaseConfirmationEmail } from "@/lib/email";

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  supabaseAdmin: SupabaseClient
): Promise<{ error?: string; status?: number; duplicate?: boolean } | void> {
  // Check if this is a subscription checkout
  if (session.mode === "subscription") {
    // Check if it's a content program subscription
    if (session.metadata?.type === "content_program_subscription") {
      await handleContentProgramSubscription(session, supabaseAdmin);
      return;
    }
    // Otherwise handle as brand subscription
    await handleSubscriptionCheckout(session, supabaseAdmin);
    return;
  }

  // Check if this is a trip application payment
  if (session.metadata?.type === "trip_application") {
    await handleTripPayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a Creator House payment
  if (session.metadata?.type === "creator_house_payment") {
    await handleCreatorHousePayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a ticket purchase
  if (session.metadata?.type === "ticket_purchase") {
    await handleTicketPurchase(session, supabaseAdmin);
    return;
  }

  // Check if this is a workshop registration
  if (session.metadata?.type === "workshop_registration") {
    // Import dynamically to avoid circular deps — workshop handler is separate
    const { handleWorkshopRegistration } = await import("./workshops");
    await handleWorkshopRegistration(session, supabaseAdmin);
    return;
  }

  // Check if this is an academy enrollment
  if (session.metadata?.type === "academy_enrollment") {
    const { handleAcademyEnrollment } = await import("./academy");
    await handleAcademyEnrollment(session, supabaseAdmin);
    return;
  }

  // Check if this is a content program payment
  if (session.metadata?.type === "content_program") {
    await handleContentProgramPayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a Miami Digitals booking
  if (session.metadata?.type === "miami_digitals") {
    await handleMiamiDigitalsPayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a model onboarding booking (Runway Workshop + Swimwear Digitals)
  if (session.metadata?.type === "model_onboarding") {
    await handleModelOnboardingPayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a comp card print order
  if (session.metadata?.type === "comp_card_print") {
    await handleCompCardPrintPayment(session, supabaseAdmin);
    return;
  }

  // Check if this is a SwimCrown entry
  if (session.metadata?.type === "swimcrown_entry") {
    await handleSwimCrownEntry(session, supabaseAdmin);
    return;
  }

  // Check if this is a shop order
  if (session.metadata?.order_id) {
    await handleShopOrderPayment(session, supabaseAdmin);
    return;
  }

  // Handle regular coin purchase
  const actorId = session.metadata?.actor_id;
  const coinsStr = session.metadata?.coins;

  if (!actorId || !coinsStr) {
    console.error("Missing metadata in checkout session:", session.id, { actorId, coinsStr });
    return { error: "Missing required metadata", status: 400 };
  }

  const coins = parseInt(coinsStr, 10);
  if (isNaN(coins) || coins <= 0) {
    console.error("Invalid coins value in checkout session:", session.id, { coinsStr, coins });
    return { error: "Invalid coins value", status: 400 };
  }

  // IDEMPOTENCY CHECK: Prevent duplicate coin credits from webhook retries
  const { data: existingTransaction } = await supabaseAdmin
    .from("coin_transactions")
    .select("id")
    .eq("actor_id", actorId)
    .eq("action", "purchase")
    .contains("metadata", { stripe_session_id: session.id })
    .maybeSingle();

  if (existingTransaction) {
    console.log("Duplicate webhook ignored - coins already credited for session:", session.id);
    return { duplicate: true };
  }

  const { error: creditError } = await supabaseAdmin.rpc("add_coins", {
    p_actor_id: actorId,
    p_amount: coins,
    p_action: "purchase",
    p_metadata: {
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      amount_paid: session.amount_total,
      currency: session.currency,
    },
  });

  // Set idempotency_key on the transaction for DB-level duplicate prevention
  if (!creditError) {
    await supabaseAdmin
      .from("coin_transactions")
      .update({ idempotency_key: session.id })
      .eq("actor_id", actorId)
      .eq("action", "purchase")
      .contains("metadata", { stripe_session_id: session.id });
  }

  if (creditError) {
    console.error("Error crediting coins:", creditError);
    return { error: "Failed to credit coins", status: 500 };
  }
}

async function handleSubscriptionCheckout(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
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
    // IDEMPOTENCY CHECK: Prevent duplicate coin grants from webhook retries
    const { data: existingGrant } = await supabaseAdmin
      .from("coin_transactions")
      .select("id")
      .eq("actor_id", actorId)
      .eq("action", "subscription_grant")
      .contains("metadata", { stripe_subscription_id: subscriptionId })
      .maybeSingle();

    if (existingGrant) {
      console.log("Duplicate webhook ignored - subscription coins already granted for:", subscriptionId);
      return;
    }

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
    } else {
      // Set idempotency_key for DB-level duplicate prevention
      await supabaseAdmin
        .from("coin_transactions")
        .update({ idempotency_key: `sub_${subscriptionId}` })
        .eq("actor_id", actorId)
        .eq("action", "subscription_grant")
        .contains("metadata", { stripe_subscription_id: subscriptionId });
    }
  }
}

async function handleTripPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
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

  // Atomically increment spots_filled using RPC (prevents race conditions)
  const { error: rpcError } = await supabaseAdmin.rpc("increment_gig_spots_filled", { gig_id: gigId });
  if (rpcError) {
    console.error("Error incrementing gig spots_filled:", rpcError);
  }
}

async function handleCreatorHousePayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const applicationId = session.metadata?.application_id;
  const gigId = session.metadata?.gig_id;
  const modelId = session.metadata?.model_id;

  if (!applicationId || !gigId || !modelId) {
    console.error("Missing Creator House payment metadata:", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  // Update the gig application with payment success
  const { error } = await supabaseAdmin
    .from("gig_applications")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      amount_paid: session.amount_total,
    })
    .eq("id", applicationId);

  if (error) {
    console.error("Error updating Creator House payment:", error);
    return;
  }

}

async function handleTicketPurchase(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
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
      totalPriceCents,
      supabaseAdmin
    );
  }

  // Send purchase confirmation email (non-blocking)
  if (buyerEmail) {
    const buyerName = session.metadata?.buyer_name || "there";
    // Fetch event and tier names for the email
    const { data: tierInfo } = await supabaseAdmin
      .from("ticket_tiers")
      .select("name, events(name)")
      .eq("id", tierId)
      .single() as { data: { name: string; events: { name: string } | null } | null };

    sendTicketPurchaseConfirmationEmail({
      to: buyerEmail,
      buyerName,
      eventName: (tierInfo?.events as any)?.name || "EXA Event",
      tierName: tierInfo?.name || "General Admission",
      quantity,
      totalPriceCents,
    }).catch((err) => console.error("Failed to send ticket confirmation email:", err));
  }

}

export async function processAffiliateCommission(
  modelId: string,
  eventId: string,
  clickId: string | null,
  purchaseId: string,
  saleCents: number,
  supabaseAdmin: SupabaseClient
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

  // Create commission record with 14-day hold (matches shop affiliate behavior)
  const availableAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
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
      status: "pending",
      available_at: availableAt,
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

}

async function handleContentProgramPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const brandName = session.metadata?.brand_name;
  const contactName = session.metadata?.contact_name;
  const email = session.metadata?.email;

  if (!brandName || !email) {
    console.error("Missing content program payment metadata:", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  // Update enrollment to active
  const { error: updateError } = await supabaseAdmin
    .from("content_program_enrollments")
    .update({
      status: "active",
      stripe_payment_intent_id: paymentIntentId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);

  if (updateError) {
    console.error("Error updating content program enrollment:", updateError);
    // Try to create the enrollment if it doesn't exist
    const { error: insertError } = await supabaseAdmin
      .from("content_program_enrollments")
      .insert({
        brand_name: brandName,
        contact_email: email,
        contact_name: contactName || null,
        phone: session.metadata?.phone || null,
        website_url: session.metadata?.website_url || null,
        instagram_handle: session.metadata?.instagram_handle || null,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        start_date: new Date().toISOString().split("T")[0],
        commitment_months: 3,
        monthly_rate: 500.00,
        swim_week_package_cost: 3000.00,
        swim_week_target_date: "2026-05-26",
        status: "active",
        paid_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error creating content program enrollment:", insertError);
      return;
    }
  }

}

async function handleContentProgramSubscription(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const brandName = session.metadata?.brand_name;
  const contactName = session.metadata?.contact_name;
  const email = session.metadata?.email;

  if (!brandName || !email) {
    console.error("Missing content program subscription metadata:", session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id;

  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id;

  // Update enrollment to active with subscription info
  const { error: updateError } = await supabaseAdmin
    .from("content_program_enrollments")
    .update({
      status: "active",
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_checkout_session_id", session.id);

  if (updateError) {
    console.error("Error updating content program enrollment:", updateError);
    // Try to create the enrollment if it doesn't exist
    const { error: insertError } = await supabaseAdmin
      .from("content_program_enrollments")
      .insert({
        brand_name: brandName,
        contact_email: email,
        contact_name: contactName || null,
        phone: session.metadata?.phone || null,
        website_url: session.metadata?.website_url || null,
        instagram_handle: session.metadata?.instagram_handle || null,
        stripe_checkout_session_id: session.id,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        start_date: new Date().toISOString().split("T")[0],
        monthly_rate: 500.00,
        swim_week_package_cost: 3000.00,
        swim_week_target_date: "2026-05-26",
        status: "active",
        paid_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error creating content program enrollment:", insertError);
      return;
    }
  }

}

async function handleMiamiDigitalsPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const stripeSessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  // Update booking to paid (guard on status for idempotency)
  const { error: updateError } = await (supabaseAdmin as any)
    .from("miami_digitals_bookings")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", stripeSessionId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Error updating Miami Digitals booking:", updateError);
  }
}

async function handleModelOnboardingPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const stripeSessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  const { error: updateError } = await (supabaseAdmin as any)
    .from("model_onboarding_bookings")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId || null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_session_id", stripeSessionId)
    .eq("status", "pending");

  if (updateError) {
    console.error("Error updating model onboarding booking:", updateError);
  }
}

async function handleCompCardPrintPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const orderId = session.metadata?.order_id;

  if (!orderId) {
    console.error("Missing comp card print order metadata:", session.id);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  // Update order to paid (guard on status for idempotency)
  const { error: updateError } = await (supabaseAdmin as any)
    .from("comp_card_print_orders")
    .update({
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .eq("status", "pending_payment");

  if (updateError) {
    console.error("Error updating comp card print order:", updateError);
    return;
  }

  // Send order confirmation email
  try {
    const { data: order } = await (supabaseAdmin as any)
      .from("comp_card_print_orders")
      .select("email, first_name, quantity, amount_cents")
      .eq("id", orderId)
      .single();

    if (order?.email) {
      const { sendPrintOrderConfirmationEmail } = await import("@/lib/email");
      await sendPrintOrderConfirmationEmail({
        to: order.email,
        firstName: order.first_name || "there",
        quantity: order.quantity,
        amountCents: order.amount_cents,
      });
    }
  } catch (emailError) {
    console.error("Failed to send print order confirmation email:", emailError);
  }
}

async function handleSwimCrownEntry(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const modelId = session.metadata?.model_id;
  const competitionId = session.metadata?.competition_id;
  const tier = session.metadata?.tier;

  if (!modelId || !competitionId || !tier) {
    console.error("Missing SwimCrown entry metadata:", session.id);
    return;
  }

  // Update contestant payment status to paid and auto-approve
  const { error: updateError } = await (supabaseAdmin as any)
    .from("swimcrown_contestants")
    .update({
      payment_status: "paid",
      status: "approved",
      stripe_session_id: session.id,
    })
    .eq("competition_id", competitionId)
    .eq("model_id", modelId);

  if (updateError) {
    console.error("Error updating SwimCrown contestant:", updateError);
  }
}

async function handleShopOrderPayment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const orderId = session.metadata?.order_id;
  const affiliateModelId = session.metadata?.affiliate_model_id;
  const affiliateCode = session.metadata?.affiliate_code;

  if (!orderId) {
    console.error("Missing shop order metadata:", session.id);
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  const chargeId = session.payment_intent
    ? (await stripe.paymentIntents.retrieve(
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id
      )).latest_charge
    : null;

  // Update order to paid
  const { data: order, error: updateError } = await supabaseAdmin
    .from("shop_orders")
    .update({
      payment_status: "paid",
      status: "confirmed",
      stripe_payment_intent_id: paymentIntentId,
      stripe_charge_id: typeof chargeId === "string" ? chargeId : chargeId?.toString(),
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId)
    .select("id, total, affiliate_model_id, affiliate_commission")
    .single();

  if (updateError) {
    console.error("Error updating shop order:", updateError);
    return;
  }

  // Update order items to confirmed
  await supabaseAdmin
    .from("shop_order_items")
    .update({ fulfillment_status: "confirmed" })
    .eq("order_id", orderId);

  // Stock was already reserved atomically at checkout time via reserve_stock()
  // Increment total_sold counters on the products using atomic RPC
  const { data: orderItems } = await supabaseAdmin
    .from("shop_order_items")
    .select("variant_id, quantity")
    .eq("order_id", orderId);

  if (orderItems) {
    for (const item of orderItems) {
      try {
        // Look up the product_id for this variant
        const { data: variantData, error: variantError } = await supabaseAdmin
          .from("shop_product_variants")
          .select("product_id")
          .eq("id", item.variant_id)
          .single();

        if (variantError) {
          console.error("Error fetching variant for total_sold update:", variantError, { variant_id: item.variant_id });
          continue;
        }

        if (variantData?.product_id) {
          // Use atomic RPC to increment total_sold, avoiding read-then-write race conditions
          const { error: rpcError } = await supabaseAdmin.rpc("increment_total_sold", {
            p_product_id: variantData.product_id,
            p_quantity: item.quantity,
          });

          if (rpcError) {
            console.error("Error updating total_sold via RPC:", rpcError, { product_id: variantData.product_id });
          }
        }
      } catch (err) {
        console.error("Unexpected error updating total_sold for variant:", item.variant_id, err);
      }
    }
  }

  // Process affiliate commission if applicable
  const modelId = order?.affiliate_model_id || affiliateModelId;
  if (modelId && order?.affiliate_commission && order.affiliate_commission > 0) {
    // Create affiliate earning record
    const { error: earningError } = await supabaseAdmin
      .from("shop_affiliate_earnings")
      .insert({
        model_id: modelId,
        order_id: orderId,
        order_total: order.total,
        commission_rate: order.total > 0 ? Math.round((order.affiliate_commission / order.total) * 100) : 10,
        commission_amount: order.affiliate_commission,
        status: "confirmed", // Hold period handled by available_at
        available_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 day hold
      });

    if (earningError) {
      console.error("Error creating affiliate earning:", earningError);
    }

    // Update affiliate code stats
    if (affiliateCode) {
      const { data: codeData } = await supabaseAdmin
        .from("shop_affiliate_codes")
        .select("order_count, total_earnings")
        .eq("code", affiliateCode)
        .single();

      if (codeData) {
        await supabaseAdmin
          .from("shop_affiliate_codes")
          .update({
            order_count: (codeData.order_count || 0) + 1,
            total_earnings: (codeData.total_earnings || 0) + order.affiliate_commission,
          })
          .eq("code", affiliateCode);
      }
    }
  }

  // Clear the user's cart
  const userId = session.metadata?.user_id;
  if (userId) {
    await supabaseAdmin
      .from("shop_carts")
      .delete()
      .eq("user_id", userId);
  }

}
