import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const enterSchema = z.object({
  tier: z.enum(["standard", "crown", "elite"]),
  tagline: z.string().max(200, "Tagline must be 200 characters or less").optional(),
});

const TIER_PRICING: Record<string, number> = {
  standard: 29900,
  crown: 54900,
  elite: 79900,
};

const TIER_LABELS: Record<string, string> = {
  standard: "Standard",
  crown: "Crown",
  elite: "Elite",
};

// POST - Enter SwimCrown competition
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    // Validate input
    const validationResult = enterSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { tier, tagline } = validationResult.data;

    // Get actor and verify type is model
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single();

    if (!actor || actor.type !== "model") {
      return NextResponse.json(
        { error: "Only models can enter SwimCrown" },
        { status: 403 }
      );
    }

    // Get model_id
    const { data: model } = await supabase
      .from("models")
      .select("id, first_name, username")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json(
        { error: "Model profile not found" },
        { status: 400 }
      );
    }

    // Get current competition
    const { data: competition } = await (supabase as any)
      .from("swimcrown_competitions")
      .select("id, status, year, title")
      .order("year", { ascending: false })
      .limit(1)
      .single();

    if (!competition) {
      return NextResponse.json(
        { error: "No active competition found" },
        { status: 404 }
      );
    }

    if (competition.status !== "accepting_entries") {
      return NextResponse.json(
        { error: "Competition is not currently accepting entries" },
        { status: 400 }
      );
    }

    // Check for duplicate entry
    const { data: existingEntry } = await (supabase as any)
      .from("swimcrown_contestants")
      .select("id")
      .eq("competition_id", competition.id)
      .eq("model_id", model.id)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json(
        { error: "You have already entered this competition" },
        { status: 409 }
      );
    }

    const amountCents = TIER_PRICING[tier];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://examodels.com";

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `SwimCrown ${competition.year} - ${TIER_LABELS[tier]} Entry`,
              description: `${TIER_LABELS[tier]} tier entry into ${competition.title || "SwimCrown " + competition.year}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/swimcrown/enter/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/swimcrown/enter`,
      metadata: {
        type: "swimcrown_entry",
        model_id: model.id,
        competition_id: competition.id,
        tier,
        amount_cents: amountCents.toString(),
      },
      customer_email: user.email,
    });

    // Insert contestant row with pending status
    const { error: insertError } = await (supabase as any)
      .from("swimcrown_contestants")
      .insert({
        competition_id: competition.id,
        model_id: model.id,
        tier,
        tagline: tagline || null,
        stripe_session_id: session.id,
        payment_status: "pending",
        amount_cents: amountCents,
        status: "pending",
        vote_count: 0,
      });

    if (insertError) {
      console.error("SwimCrown entry insert error:", insertError);
      // Handle race condition: UNIQUE constraint violation means duplicate entry
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "You have already entered this competition" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to create entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("SwimCrown enter error:", error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 }
    );
  }
}
