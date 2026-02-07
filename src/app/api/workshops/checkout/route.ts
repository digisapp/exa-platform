import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const workshopCheckoutSchema = z.object({
  workshopId: z.string().uuid(),
  quantity: z.number().int().min(1).max(5),
  buyerEmail: z.string().email(),
  buyerName: z.string().min(1),
  buyerPhone: z.string().optional(),
});

// Admin client for bypassing RLS
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_QUANTITY_PER_ORDER = 5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = workshopCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { workshopId, quantity, buyerEmail, buyerName, buyerPhone } = parsed.data;

    // Get workshop info
    const { data: workshop, error: workshopError } = await (adminClient
      .from("workshops") as any)
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
    if (!["upcoming", "active"].includes(workshop.status)) {
      return NextResponse.json(
        { error: "This workshop is not currently available for registration" },
        { status: 400 }
      );
    }

    // Check availability
    if (workshop.spots_available !== null) {
      const spotsLeft = workshop.spots_available - workshop.spots_sold;
      if (spotsLeft < quantity) {
        return NextResponse.json(
          { error: spotsLeft === 0 ? "This workshop is sold out" : `Only ${spotsLeft} spots remaining` },
          { status: 400 }
        );
      }
    }

    // Calculate totals
    const unitPriceCents = workshop.price_cents;
    const totalPriceCents = unitPriceCents * quantity;

    // Format date for product description
    const workshopDate = new Date(workshop.date);
    const dateStr = workshopDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: workshop.title,
              description: `${quantity} spot${quantity > 1 ? "s" : ""} - ${dateStr}${workshop.location_city ? ` - ${workshop.location_city}, ${workshop.location_state}` : ""}`,
              images: workshop.cover_image_url ? [workshop.cover_image_url] : [],
            },
            unit_amount: unitPriceCents,
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/workshops/${workshop.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/workshops/${workshop.slug}?cancelled=true`,
      customer_email: buyerEmail,
      metadata: {
        type: "workshop_registration",
        workshop_id: workshopId,
        workshop_slug: workshop.slug,
        quantity: quantity.toString(),
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || "",
      },
      payment_intent_data: {
        metadata: {
          type: "workshop_registration",
          workshop_id: workshopId,
        },
      },
    });

    // Create pending registration record
    const { error: registrationError } = await (adminClient
      .from("workshop_registrations") as any)
      .insert({
        workshop_id: workshopId,
        buyer_email: buyerEmail,
        buyer_name: buyerName,
        buyer_phone: buyerPhone || null,
        stripe_checkout_session_id: session.id,
        quantity: quantity,
        unit_price_cents: unitPriceCents,
        total_price_cents: totalPriceCents,
        status: "pending",
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
