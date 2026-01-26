import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check for financial operations
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "No actor found" }, { status: 400 });
    }

    const body = await request.json();
    const { coins } = body;

    // Find the package
    const coinPackage = COIN_PACKAGES.find((p) => p.coins === coins);
    if (!coinPackage) {
      return NextResponse.json({ error: "Invalid coin package" }, { status: 400 });
    }

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://examodels.com";

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${coinPackage.coins.toLocaleString()} EXA Coins`,
              description: `Purchase ${coinPackage.coins.toLocaleString()} coins to message models on EXA`,
            },
            unit_amount: coinPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/coins/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/wallet`,
      metadata: {
        actor_id: actor.id,
        coins: coinPackage.coins.toString(),
        user_id: user.id,
      },
      customer_email: user.email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
