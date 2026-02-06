import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

const CREATOR_HOUSE_PRICE_CENTS = 140000; // $1,400

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { applicationId, gigId, modelId } = await request.json();

    // Validate input
    if (!applicationId || !gigId || !modelId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
      .select("id, title, slug, start_at, end_at, location_city, location_state")
      .eq("id", gigId)
      .single() as { data: { id: string; title: string; slug: string; start_at: string | null; end_at: string | null; location_city: string | null; location_state: string | null } | null };

    if (!gig) {
      return NextResponse.json({ error: "Gig not found" }, { status: 404 });
    }

    // Verify application exists and is accepted
    const { data: application } = await (supabase
      .from("gig_applications") as any)
      .select("id, status, payment_status")
      .eq("id", applicationId)
      .eq("gig_id", gigId)
      .eq("model_id", modelId)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "accepted") {
      return NextResponse.json(
        { error: "Application must be accepted before payment" },
        { status: 400 }
      );
    }

    if (application.payment_status === "paid") {
      return NextResponse.json(
        { error: "You have already paid for this spot" },
        { status: 400 }
      );
    }

    // Format dates for display
    const startDate = gig.start_at ? new Date(gig.start_at) : null;
    const endDate = gig.end_at ? new Date(gig.end_at) : null;
    let dateRange = "";
    if (startDate && endDate) {
      dateRange = `${startDate.toLocaleDateString("en-US", { month: "long", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
    }

    const location = [gig.location_city, gig.location_state].filter(Boolean).join(", ");

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Models Creator House - ${gig.title}`,
              description: `${dateRange}${location ? ` • ${location}` : ""} • Your spot at the Creator House`,
              images: ["https://www.examodels.com/og-image.png"],
            },
            unit_amount: CREATOR_HOUSE_PRICE_CENTS,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/gigs/${gig.slug}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/gigs/${gig.slug}?payment=cancelled`,
      customer_email: model.email || user.email,
      metadata: {
        type: "creator_house_payment",
        application_id: applicationId,
        gig_id: gigId,
        model_id: modelId,
      },
      payment_intent_data: {
        metadata: {
          type: "creator_house_payment",
          application_id: applicationId,
          gig_id: gigId,
          model_id: modelId,
        },
      },
    });

    // Update application with pending payment status
    await (supabase
      .from("gig_applications") as any)
      .update({
        payment_status: "pending",
        stripe_checkout_session_id: session.id,
      })
      .eq("id", applicationId);

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Creator House checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
