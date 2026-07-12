import { stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com";

// Package prices now live in the event_packages table (seeded cent-for-cent
// from the previous hardcoded PACKAGES dict). Legacy callers (the MSW designer
// page) omit eventSlug and get the historical MSW behavior unchanged; the
// generic /events/[slug] landing pages send eventSlug and get event-scoped
// success/cancel URLs. Package pricing always comes from event_packages.
const LEGACY_DEFAULT_EVENT_SLUG = "miami-swim-week-2026";

const mswCheckoutSchema = z.object({
  package: z.string().min(1),
  paymentType: z.enum(["full", "installment"]),
  addPhotoVideo: z.boolean().optional(),
  addExtraModels: z.boolean().optional(),
  // Optional event scope (slug). Omitted by the legacy MSW designer page.
  eventSlug: z.string().trim().regex(/^[a-z0-9-]+$/).max(120).optional(),
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
    const { package: pkg, paymentType, addPhotoVideo, addExtraModels, eventSlug } = parsed.data;

    // Look up the package price from the database.
    const admin = createServiceRoleClient();
    const slug = eventSlug || LEGACY_DEFAULT_EVENT_SLUG;
    const { data: event } = await admin
      .from("events")
      .select("id, slug, status")
      .eq("slug", slug)
      .single() as { data: { id: string; slug: string; status: string | null } | null };

    if (!event) {
      logger.error("Event package checkout: event not found", undefined, { slug });
      return NextResponse.json(
        { error: "Event not configured" },
        { status: eventSlug ? 404 : 500 }
      );
    }

    // Never sell packages for a cancelled event. (Legacy MSW calls are
    // unaffected — this only rejects events explicitly marked cancelled.)
    if (event.status === "cancelled") {
      return NextResponse.json({ error: "This event is no longer accepting partners" }, { status: 400 });
    }

    // Cast: event_packages is newer than the generated DB types.
    const { data: dbPackage } = await (admin as any)
      .from("event_packages")
      .select("name, description, full_price_cents, installment_price_cents, installments_available")
      .eq("event_id", event.id)
      .eq("key", pkg)
      .eq("is_active", true)
      .single() as {
        data: { name: string; description: string | null; full_price_cents: number; installment_price_cents: number; installments_available: boolean } | null;
      };

    if (!dbPackage) {
      return NextResponse.json({ error: "Unknown package" }, { status: 400 });
    }

    // Packages without a plan store installment_price_cents = full price, so a
    // 3-month "installment" subscription on them would charge 3x. Reject early.
    if (paymentType === "installment" && !dbPackage.installments_available) {
      return NextResponse.json(
        { error: "This package does not offer an installment plan — please choose the pay-in-full option." },
        { status: 400 }
      );
    }

    const packageConfig = {
      name: dbPackage.name,
      description: dbPackage.description ?? "",
      fullPrice: dbPackage.full_price_cents,
      installmentPrice: dbPackage.installment_price_cents,
    };

    // Shared Stripe metadata. `source` keeps its historical value for legacy
    // MSW designer-page calls so downstream reporting is unchanged.
    const checkoutMetadata = {
      package: pkg,
      payment_type: paymentType,
      add_extra_models: addExtraModels ? "true" : "false",
      add_photo_video: addPhotoVideo ? "true" : "false",
      source: eventSlug ? "event_landing_page" : "msw_brand_page",
      event_id: event.id,
      event_slug: event.slug,
    };

    // Legacy callers (no eventSlug) keep the historical MSW designer-page URLs.
    // Event-page callers return to their event landing page.
    const successUrl = eventSlug
      ? `${BASE_URL}/events/${event.slug}?checkout=success&session_id={CHECKOUT_SESSION_ID}&pkg=${encodeURIComponent(pkg)}&type=${paymentType}`
      : `${BASE_URL}/designers/miami-swim-week/success?session_id={CHECKOUT_SESSION_ID}&pkg=${pkg}&type=${paymentType}&media=${addPhotoVideo ? "1" : "0"}&models=${addExtraModels ? "20" : "15"}`;
    const cancelUrl = eventSlug
      ? `${BASE_URL}/events/${event.slug}`
      : `${BASE_URL}/designers/miami-swim-week`;

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
        metadata: checkoutMetadata,
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
        metadata: checkoutMetadata,
        subscription_data: {
          metadata: {
            ...checkoutMetadata,
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
