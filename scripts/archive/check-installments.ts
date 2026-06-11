import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform", ".env.local") });

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const workshopEmails = [
  "dezirae162@gmail.com",       // Dj Jeannine
  "gianogueira1@gmail.com",     // Giovanna Layman
  "maddiecoccia@gmail.com",     // Madelene Coccia
];
const onboardingEmails = [
  "emma.jordan1717@gmail.com",     // Emma Jordan
  "fitbyerikanicole@gmail.com",    // Erika Nicole
  "gabrielacontos@gmail.com",      // Gabriela Contos
];

(async () => {
  console.log("=== WORKSHOP INSTALLMENTS ===\n");
  for (const email of workshopEmails) {
    const { data: regs } = await sb
      .from("workshop_registrations")
      .select("id, buyer_email, buyer_name, installments_paid, installments_total, stripe_customer_id, workshop_id, workshops(title)")
      .eq("buyer_email", email);
    if (!regs || regs.length === 0) { console.log(`  ${email}: no registration`); continue; }
    for (const r of regs) {
      const { data: inst } = await sb
        .from("workshop_installments")
        .select("installment_number, status, due_date, amount_cents, paid_at, retry_count")
        .eq("registration_id", r.id)
        .order("installment_number", { ascending: true });
      console.log(`${(r as any).buyer_name || ""}  <${email}>  — ${(r as any).workshops?.title || "Workshop"}`);
      console.log(`  paid ${r.installments_paid}/${r.installments_total}`);
      for (const i of inst || []) {
        const amt = (i.amount_cents / 100).toFixed(2);
        console.log(`  #${i.installment_number}  $${amt}  status=${i.status}  due=${i.due_date}  paid_at=${i.paid_at || ""}  retries=${i.retry_count}`);
      }
      console.log();
    }
  }

  console.log("\n=== MODEL ONBOARDING SUBSCRIPTIONS ===\n");
  for (const email of onboardingEmails) {
    const { data: bks } = await sb
      .from("model_onboarding_bookings")
      .select("id, email, name, payment_plan, payments_completed, stripe_subscription_id, stripe_customer_id, status, amount_cents")
      .eq("email", email);
    if (!bks || bks.length === 0) { console.log(`  ${email}: no booking`); continue; }
    for (const b of bks) {
      console.log(`${b.name}  <${email}>  — Model Onboarding`);
      console.log(`  plan=${b.payment_plan}  payments_completed=${b.payments_completed}  booking status=${b.status}`);
      if (b.stripe_subscription_id) {
        try {
          const sub: any = await stripe.subscriptions.retrieve(b.stripe_subscription_id, {
            expand: ["schedule", "default_payment_method", "items.data.price"],
          });
          const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString().slice(0, 10) : null;
          console.log(`  Stripe subscription: ${sub.id}  status=${sub.status}`);
          console.log(`  current_period_end = next charge attempt: ${periodEnd}`);
          if (sub.schedule) console.log(`  schedule id: ${sub.schedule.id || sub.schedule}`);
          if (sub.cancel_at) console.log(`  scheduled to cancel: ${new Date(sub.cancel_at * 1000).toISOString().slice(0,10)}`);
          if (sub.canceled_at) console.log(`  canceled_at: ${new Date(sub.canceled_at * 1000).toISOString().slice(0,10)}`);
          // Pull upcoming invoice for an authoritative next-charge amount + date
          try {
            const upcoming: any = await stripe.invoices.retrieveUpcoming({ subscription: sub.id });
            console.log(`  upcoming invoice: $${(upcoming.amount_due/100).toFixed(2)} on ${new Date(upcoming.next_payment_attempt * 1000).toISOString().slice(0,10)}`);
          } catch (e: any) {
            console.log(`  upcoming invoice: none (${e.message?.slice(0,80)})`);
          }
        } catch (e: any) {
          console.log(`  Stripe subscription retrieve failed: ${e.message}`);
        }
      } else {
        console.log(`  (no stripe_subscription_id on booking row)`);
      }
      console.log();
    }
  }
})();
