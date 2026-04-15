import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAcademyEnrollmentConfirmationEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

export async function handleAcademyEnrollment(session: Stripe.Checkout.Session, supabaseAdmin: SupabaseClient) {
  const applicationId = session.metadata?.application_id;
  const cohort = session.metadata?.cohort;
  const buyerEmail = session.metadata?.buyer_email;
  const buyerName = session.metadata?.buyer_name;
  const paymentType = session.metadata?.payment_type as "full" | "installment" | undefined;

  if (!applicationId || !cohort || !buyerEmail) {
    logger.error("Missing academy enrollment metadata", undefined, { sessionId: session.id });
    return;
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  const isInstallment = paymentType === "installment";

  // Update application to enrolled
  const updateData: Record<string, any> = {
    status: "enrolled",
    stripe_payment_intent_id: paymentIntentId,
    enrolled_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isInstallment) {
    updateData.installments_paid = 1;
  } else {
    updateData.installments_paid = 1;
    updateData.installments_total = 1;
  }

  const { error: updateError } = await (supabaseAdmin as any)
    .from("academy_applications")
    .update(updateData)
    .eq("id", applicationId);

  if (updateError) {
    logger.error("Error updating academy application", updateError);
  }

  // Send confirmation email
  const cohortLabels: Record<string, string> = {
    "miami-swim-week": "Miami Swim Week",
    "nyfw": "New York Fashion Week",
    "art-basel": "Art Basel",
  };

  const cohortDates: Record<string, string> = {
    "miami-swim-week": "March — May",
    "nyfw": "June — August",
    "art-basel": "September — November",
  };

  try {
    await sendAcademyEnrollmentConfirmationEmail({
      to: buyerEmail,
      studentName: buyerName || "Student",
      cohortName: cohortLabels[cohort] || cohort,
      cohortDates: cohortDates[cohort] || "",
      paymentType: paymentType || "full",
      totalPriceCents: isInstallment ? 199600 : 199500,
    });
  } catch (emailError) {
    logger.error("Error sending academy confirmation email", emailError);
  }

  logger.info("Academy enrollment completed", { applicationId, buyerEmail, cohort });
}
