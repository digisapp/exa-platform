import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

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

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Get actor and verify it's a brand
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "brand") {
      return NextResponse.json({ error: "Not a brand account" }, { status: 400 });
    }

    // Get brand data
    const { data: brand } = await (supabase
      .from("brands") as any)
      .select("id, email, company_name, stripe_customer_id")
      .eq("id", actor.id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const body = await request.json();
    const { tier, billingCycle } = body as { tier: BrandTier; billingCycle: "monthly" | "annual" };

    // Validate tier
    if (!tier || !BRAND_SUBSCRIPTION_TIERS[tier]) {
      return NextResponse.json({ error: "Invalid subscription tier" }, { status: 400 });
    }

    if (tier === "free") {
      return NextResponse.json({ error: "Cannot subscribe to free tier" }, { status: 400 });
    }

    const tierConfig = BRAND_SUBSCRIPTION_TIERS[tier];
    const price = billingCycle === "annual" ? tierConfig.annualPrice : tierConfig.monthlyPrice;

    // Get base URL for redirects
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://examodels.com";

    // Create or retrieve Stripe customer
    let stripeCustomerId = brand.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: brand.email || user.email,
        name: brand.company_name,
        metadata: {
          brand_id: brand.id,
          actor_id: actor.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to brand
      await (supabase.from("brands") as any)
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", brand.id);
    }

    // Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `EXA ${tierConfig.name} Plan`,
              description: `${billingCycle === "annual" ? "Annual" : "Monthly"} subscription with ${tierConfig.monthlyCoins} coins/month`,
            },
            unit_amount: price,
            recurring: {
              interval: billingCycle === "annual" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${baseUrl}/brands/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/brands/pricing`,
      metadata: {
        brand_id: brand.id,
        actor_id: actor.id,
        tier: tier,
        billing_cycle: billingCycle,
        monthly_coins: tierConfig.monthlyCoins.toString(),
      },
      subscription_data: {
        metadata: {
          brand_id: brand.id,
          actor_id: actor.id,
          tier: tier,
          billing_cycle: billingCycle,
          monthly_coins: tierConfig.monthlyCoins.toString(),
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription checkout" },
      { status: 500 }
    );
  }
}
