/**
 * Charge installment #2 today for 4 Swim Week Runway Workshop customers,
 * then move installment #3 due_date to 2026-05-29 so the existing cron
 * auto-charges them then.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const NEW_INSTALLMENT_3_DUE = "2026-05-29";

const targets = [
  { name: "Alexis Barriere", email: "alexisbarriere@yahoo.com" },
  { name: "Katelyn Mizuki Berringer", email: "katelynmb2016@gmail.com" },
  { name: "Nya Kameko Burnett", email: "n.burnett2002@gmail.com" },
  { name: "Thomasin Eboko", email: "thomasineboko.wfg@gmail.com" },
];

async function chargeOne(t: { name: string; email: string }) {
  console.log(`\n[${t.name}] <${t.email}>`);

  const { data: regs } = await sb
    .from("workshop_registrations")
    .select("id, stripe_customer_id, installments_total")
    .ilike("buyer_email", t.email);
  if (!regs || regs.length === 0) { console.log("  ❌ no registration"); return; }
  const reg = regs[0];
  if (!reg.stripe_customer_id) { console.log("  ❌ no stripe_customer_id"); return; }

  const { data: inst } = await sb
    .from("workshop_installments")
    .select("id, installment_number, amount_cents, status, due_date")
    .eq("registration_id", reg.id)
    .order("installment_number", { ascending: true });
  if (!inst || inst.length < 3) { console.log("  ❌ unexpected installment rows"); return; }

  const inst2 = inst.find(i => i.installment_number === 2);
  const inst3 = inst.find(i => i.installment_number === 3);
  if (!inst2 || !inst3) { console.log("  ❌ #2 or #3 missing"); return; }
  if (inst2.status !== "pending") { console.log(`  ⚠️  #2 status is ${inst2.status} — skipping`); return; }

  // Find the customer's saved card
  const pms = await stripe.paymentMethods.list({ customer: reg.stripe_customer_id, type: "card", limit: 1 });
  if (pms.data.length === 0) { console.log("  ❌ no card on file"); return; }
  const pmId = pms.data[0].id;

  // 1. Charge installment #2 off-session
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create({
      amount: inst2.amount_cents,
      currency: "usd",
      customer: reg.stripe_customer_id,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      description: `Swim Week Runway Workshop — Installment 2 of 3 (charged early)`,
      metadata: {
        type: "workshop_installment_accelerated",
        email: t.email,
        registration_id: reg.id,
        installment_number: "2",
        installments_total: String(reg.installments_total),
      },
    }, { idempotencyKey: `accel-workshop-${inst2.id}` });
  } catch (e: any) {
    console.log(`  ❌ charge failed: ${e.message}`);
    return;
  }
  if (pi.status !== "succeeded") {
    console.log(`  ❌ PI status=${pi.status} — leaving DB alone`);
    return;
  }
  console.log(`  ✅ charged $${(inst2.amount_cents/100).toFixed(2)} — PI ${pi.id}`);

  // 2. Mark installment #2 completed
  const { error: e2 } = await sb
    .from("workshop_installments")
    .update({
      status: "completed",
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: pi.id,
    })
    .eq("id", inst2.id);
  if (e2) console.log(`  ⚠️  failed to mark #2 completed: ${e2.message}`);
  else console.log(`  ✅ #2 marked completed`);

  // 3. Bump registration installments_paid
  const { error: e3 } = await sb
    .from("workshop_registrations")
    .update({ installments_paid: 2 })
    .eq("id", reg.id);
  if (e3) console.log(`  ⚠️  failed to bump installments_paid: ${e3.message}`);
  else console.log(`  ✅ registration installments_paid -> 2`);

  // 4. Move installment #3 due_date to May 29
  const { error: e4 } = await sb
    .from("workshop_installments")
    .update({ due_date: NEW_INSTALLMENT_3_DUE })
    .eq("id", inst3.id);
  if (e4) console.log(`  ⚠️  failed to move #3 due_date: ${e4.message}`);
  else console.log(`  ✅ #3 due_date -> ${NEW_INSTALLMENT_3_DUE} (cron will auto-charge then)`);
}

(async () => {
  console.log("=========================================");
  console.log("  ACCELERATE WORKSHOP INSTALLMENTS");
  console.log("=========================================");
  for (const t of targets) {
    await chargeOne(t);
  }
  console.log("\n=========================================");
  console.log("  DONE — next cron run on 2026-05-29 will charge #3 for each");
  console.log("=========================================");
})();
