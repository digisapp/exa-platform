/**
 * Norissa Valdez wrap-up:
 *  1. Charge $183.34 today off-session (payment #2)
 *  2. Cancel current subscription so the May 28 auto-charge doesn't fire
 *  3. Create a Stripe Subscription Schedule that charges $183.34 on May 30
 *     (payment #3), one iteration only, then cancels itself.
 */
import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-09-30.acacia" as Stripe.LatestApiVersion,
});

const CUSTOMER_ID = "cus_UUYJbOyHyL78cg";
const SUB_ID = "sub_1TVZDqCSbMyXnTzySpQiGvP9";
const PAYMENT_METHOD_ID = "pm_1TVZDnCSbMyXnTzyruLbakEW";
const PRICE_ID = "price_1TVZDHCSbMyXnTzyUpYWx4FZ";
// 2026-05-30 09:00 UTC — well clear of the May 28 auto-attempt window
const MAY_30_TIMESTAMP = Math.floor(Date.parse("2026-05-30T09:00:00Z") / 1000);

(async () => {
  // 1. Charge payment #2 off-session today
  console.log("[1/3] Charging payment #2 off-session...");
  let pi2: Stripe.PaymentIntent | null = null;
  try {
    pi2 = await stripe.paymentIntents.create({
      amount: 18334,
      currency: "usd",
      customer: CUSTOMER_ID,
      payment_method: PAYMENT_METHOD_ID,
      off_session: true,
      confirm: true,
      description: "Model Onboarding — Payment 2 of 3",
      metadata: {
        type: "model_onboarding_payment",
        email: "norissabusiness@gmail.com",
        replaces_subscription: SUB_ID,
        payment_number: "2",
      },
    }, { idempotencyKey: `norissa-payment-2-${CUSTOMER_ID}` });

    if (pi2.status === "succeeded") {
      console.log(`  ✅ payment #2 succeeded — PI ${pi2.id}  $183.34`);
    } else {
      console.log(`  ❌ payment #2 status=${pi2.status}`);
      console.log(`     Stopping — not canceling subscription so original schedule can retry.`);
      return;
    }
  } catch (e: any) {
    console.log(`  ❌ ${e.message}`);
    return;
  }

  // 2. Cancel current subscription (immediately)
  console.log("[2/3] Canceling current subscription...");
  try {
    const canceled = await stripe.subscriptions.cancel(SUB_ID, {
      invoice_now: false,
      prorate: false,
    });
    console.log(`  ✅ canceled — ${canceled.id}  status=${canceled.status}`);
  } catch (e: any) {
    console.log(`  ⚠️  cancel failed: ${e.message}`);
    // Continue — the schedule below still works; old sub may still try to charge.
  }

  // 3. Create a Subscription Schedule for May 30
  console.log("[3/3] Creating subscription schedule for 2026-05-30...");
  try {
    const schedule = await stripe.subscriptionSchedules.create({
      customer: CUSTOMER_ID,
      start_date: MAY_30_TIMESTAMP,
      end_behavior: "cancel",
      default_settings: {
        default_payment_method: PAYMENT_METHOD_ID,
        collection_method: "charge_automatically",
      },
      phases: [
        {
          items: [{ price: PRICE_ID, quantity: 1 }],
          iterations: 1,
          metadata: {
            type: "model_onboarding_final",
            email: "norissabusiness@gmail.com",
            payment_number: "3",
          },
        },
      ],
      metadata: {
        type: "model_onboarding_final_schedule",
        email: "norissabusiness@gmail.com",
        original_subscription: SUB_ID,
      },
    });
    console.log(`  ✅ schedule created — ${schedule.id}`);
    console.log(`     status: ${schedule.status}`);
    console.log(`     starts: ${new Date(schedule.phases[0].start_date * 1000).toISOString()}`);
    console.log(`     end_behavior: ${schedule.end_behavior}`);
  } catch (e: any) {
    console.log(`  ❌ schedule create failed: ${e.message}`);
    console.log(`     Payment #2 already collected. You'll need to manually charge $183.34 on May 30.`);
  }
})();
