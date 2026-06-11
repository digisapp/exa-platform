import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const onboardingEmails = [
  "emma.jordan1717@gmail.com",
  "fitbyerikanicole@gmail.com",
  "gabrielacontos@gmail.com",
];

function fmt(epoch: number | null | undefined) {
  if (!epoch) return "—";
  return new Date(epoch * 1000).toISOString().slice(0, 10);
}

(async () => {
  for (const email of onboardingEmails) {
    console.log(`\n=== ${email} ===`);
    // Find Stripe customers by email
    const customers = await stripe.customers.list({ email, limit: 5 });
    if (customers.data.length === 0) { console.log("  no Stripe customer found"); continue; }

    for (const c of customers.data) {
      console.log(`  Customer ${c.id} (${c.name || ""})`);
      // List subscriptions for this customer
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 10 });
      if (subs.data.length === 0) {
        console.log("    no subscriptions");
      }
      for (const sub of subs.data) {
        const s = sub as any;
        console.log(`    sub ${sub.id}  status=${sub.status}  start=${fmt(sub.start_date)}  cur_period_end=${fmt(s.current_period_end)}`);
        if (s.cancel_at) console.log(`      scheduled to cancel: ${fmt(s.cancel_at)}`);
        if (s.canceled_at) console.log(`      canceled_at: ${fmt(s.canceled_at)}`);
        // Items
        for (const item of sub.items.data) {
          const price = item.price;
          console.log(`      item: $${((price.unit_amount || 0)/100).toFixed(2)} ${price.recurring?.interval || ""}  qty=${item.quantity}`);
        }
        // Upcoming invoice
        if (sub.status === "active" || sub.status === "past_due" || sub.status === "trialing") {
          try {
            const up: any = await (stripe.invoices as any).retrieveUpcoming({ subscription: sub.id });
            console.log(`      NEXT CHARGE: $${(up.amount_due/100).toFixed(2)} on ${fmt(up.next_payment_attempt || up.period_end)}`);
          } catch (e: any) {
            console.log(`      upcoming invoice: ${e.message?.slice(0,100)}`);
          }
        }
      }

      // Also look for subscription schedules (3-payment scheduled subscriptions)
      const schedules = await stripe.subscriptionSchedules.list({ customer: c.id, limit: 10 });
      for (const sch of schedules.data) {
        console.log(`    schedule ${sch.id}  status=${sch.status}  current_phase=${sch.current_phase ? fmt(sch.current_phase.end_date) : "—"}`);
        for (let i = 0; i < sch.phases.length; i++) {
          const p = sch.phases[i];
          console.log(`      phase ${i+1}: ${fmt(p.start_date)} -> ${fmt(p.end_date)}, ${p.iterations || ""} iter, items=${p.items.length}`);
        }
      }

      // List paid invoices to confirm count
      const invs = await stripe.invoices.list({ customer: c.id, limit: 10 });
      const paid = invs.data.filter(i => i.status === "paid");
      console.log(`    paid invoices: ${paid.length}  (total invoices: ${invs.data.length})`);
      for (const inv of paid) {
        console.log(`      $${(inv.amount_paid/100).toFixed(2)} on ${fmt(inv.status_transitions?.paid_at || inv.created)}  desc=${inv.lines.data[0]?.description || ""}`);
      }
    }
  }
})();
