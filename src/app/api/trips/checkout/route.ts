import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { z } from "zod";

const tripCheckoutSchema = z.object({
  gigId: z.string().uuid(),
  modelId: z.string().uuid(),
  tripNumber: z.union([z.literal(1), z.literal(2)]),
});

const TRIP_PRICE_CENTS = 140000; // $1,400

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = tripCheckoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { gigId, modelId, tripNumber } = parsed.data;

    // Verify model belongs to user
    const { data: model } = await supabase
      .from("models")
      .select("id, email, first_name, last_name")
      .eq("id", modelId)
      .eq("user_id", user.id)
      .single() as { data: { id: string; email: string | null; first_name: string | null; last_name: string | null } | null };

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    // Get gig details
    const { data: gig } = await supabase
      .from("gigs")
      .select("id, title, slug")
      .eq("id", gigId)
      .single() as { data: { id: string; title: string; slug: string } | null };

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Check for existing application
    const { data: existingApp } = await supabase
      .from("gig_applications")
      .select("id, status, payment_status")
      .eq("gig_id", gigId)
      .eq("model_id", modelId)
      .single() as { data: { id: string; status: string; payment_status: string | null } | null };

    if (existingApp) {
      if (existingApp.payment_status === "paid") {
        return NextResponse.json(
          { error: "You have already paid for this trip" },
          { status: 400 }
        );
      }
      if (existingApp.status === "approved") {
        return NextResponse.json(
          { error: "You have already been approved for this trip" },
          { status: 400 }
        );
      }
    }

    // Create Stripe checkout session
    const tripDates = tripNumber === 1
      ? "February 19 - February 23, 2026"
      : "February 26 - March 2, 2026";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `EXA X DIGIS Content Trip - Trip ${tripNumber}`,
              description: `${tripDates} • Las Terrenas, Dominican Republic • Your own bed`,
              images: [`${process.env.NEXT_PUBLIC_APP_URL || "https://www.examodels.com"}/og-image.png`],
            },
            unit_amount: TRIP_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gigs/${gig.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gigs/${gig.slug}?payment=cancelled`,
      customer_email: model.email || user.email,
      metadata: {
        type: "trip_application",
        gig_id: gigId,
        model_id: modelId,
        trip_number: tripNumber.toString(),
        spot_type: "paid",
      },
      payment_intent_data: {
        metadata: {
          type: "trip_application",
          gig_id: gigId,
          model_id: modelId,
          trip_number: tripNumber.toString(),
        },
      },
    });

    // Create or update the application with pending payment status
    if (existingApp) {
      await (supabase
        .from("gig_applications") as any)
        .update({
          trip_number: tripNumber,
          spot_type: "paid",
          payment_status: "pending",
          stripe_checkout_session_id: session.id,
          status: "pending",
        })
        .eq("id", existingApp.id);
    } else {
      await (supabase
        .from("gig_applications") as any)
        .insert({
          gig_id: gigId,
          model_id: modelId,
          trip_number: tripNumber,
          spot_type: "paid",
          payment_status: "pending",
          stripe_checkout_session_id: session.id,
          status: "pending",
        });
    }

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Trip checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
