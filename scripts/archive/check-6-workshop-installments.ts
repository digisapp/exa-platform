import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
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

const emails = [
  ["Alexis Barriere", "alexisbarriere@yahoo.com"],
  ["Katelyn Mizuki Berringer", "katelynmb2016@gmail.com"],
  ["Nya Kameko Burnett", "n.burnett2002@gmail.com"],
  ["Paula Munoz", "paulamunoz1997@yahoo.com"],
  ["Stefanie Galindo", "Stefaniiegaliindo@gmail.com"],
  ["Thomasin Eboko", "thomasineboko.wfg@gmail.com"],
];

(async () => {
  for (const [name, email] of emails) {
    console.log(`\n=== ${name} <${email}> ===`);
    // Workshop registration
    const { data: regs } = await sb
      .from("workshop_registrations")
      .select("id, stripe_customer_id, installments_paid, installments_total, payment_type, status, created_at, workshops(title)")
      .ilike("buyer_email", email);
    if (!regs || regs.length === 0) { console.log("  ❌ no workshop_registration found"); continue; }

    for (const r of regs) {
      console.log(`  reg ${r.id}  workshop="${(r as any).workshops?.title || ""}"  status=${r.status}  paid=${r.installments_paid}/${r.installments_total}  cust=${r.stripe_customer_id}`);

      const { data: inst } = await sb
        .from("workshop_installments")
        .select("installment_number, status, due_date, amount_cents, paid_at, retry_count, stripe_payment_intent_id")
        .eq("registration_id", r.id)
        .order("installment_number", { ascending: true });
      for (const i of inst || []) {
        const amt = (i.amount_cents / 100).toFixed(2);
        console.log(`    #${i.installment_number}  $${amt}  status=${i.status}  due=${i.due_date}  paid_at=${(i.paid_at||"").slice(0,10)}  retries=${i.retry_count}  pi=${i.stripe_payment_intent_id || ""}`);
      }

      // Quick Stripe sanity check — list recent charges for this customer
      if (r.stripe_customer_id) {
        try {
          const charges = await stripe.charges.list({ customer: r.stripe_customer_id, limit: 6 });
          console.log(`    Stripe charges on customer (most recent 6):`);
          for (const c of charges.data) {
            const dt = new Date(c.created * 1000).toISOString().slice(0, 10);
            console.log(`      ${c.id}  $${(c.amount/100).toFixed(2)}  status=${c.status}  ${dt}  ${c.failure_message || ""}`);
          }
        } catch (e: any) {
          console.log(`    Stripe charges error: ${e.message}`);
        }
      }
    }
  }
})();
