import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const PRICE_CENTS = 12500; // $125
const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.examodels.com";

const adminClient = createServiceRoleClient();

const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email("Invalid email").max(200).trim(),
  instagram: z.string().max(100).optional(),
  isDigisCreator: z.boolean().default(false),
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

    const { name, email, instagram, isDigisCreator } = parsed.data;

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
          type: "miami_digitals",
          instagram: instagram || "",
        },
      });
    }

    const amountCents = isDigisCreator ? 0 : PRICE_CENTS;

    // For Digis.cc creators — free booking, no Stripe checkout needed
    if (isDigisCreator) {
      await (adminClient as any).from("miami_digitals_bookings").insert({
        name,
        email: email.toLowerCase(),
        instagram: instagram || null,
        is_digis_creator: true,
        amount_cents: 0,
        status: "paid", // Free = auto-confirmed
      });

      return NextResponse.json({
        checkoutUrl: `${BASE_URL}/fresh-digitals?success=true`,
        sessionId: null,
      });
    }

    // Paid checkout via Stripe
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "EXA Digitals — Miami Beach",
              description:
                "Sunday, May 24th · Professional digitals by EXA photographer + 20 printed comp cards",
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${BASE_URL}/fresh-digitals?success=true`,
      cancel_url: `${BASE_URL}/fresh-digitals?cancelled=true`,
      customer: customer.id,
      customer_update: { name: "auto" },
      metadata: {
        type: "miami_digitals",
        name,
        email: email.toLowerCase(),
        instagram: instagram || "",
        is_digis_creator: "false",
      },
    });

    // Save pending booking — will be updated to "paid" by webhook on payment success
    await (adminClient as any).from("miami_digitals_bookings").insert({
      name,
      email: email.toLowerCase(),
      instagram: instagram || null,
      is_digis_creator: false,
      stripe_session_id: session.id,
      amount_cents: amountCents,
      status: "pending",
    });

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Miami digitals checkout error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
