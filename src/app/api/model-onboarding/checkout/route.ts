import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const RUNWAY_WORKSHOP_CENTS = 35000; // $350
const SWIMWEAR_DIGITALS_CENTS = 20000; // $200
const TOTAL_CENTS = RUNWAY_WORKSHOP_CENTS + SWIMWEAR_DIGITALS_CENTS; // $550
const SPLIT_PAYMENT_CENTS = Math.round(TOTAL_CENTS / 2); // $275
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.examodels.com";

const adminClient = createServiceRoleClient();

const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email").max(200).trim(),
  instagram: z.string().max(100).optional(),
  paymentPlan: z.enum(["full", "split"]).default("full"),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, email, instagram, paymentPlan } = parsed.data;

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 1,
    });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name,
        metadata: {
          type: "model_onboarding",
          instagram: instagram || "",
        },
      });
    }

    const sharedMetadata = {
      type: "model_onboarding",
      payment_plan: paymentPlan,
      name,
      email: email.toLowerCase(),
      instagram: instagram || "",
    };

    let session;

    if (paymentPlan === "split") {
      // Split into 2 monthly payments of $275
      session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Model Onboarding — Payment 1 of 2",
                description:
                  "Runway Workshop + Swimwear Digitals ($275 now, $275 in 30 days)",
              },
              unit_amount: SPLIT_PAYMENT_CENTS,
              recurring: { interval: "month", interval_count: 1 },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: `${BASE_URL}/model-onboarding?success=true&plan=split`,
        cancel_url: `${BASE_URL}/model-onboarding?cancelled=true`,
        customer: customer.id,
        customer_update: { name: "auto" },
        metadata: sharedMetadata,
        subscription_data: {
          metadata: sharedMetadata,
        },
      });
    } else {
      // Full payment — one-time $550
      session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Runway Workshop",
                description:
                  "Master the runway walk — posture, turns, pacing & stage presence",
              },
              unit_amount: RUNWAY_WORKSHOP_CENTS,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: "Swimwear Digitals",
                description:
                  "Professional swimwear photos by an EXA photographer",
              },
              unit_amount: SWIMWEAR_DIGITALS_CENTS,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${BASE_URL}/model-onboarding?success=true`,
        cancel_url: `${BASE_URL}/model-onboarding?cancelled=true`,
        customer: customer.id,
        customer_update: { name: "auto" },
        metadata: sharedMetadata,
      });
    }

    // Save pending booking record
    const subscriptionId =
      paymentPlan === "split" && session.subscription
        ? typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id
        : null;

    await (adminClient as any).from("model_onboarding_bookings").insert({
      name,
      email: email.toLowerCase(),
      instagram: instagram || null,
      amount_cents: TOTAL_CENTS,
      status: "pending",
      payment_plan: paymentPlan,
      payments_completed: 0,
      stripe_session_id: session.id,
      stripe_subscription_id: subscriptionId,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    logger.error("Model onboarding checkout error", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
