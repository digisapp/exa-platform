import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.examodels.com";

const checkoutSchema = z.object({
  items: z.array(z.object({
    name: z.string().min(1),
    price: z.number().int().positive(),
    quantity: z.number().int().positive(),
    image: z.string().url().optional(),
  })).min(1, "No items in cart"),
  tax: z.number().int().min(0),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { items, tax } = parsed.data;

    // Build Stripe line items — prices are already in cents
    const lineItems: any[] = items.map(item => ({
      price_data: {
        currency: "usd",
        unit_amount: item.price, // cents
        product_data: {
          name: item.name,
          ...(item.image ? { images: [item.image] } : {}),
        },
      },
      quantity: item.quantity,
    }));

    // Add tax as a separate line item if non-zero
    if (tax > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: tax,
          product_data: { name: "Sales Tax (7%)" },
        },
        quantity: 1,
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${SITE_URL}/pos/beach/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pos/beach`,
      metadata: {
        pos_type: "beach",
        item_count: String(items.length),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    console.error("Beach checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
