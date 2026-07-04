import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

// Package prices now live in the event_packages table (seeded cent-for-cent
// from the previous hardcoded PACKAGES dict). This route serves the MSW event;
// generalizing the success/cancel URLs to arbitrary events is a later step.
const MSW_EVENT_SLUG = "miami-swim-week-2026";

const mswCheckoutSchema = z.object({
  package: z.string().min(1),
  paymentType: z.enum(["full", "installment"]),
  addPhotoVideo: z.boolean().optional(),
  addExtraModels: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const parsed = mswCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    const { package: pkg, paymentType, addPhotoVideo, addExtraModels } = parsed.data;

    // Look up the package price from the database.
    const admin = createServiceRoleClient();
    const { data: event } = await admin
      .from("events")
      .select("id")
      .eq("slug", MSW_EVENT_SLUG)
      .single() as { data: { id: string } | null };

    if (!event) {
      logger.error("MSW checkout: event not found", undefined, { slug: MSW_EVENT_SLUG });
      return NextResponse.json({ error: "Event not configured" }, { status: 500 });
    }

    // Cast: event_packages is newer than the generated DB types.
    const { data: dbPackage } = await (admin as any)
      .from("event_packages")
      .select("name, description, full_price_cents, installment_price_cents")
      .eq("event_id", event.id)
      .eq("key", pkg)
      .eq("is_active", true)
      .single() as {
        data: { name: string; description: string | null; full_price_cents: number; installment_price_cents: number } | null;
      };

    if (!dbPackage) {
      return NextResponse.json({ error: "Unknown package" }, { status: 400 });
    }

    const packageConfig = {
      name: dbPackage.name,
      description: dbPackage.description ?? "",
      fullPrice: dbPackage.full_price_cents,
      installmentPrice: dbPackage.installment_price_cents,
    };

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
    logger.error("MSW brand checkout error", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
