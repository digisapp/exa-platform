import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const RUNWAY_WORKSHOP_CENTS = 35000; // $350
const SWIMWEAR_DIGITALS_CENTS = 20000; // $200
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.examodels.com";

const adminClient = createServiceRoleClient();

const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email").max(200).trim(),
  instagram: z.string().max(100).optional(),
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

    const { name, email, instagram } = parsed.data;

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

    // Create Stripe checkout session with two line items
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Runway Workshop",
              description: "Master the runway walk — posture, turns, pacing & stage presence",
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
              description: "Professional swimwear photos by an EXA photographer",
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
      metadata: {
        type: "model_onboarding",
        name,
        email: email.toLowerCase(),
        instagram: instagram || "",
      },
    });

    // Save pending booking record
    await (adminClient as any).from("model_onboarding_bookings").insert({
      name,
      email: email.toLowerCase(),
      instagram: instagram || null,
      amount_cents: RUNWAY_WORKSHOP_CENTS + SWIMWEAR_DIGITALS_CENTS,
      status: "pending",
      stripe_session_id: session.id,
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Model onboarding checkout error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
