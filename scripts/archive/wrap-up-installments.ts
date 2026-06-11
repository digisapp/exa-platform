/**
 * Wrap-up script: charge the final installment today for 6 customers,
 * cancel Model Onboarding subscriptions, mark workshop installments completed.
 *
 * For each customer:
 *   1. Charge their saved card off-session.
 *   2. If the charge succeeds:
 *      - Model Onboarding: cancel the Stripe subscription immediately
 *      - Workshop: mark workshop_installments row #3 completed, bump
 *        workshop_registrations.installments_paid to 3
 *   3. If the charge fails: leave everything in place so the original schedule
 *      can retry. Print the error.
 *
 * Idempotent: uses a static idempotency key per customer, so re-running won't
 * double-charge.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type OnboardingTarget = {
  kind: "onboarding";
  email: string;
  name: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  amountCents: number;
};

type WorkshopTarget = {
  kind: "workshop";
  email: string;
  name: string;
};

const onboardingTargets: OnboardingTarget[] = [
  { kind: "onboarding", email: "emma.jordan1717@gmail.com", name: "Emma Jordan",
    stripeCustomerId: "cus_UMuXiMymEFPAJ7", stripeSubscriptionId: "sub_1TOAoICSbMyXnTzyDgoqN3N0", amountCents: 18334 },
  { kind: "onboarding", email: "gabrielacontos@gmail.com", name: "Gabriela Contos",
    stripeCustomerId: "cus_UMkRaHR4bl36sd", stripeSubscriptionId: "sub_1TOA2bCSbMyXnTzysepvT5RZ", amountCents: 18334 },
  { kind: "onboarding", email: "fitbyerikanicole@gmail.com", name: "Erika Nicole",
    stripeCustomerId: "cus_UOBzK9QjMRmSTr", stripeSubscriptionId: "sub_1TPPm8CSbMyXnTzynFhcLCqA", amountCents: 18334 },
];

const workshopTargets: WorkshopTarget[] = [
  { kind: "workshop", email: "dezirae162@gmail.com", name: "Dj Jeannine" },
  { kind: "workshop", email: "gianogueira1@gmail.com", name: "Giovanna Layman" },
  { kind: "workshop", email: "maddiecoccia@gmail.com", name: "Madelene Coccia" },
];

async function chargeOffSession(opts: {
  customerId: string;
  amountCents: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}): Promise<{ ok: true; pi: Stripe.PaymentIntent } | { ok: false; error: string }> {
  try {
    // Get the customer's default card
    const paymentMethods = await stripe.paymentMethods.list({
      customer: opts.customerId,
      type: "card",
      limit: 1,
    });
    if (paymentMethods.data.length === 0) {
      return { ok: false, error: "no card on file" };
    }
    const pm = paymentMethods.data[0];

    const pi = await stripe.paymentIntents.create({
      amount: opts.amountCents,
      currency: "usd",
      customer: opts.customerId,
      payment_method: pm.id,
      off_session: true,
      confirm: true,
      description: opts.description,
      metadata: opts.metadata,
    }, { idempotencyKey: opts.idempotencyKey });

    if (pi.status === "succeeded") return { ok: true, pi };
    return { ok: false, error: `PI status=${pi.status}` };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

async function handleOnboarding(t: OnboardingTarget) {
  console.log(`\n[Onboarding] ${t.name} <${t.email}>`);
  const charge = await chargeOffSession({
    customerId: t.stripeCustomerId,
    amountCents: t.amountCents,
    description: "Model Onboarding — Payment 3 of 3 (final)",
    metadata: {
      type: "model_onboarding_final",
      email: t.email,
      replaces_subscription: t.stripeSubscriptionId,
    },
    idempotencyKey: `wrap-final-onboarding-${t.stripeCustomerId}`,
  });

  if (!charge.ok) {
    console.log(`  ❌ charge FAILED: ${charge.error}`);
    console.log(`  Subscription NOT canceled. Original schedule will retry.`);
    return;
  }
  console.log(`  ✅ charged $${(t.amountCents/100).toFixed(2)} — PI ${charge.pi.id}`);

  try {
    const canceled = await stripe.subscriptions.cancel(t.stripeSubscriptionId, {
      invoice_now: false,
      prorate: false,
    });
    console.log(`  ✅ subscription canceled — ${canceled.id}  status=${canceled.status}`);
  } catch (e: any) {
    console.log(`  ⚠️  cancel failed: ${e.message}  (charge succeeded, please cancel manually)`);
  }
}

async function handleWorkshop(t: WorkshopTarget) {
  console.log(`\n[Workshop] ${t.name} <${t.email}>`);

  // Find their registration + pending installment
  const { data: regs } = await supabase
    .from("workshop_registrations")
    .select("id, stripe_customer_id, workshop_id, installments_paid, installments_total, buyer_name")
    .eq("buyer_email", t.email);
  if (!regs || regs.length === 0) { console.log(`  ❌ no registration found`); return; }
  const reg = regs[0];
  if (!reg.stripe_customer_id) { console.log(`  ❌ no stripe_customer_id on registration`); return; }

  const { data: pending } = await supabase
    .from("workshop_installments")
    .select("id, installment_number, amount_cents, status, due_date")
    .eq("registration_id", reg.id)
    .eq("status", "pending")
    .order("installment_number", { ascending: true });
  if (!pending || pending.length === 0) { console.log(`  ⚠️  no pending installment — already fully paid?`); return; }
  if (pending.length > 1) console.log(`  ⚠️  multiple pending installments (${pending.length}); processing first only`);
  const inst = pending[0];

  console.log(`  installment #${inst.installment_number}: $${(inst.amount_cents/100).toFixed(2)}  due=${inst.due_date}`);

  const charge = await chargeOffSession({
    customerId: reg.stripe_customer_id,
    amountCents: inst.amount_cents,
    description: `Workshop installment ${inst.installment_number}/${reg.installments_total} (final, charged early)`,
    metadata: {
      type: "workshop_installment_final",
      email: t.email,
      registration_id: reg.id,
      installment_number: String(inst.installment_number),
      installments_total: String(reg.installments_total),
    },
    idempotencyKey: `wrap-final-workshop-${inst.id}`,
  });

  if (!charge.ok) {
    console.log(`  ❌ charge FAILED: ${charge.error}`);
    console.log(`  Installment row NOT modified. Cron will retry on ${inst.due_date}.`);
    return;
  }
  console.log(`  ✅ charged $${(inst.amount_cents/100).toFixed(2)} — PI ${charge.pi.id}`);

  // Mark installment completed + bump registration
  const { error: u1 } = await supabase
    .from("workshop_installments")
    .update({
      status: "completed",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: charge.pi.id,
    })
    .eq("id", inst.id);
  if (u1) console.log(`  ⚠️  failed to update installment row: ${u1.message}`);
  else console.log(`  ✅ installment row marked completed`);

  const { error: u2 } = await supabase
    .from("workshop_registrations")
    .update({ installments_paid: reg.installments_total })
    .eq("id", reg.id);
  if (u2) console.log(`  ⚠️  failed to bump registration: ${u2.message}`);
  else console.log(`  ✅ registration installments_paid -> ${reg.installments_total}`);
}

(async () => {
  console.log("=========================================");
  console.log("  WRAP-UP: charging 6 final installments");
  console.log("=========================================");

  for (const t of onboardingTargets) {
    await handleOnboarding(t);
  }
  for (const t of workshopTargets) {
    await handleWorkshop(t);
  }

  console.log("\n=========================================");
  console.log("  DONE");
  console.log("=========================================");
})();
