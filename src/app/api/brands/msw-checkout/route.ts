import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

const PACKAGES = {
  "opening-show": {
    name: "Opening Show — May 26, 2026",
    fullPrice: 350000, // $3,500.00 in cents
    installmentPrice: 116700, // $1,167.00/month in cents
    description: "Premier opening night runway show at Miami Swim Week 2026",
  },
  "day-2": {
    name: "Day 2 Show — May 27, 2026",
    fullPrice: 250000, // $2,500.00 in cents
    installmentPrice: 83400, // $834.00/month in cents
    description: "Runway show on Day 2 of Miami Swim Week 2026",
  },
  "day-3": {
    name: "Day 3 Show — May 28, 2026",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 50000, // $500.00/month in cents
    description: "Runway show on Day 3 of Miami Swim Week 2026",
  },
  "daytime-show": {
    name: "Daytime Show — Thursday May 28, 2026",
    fullPrice: 100000, // $1,000.00 in cents
    installmentPrice: 33400, // $334.00/month in cents
    description: "Boutique daytime runway showcase on Thursday May 28, 2026",
  },
} as const;

type PackageKey = keyof typeof PACKAGES;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { package: pkg, paymentType } = body as {
      package: PackageKey;
      paymentType: "full" | "installment";
    };

    const packageConfig = PACKAGES[pkg];
    if (!packageConfig) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    if (paymentType !== "full" && paymentType !== "installment") {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const successUrl = `${BASE_URL}/brands/miami-swim-week/success?session_id={CHECKOUT_SESSION_ID}&pkg=${pkg}&type=${paymentType}`;
    const cancelUrl = `${BASE_URL}/brands/miami-swim-week`;

    if (paymentType === "full") {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `EXA Models — ${packageConfig.name}`,
                description: packageConfig.description,
              },
              unit_amount: packageConfig.fullPrice,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          package: pkg,
          payment_type: "full",
          source: "msw_brand_page",
        },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // 3-month installment plan via Stripe subscription
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `EXA Models — ${packageConfig.name} (3-Month Plan)`,
                description: `${packageConfig.description}. 3 equal monthly installments.`,
              },
              unit_amount: packageConfig.installmentPrice,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          package: pkg,
          payment_type: "installment",
          source: "msw_brand_page",
        },
        subscription_data: {
          metadata: {
            package: pkg,
            payment_type: "installment",
            source: "msw_brand_page",
            cancel_after_months: "3",
          },
        },
      });

      return NextResponse.json({ url: session.url });
    }
  } catch (error) {
    console.error("MSW brand checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
