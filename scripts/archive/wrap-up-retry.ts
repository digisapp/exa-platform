import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const retries = [
  {
    name: "Emma Jordan",
    email: "emma.jordan1717@gmail.com",
    customerId: "cus_UMuXiMymEFPAJ7",
    paymentMethodId: "pm_1TOAoBCSbMyXnTzyZn7G8LbE",
    subscriptionId: "sub_1TOAoICSbMyXnTzyDgoqN3N0",
  },
  {
    name: "Erika Nicole",
    email: "fitbyerikanicole@gmail.com",
    customerId: "cus_UOBzK9QjMRmSTr",
    paymentMethodId: "pm_1TPPm3CSbMyXnTzyVdKFoNZ1",
    subscriptionId: "sub_1TPPm8CSbMyXnTzynFhcLCqA",
  },
];

(async () => {
  for (const t of retries) {
    console.log(`\n[Onboarding RETRY] ${t.name} <${t.email}>`);
    try {
      // Make sure the PM is attached to the customer (idempotent — Stripe returns existing if already attached)
      try {
        await stripe.paymentMethods.attach(t.paymentMethodId, { customer: t.customerId });
        console.log(`  ✅ ensured PM attached to customer`);
      } catch (e: any) {
        if (e.code === "resource_already_exists" || /already.*attached/i.test(e.message || "")) {
          console.log(`  (PM already attached)`);
        } else {
          console.log(`  ⚠️  attach error: ${e.message}`);
        }
      }

      // Charge off-session with explicit payment method
      const pi = await stripe.paymentIntents.create({
        amount: 18334,
        currency: "usd",
        customer: t.customerId,
        payment_method: t.paymentMethodId,
        off_session: true,
        confirm: true,
        description: "Model Onboarding — Payment 3 of 3 (final)",
        metadata: {
          type: "model_onboarding_final",
          email: t.email,
          replaces_subscription: t.subscriptionId,
        },
      }, { idempotencyKey: `wrap-final-onboarding-${t.customerId}-retry1` });

      if (pi.status !== "succeeded") {
        console.log(`  ❌ PI status=${pi.status}`);
        continue;
      }
      console.log(`  ✅ charged $183.34 — PI ${pi.id}`);

      // Cancel subscription
      const canceled = await stripe.subscriptions.cancel(t.subscriptionId, {
        invoice_now: false,
        prorate: false,
      });
      console.log(`  ✅ subscription canceled — ${canceled.id}  status=${canceled.status}`);
    } catch (e: any) {
      console.log(`  ❌ ${e.message}`);
      if (e.payment_intent) console.log(`     PI id: ${e.payment_intent.id}, status: ${e.payment_intent.status}`);
    }
  }
})();
