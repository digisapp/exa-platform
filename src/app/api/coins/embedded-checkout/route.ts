import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  coins: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    const body = await request.json();
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const coinPackage = COIN_PACKAGES.find((p) => p.coins === result.data.coins);
    if (!coinPackage) {
      return NextResponse.json({ error: "Invalid coin package" }, { status: 400 });
    }

    const origin = request.headers.get("origin") || "https://examodels.com";

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${coinPackage.coins.toLocaleString()} EXA Coins`,
              description: `${coinPackage.coins.toLocaleString()} coins for tipping, calls, and unlocking content on EXA`,
            },
            unit_amount: coinPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_options: {
        card: { setup_future_usage: "on_session" },
      },
      return_url: `${origin}/coins/success?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        actor_id: actor.id,
        coins: coinPackage.coins.toString(),
        user_id: user.id,
      },
      customer_email: user.email,
    });

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error("Embedded checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
