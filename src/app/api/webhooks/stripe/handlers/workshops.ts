import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWorkshopRegistrationConfirmationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function handleWorkshopRegistration(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const workshopId = session.metadata?.workshop_id;
  const quantity = parseInt(session.metadata?.quantity || "1", 10);
  const buyerEmail = session.metadata?.buyer_email;
  const buyerName = session.metadata?.buyer_name;
  const paymentType = session.metadata?.payment_type || "full";
  const isInstallment = paymentType === "installment";

  if (!workshopId || !buyerEmail) {
    logger.error("Missing workshop registration metadata", undefined, { sessionId: session.id });
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  // Get Stripe customer ID for installment plans (needed for future charges)
  // Primary: session.customer (set when checkout used customer: id)
  // Fallback: metadata.stripe_customer_id (stored during checkout creation)
  let stripeCustomerId: string | null = null;
  if (isInstallment) {
    if (session.customer) {
      stripeCustomerId = typeof session.customer === "string"
        ? session.customer
        : session.customer.id;
    } else if (session.metadata?.stripe_customer_id) {
      stripeCustomerId = session.metadata.stripe_customer_id;
    }
  }

  // Update workshop registration to completed
  const updateData: Record<string, any> = {
    status: "completed",
    stripe_payment_intent_id: paymentIntentId,
    completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isInstallment) {
    updateData.stripe_customer_id = stripeCustomerId;
    updateData.installments_paid = 1;
    updateData.payment_type = "installment";
    updateData.installments_total = 3;
  }

  const { data: registration, error: updateError } = await supabaseAdmin
    .from("workshop_registrations")
    .update(updateData)
    .eq("stripe_checkout_session_id", session.id)
    .select("id")
    .single();

  if (updateError) {
    logger.error("Error updating workshop registration", updateError);
    // Try to create the registration if it doesn't exist
    const installmentAmountCents = 12500;
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("workshop_registrations")
      .insert({
        workshop_id: workshopId,
        buyer_email: buyerEmail,
        buyer_name: buyerName || null,
        buyer_phone: session.metadata?.buyer_phone || null,
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
        quantity: quantity,
        unit_price_cents: isInstallment
          ? installmentAmountCents
          : Math.round((session.amount_total || 0) / quantity),
        total_price_cents: isInstallment ? 37500 : (session.amount_total || 0),
        status: "completed",
        completed_at: new Date().toISOString(),
        payment_type: paymentType,
        stripe_customer_id: stripeCustomerId,
        installments_total: isInstallment ? 3 : 1,
        installments_paid: isInstallment ? 1 : 0,
      })
      .select("id")
      .single();

    if (insertError) {
      logger.error("Error creating workshop registration", insertError);
      return;
    }

    // Create installment records for newly inserted registration
    if (isInstallment && inserted?.id) {
      await createInstallmentRecords(inserted.id, paymentIntentId ?? null, supabaseAdmin);
    }
    return;
  }

  // Create installment records for existing registration
  if (isInstallment && registration?.id) {
    await createInstallmentRecords(registration.id, paymentIntentId ?? null, supabaseAdmin);
  }

  // Send workshop confirmation email (non-blocking)
  if (buyerEmail) {
    const { data: workshop } = await supabaseAdmin
      .from("workshops")
      .select("title, date, start_time, end_time, location_city, location_state, location_address, what_to_bring")
      .eq("id", workshopId)
      .single() as { data: any };

    if (workshop) {
      const workshopDateObj = new Date(workshop.date);
      const dateFormatted = workshopDateObj.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      const timeFormatted = workshop.start_time && workshop.end_time
        ? `${workshop.start_time} - ${workshop.end_time}`
        : workshop.start_time || "TBA";

      const locationParts = [
        workshop.location_address,
        workshop.location_city && workshop.location_state
          ? `${workshop.location_city}, ${workshop.location_state}`
          : workshop.location_city || workshop.location_state,
      ].filter(Boolean);
      const locationFormatted = locationParts.length > 0 ? locationParts.join(", ") : "TBA";

      const totalCents = isInstallment ? 37500 : (session.amount_total || 0);

      sendWorkshopRegistrationConfirmationEmail({
        to: buyerEmail,
        buyerName: buyerName || "there",
        workshopTitle: workshop.title,
        workshopDate: dateFormatted,
        workshopTime: timeFormatted,
        workshopLocation: locationFormatted,
        paymentType: isInstallment ? "installment" : "full",
        totalPriceCents: totalCents,
        whatToBring: workshop.what_to_bring || undefined,
      }).catch((err) => logger.error("Failed to send workshop confirmation email", err));
    }
  }
}

export async function createInstallmentRecords(
  registrationId: string,
  firstPaymentIntentId: string | null,
  supabaseAdmin: SupabaseClient
) {
  const installmentAmountCents = 12500;
  const now = new Date();
  const dueDates = [
    now.toISOString().split("T")[0], // Today (already paid)
    new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +30 days
    new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // +60 days
  ];

  const installments = [
    {
      registration_id: registrationId,
      installment_number: 1,
      amount_cents: installmentAmountCents,
      status: "completed",
      due_date: dueDates[0],
      stripe_payment_intent_id: firstPaymentIntentId,
      paid_at: now.toISOString(),
    },
    {
      registration_id: registrationId,
      installment_number: 2,
      amount_cents: installmentAmountCents,
      status: "pending",
      due_date: dueDates[1],
    },
    {
      registration_id: registrationId,
      installment_number: 3,
      amount_cents: installmentAmountCents,
      status: "pending",
      due_date: dueDates[2],
    },
  ];

  // workshop_installments is a new table not yet in generated types
  const { error } = await (supabaseAdmin as any)
    .from("workshop_installments")
    .insert(installments);

  if (error) {
    logger.error("Error creating installment records", error);
  }
}

export async function handleWorkshopInstallmentSuccess(
  paymentIntent: Stripe.PaymentIntent,
  supabaseAdmin: SupabaseClient
) {
  const installmentId = paymentIntent.metadata?.installment_id;
  const registrationId = paymentIntent.metadata?.registration_id;

  if (!installmentId || !registrationId) {
    logger.error("Missing workshop installment metadata", undefined, { paymentIntentId: paymentIntent.id });
    return;
  }

  // Mark installment as completed (workshop_installments not yet in generated types)
  const { error: installmentError } = await (supabaseAdmin as any)
    .from("workshop_installments")
    .update({
      status: "completed",
      stripe_payment_intent_id: paymentIntent.id,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", installmentId);

  if (installmentError) {
    logger.error("Error updating installment", installmentError);
    return;
  }

  // Increment installments_paid on registration
  const { data: reg } = await (supabaseAdmin as any)
    .from("workshop_registrations")
    .select("installments_paid")
    .eq("id", registrationId)
    .single();

  if (reg) {
    await (supabaseAdmin as any)
      .from("workshop_registrations")
      .update({
        installments_paid: (reg.installments_paid || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);
  }
}

export async function handleWorkshopInstallmentFailure(
  paymentIntent: Stripe.PaymentIntent,
  supabaseAdmin: SupabaseClient
) {
  const installmentId = paymentIntent.metadata?.installment_id;

  if (!installmentId) {
    logger.error("Missing workshop installment metadata for failure", undefined, { paymentIntentId: paymentIntent.id });
    return;
  }

  // Increment retry_count on the installment
  const { data: installment } = await (supabaseAdmin as any)
    .from("workshop_installments")
    .select("retry_count")
    .eq("id", installmentId)
    .single();

  if (installment) {
    await (supabaseAdmin as any)
      .from("workshop_installments")
      .update({
        retry_count: (installment.retry_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", installmentId);
  }
}
