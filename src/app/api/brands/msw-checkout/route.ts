import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

const PACKAGES = {
  "opening-show": {
    name: "Opening Show — Tuesday May 26, 2026",
    fullPrice: 350000, // $3,500.00 in cents
    installmentPrice: 116700, // $1,167.00/month in cents
    description: "Premier opening night runway show at Miami Swim Week 2026",
  },
  "day-2": {
    name: "Day 2 Show — Wednesday May 27, 2026",
    fullPrice: 250000, // $2,500.00 in cents
    installmentPrice: 83400, // $834.00/month in cents
    description: "Runway show on Day 2 of Miami Swim Week 2026",
  },
  "day-3": {
    name: "Day 3 Show — Thursday May 28, 2026",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 50000, // $500.00/month in cents
    description: "Runway show on Day 3 of Miami Swim Week 2026",
  },
  "day-4": {
    name: "Day 4 Show — Friday May 29, 2026",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 50000, // $500.00/month in cents
    description: "Runway show on Day 4 of Miami Swim Week 2026",
  },
  "day-5": {
    name: "Day 5 Show — Saturday May 30, 2026",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 50000, // $500.00/month in cents
    description: "Saturday closing show at Miami Swim Week 2026",
  },
  "day-6": {
    name: "Day 6 Show — Sunday May 31, 2026",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 50000, // $500.00/month in cents
    description: "Grand finale closing show at Miami Swim Week 2026",
  },
  "daytime-show": {
    name: "Daytime Show — Thursday May 28, 2026",
    fullPrice: 100000, // $1,000.00 in cents
    installmentPrice: 33400, // $334.00/month in cents
    description: "Boutique daytime runway showcase on Thursday May 28, 2026",
  },
  "showroom-halfday": {
    name: "Private Showroom — Half Day (4 hrs)",
    fullPrice: 120000, // $1,200.00 in cents
    installmentPrice: 120000, // full only
    description: "4-hour private ballroom showroom at our Miami Swim Week hotel venue. Your brand, your space — invite buyers, press, and VIPs for an exclusive presentation.",
  },
  "showroom-fullday": {
    name: "Private Showroom — Full Day",
    fullPrice: 200000, // $2,000.00 in cents
    installmentPrice: 200000, // full only
    description: "Full-day exclusive private ballroom showroom at our Miami Swim Week hotel venue. Your brand, your space for an entire day — invite buyers, press, and VIPs.",
  },
  "swim-shop": {
    name: "EXA Swim Shop — May 26–31, 2026",
    fullPrice: 50000, // $500.00 in cents
    installmentPrice: 50000, // full only
    description: "Sell your swimwear collection in the EXA Swim Shop during Miami Swim Week 2026 (May 26–31). Prime retail pop-up location with show week foot traffic.",
  },
  "gifting-suite": {
    name: "VIP Gifting Suite — May 26–31, 2026",
    fullPrice: 65000, // $650.00 in cents
    installmentPrice: 65000, // full only
    description: "Place your products in the VIP & influencer lounge during Miami Swim Week 2026. Get your brand picked up, worn organically, and featured on social.",
  },
  "lobby-display": {
    name: "Hotel Lobby Display — May 26–31, 2026",
    fullPrice: 60000, // $600.00 in cents
    installmentPrice: 60000, // full only
    description: "Branded display in the hotel lobby all week at Miami Swim Week 2026. Visible to every guest, model, designer, buyer, and attendee.",
  },
  "beach-shoot-halfday": {
    name: "Miami Beach Shoot Day — Half Day",
    fullPrice: 150000, // $1,500.00 in cents
    installmentPrice: 150000, // full only
    description: "Half-day professional photo & video shoot with EXA models in your swimwear at a Miami Beach location during Swim Week. All content is yours.",
  },
  "beach-shoot-fullday": {
    name: "Miami Beach Shoot Day — Full Day",
    fullPrice: 250000, // $2,500.00 in cents
    installmentPrice: 250000, // full only
    description: "Full-day professional photo & video shoot with EXA models in your swimwear at a Miami Beach location during Swim Week. All content is yours.",
  },
  "model-ambassador": {
    name: "Model Ambassador Day — Miami Swim Week",
    fullPrice: 80000, // $800.00 in cents
    installmentPrice: 80000, // full only
    description: "A model wears your brand around Miami all day during Swim Week — pool deck, lobby, events, the beach — creating organic content for your social channels.",
  },
  "afterparty-standard": {
    name: "After-Party Sponsorship — Standard",
    fullPrice: 200000, // $2,000.00 in cents
    installmentPrice: 200000, // full only
    description: "Standard sponsorship of the official EXA Swim Week after-party. Logo on event materials, branded presence, product placement.",
  },
  "afterparty-premier": {
    name: "After-Party Sponsorship — Premier",
    fullPrice: 350000, // $3,500.00 in cents
    installmentPrice: 350000, // full only
    description: "Premier sponsorship of the official EXA Swim Week after-party. Featured logo placement, dedicated product moment, social features.",
  },
  "afterparty-presenting": {
    name: "After-Party Sponsorship — Presenting Sponsor",
    fullPrice: 500000, // $5,000.00 in cents
    installmentPrice: 500000, // full only
    description: "Presenting sponsorship of the official EXA Swim Week after-party. Top billing across all materials, exclusive branded activation, and VIP table.",
  },
} as const;

type PackageKey = keyof typeof PACKAGES;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { package: pkg, paymentType, addPhotoVideo, addExtraModels } = body as {
      package: PackageKey;
      paymentType: "full" | "installment";
      addPhotoVideo?: boolean;
      addExtraModels?: boolean;
    };

    const packageConfig = PACKAGES[pkg];
    if (!packageConfig) {
      return NextResponse.json({ error: "Invalid package" }, { status: 400 });
    }

    if (paymentType !== "full" && paymentType !== "installment") {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    const successUrl = `${BASE_URL}/designers/miami-swim-week/success?session_id={CHECKOUT_SESSION_ID}&pkg=${pkg}&type=${paymentType}&media=${addPhotoVideo ? "1" : "0"}&models=${addExtraModels ? "20" : "15"}`;
    const cancelUrl = `${BASE_URL}/designers/miami-swim-week`;

    if (paymentType === "full") {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
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
      ];

      if (addExtraModels) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Model Upgrade — 20 Models",
              description: "Upgrade from 15 to 20 models for your show (5 additional models)",
            },
            unit_amount: 50000, // $500.00
          },
          quantity: 1,
        });
      }

      if (addPhotoVideo) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Photo & Video Documentation",
              description: "Full show documentation — every walk and the complete runway show",
            },
            unit_amount: 70000, // $700.00
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          package: pkg,
          payment_type: "full",
          add_extra_models: addExtraModels ? "true" : "false",
          add_photo_video: addPhotoVideo ? "true" : "false",
          source: "msw_brand_page",
        },
      });

      return NextResponse.json({ url: session.url });
    } else {
      // 3-month installment plan via Stripe subscription
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
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
      ];

      if (addExtraModels) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Model Upgrade — 20 Models (3-Month Plan)",
              description: "Upgrade from 15 to 20 models (5 additional). 3 equal monthly installments.",
            },
            unit_amount: 16700, // $167/month × 3 = $501 ≈ $500
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        });
      }

      if (addPhotoVideo) {
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: {
              name: "Photo & Video Documentation (3-Month Plan)",
              description: "Full show documentation — every walk and the complete runway show. 3 equal monthly installments.",
            },
            unit_amount: 23400, // $234/month × 3 = $702 ≈ $700
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        });
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "subscription",
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          package: pkg,
          payment_type: "installment",
          add_extra_models: addExtraModels ? "true" : "false",
          add_photo_video: addPhotoVideo ? "true" : "false",
          source: "msw_brand_page",
        },
        subscription_data: {
          metadata: {
            package: pkg,
            payment_type: "installment",
            add_extra_models: addExtraModels ? "true" : "false",
            add_photo_video: addPhotoVideo ? "true" : "false",
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
