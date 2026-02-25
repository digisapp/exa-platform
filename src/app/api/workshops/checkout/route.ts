import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const workshopCheckoutSchema = z.object({
  workshopId: z.string().uuid(),
  quantity: z.number().int().min(1).max(5),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional(),
  paymentType: z.enum(["full", "installment"]).default("full"),
});

// Admin client for bypassing RLS
const adminClient = createServiceRoleClient();


export async function POST(request: NextRequest) {
  try {
    // Rate limit (unauthenticated - IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const parsed = workshopCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { workshopId, quantity: requestedQuantity, buyerEmail, buyerName, buyerPhone, paymentType } = parsed.data;
    const quantity = paymentType === "installment" ? 1 : requestedQuantity;

    // Get workshop info
    const { data: workshop, error: workshopError } = await adminClient
      .from("workshops")
      .select("*")
      .eq("id", workshopId)
      .single();

    if (workshopError || !workshop) {
      return NextResponse.json(
        { error: "Workshop not found" },
        { status: 404 }
      );
    }

    // Validate workshop is available
    if (!workshop.status || !["upcoming", "active"].includes(workshop.status)) {
      return NextResponse.json(
        { error: "This workshop is not currently available for registration" },
        { status: 400 }
      );
    }

    // Check availability
    if (workshop.spots_available !== null) {
      const spotsLeft = workshop.spots_available - (workshop.spots_sold ?? 0);
      if (spotsLeft < quantity) {
        return NextResponse.json(
          { error: spotsLeft === 0 ? "This workshop is sold out" : `Only ${spotsLeft} spots remaining` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const unitPriceCents = workshop.price_cents;
    const isInstallment = paymentType === "installment";
    // Coaching program: $125/mo × 3 = $375 plan, $350 full — standard workshop: $125/mo × 3 = $375 plan
    const installmentAmountCents = 12500; // $125 per month for all workshops
    const installmentTotalCents = 37500;  // $375 total for 3-month plan
    const totalPriceCents = isInstallment ? installmentTotalCents : unitPriceCents * quantity;

    // Format date for product description
    const workshopDate = new Date(workshop.date);
    const dateStr = workshopDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Build Stripe checkout session config
    const checkoutConfig: any = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: isInstallment
                ? `${workshop.title} — Installment 1 of 3`
                : workshop.title,
              description: isInstallment
                ? `Payment plan: 3 x $125 — ${dateStr}${workshop.location_city ? ` — ${workshop.location_city}, ${workshop.location_state}` : ""}`
                : `${quantity} spot${quantity > 1 ? "s" : ""} - ${dateStr}${workshop.location_city ? ` - ${workshop.location_city}, ${workshop.location_state}` : ""}`,
              images: workshop.cover_image_url ? [workshop.cover_image_url] : [],
            },
            unit_amount: isInstallment ? installmentAmountCents : unitPriceCents,
          },
          quantity: isInstallment ? 1 : quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL}/workshops/${workshop.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL}/workshops/${workshop.slug}?cancelled=true`,
      customer_email: buyerEmail,
      metadata: {
        type: "workshop_registration",
        workshop_id: workshopId,
        workshop_slug: workshop.slug,
        quantity: quantity.toString(),
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || "",
        payment_type: paymentType,
        ...(isInstallment && {
          installment_number: "1",
          installments_total: "3",
          installment_amount: installmentAmountCents.toString(),
        }),
      },
      payment_intent_data: {
        metadata: {
          type: "workshop_registration",
          workshop_id: workshopId,
          payment_type: paymentType,
          ...(isInstallment && {
            installment_number: "1",
            installments_total: "3",
          }),
        },
        ...(isInstallment && {
          setup_future_usage: "off_session" as const,
        }),
      },
    };

    const session = await stripe.checkout.sessions.create(checkoutConfig);

    // Create pending registration record
    const { error: registrationError } = await adminClient
      .from("workshop_registrations")
      .insert({
        workshop_id: workshopId,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || null,
        stripe_checkout_session_id: session.id,
        quantity: quantity,
        unit_price_cents: isInstallment ? installmentAmountCents : unitPriceCents,
        total_price_cents: totalPriceCents,
        status: "pending",
        payment_type: paymentType,
        installments_total: isInstallment ? 3 : 1,
        installments_paid: 0,
      });

    if (registrationError) {
      console.error("Error creating registration record:", registrationError);
      // Don't fail the checkout - the webhook will handle it
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Workshop checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
