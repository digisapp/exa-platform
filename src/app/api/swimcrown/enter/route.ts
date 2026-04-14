import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const enterSchema = z.object({
  tier: z.enum(["standard", "full_package"]),
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email"),
  instagram: z.string().min(1, "Instagram is required").max(200),
  phone: z.string().min(1, "Phone is required").max(50),
});

const TIER_PRICING: Record<string, number> = {
  standard: 17500,
  full_package: 39900,
};

const TIER_LABELS: Record<string, string> = {
  standard: "Runway",
  full_package: "Runway + Glam",
};

// POST - Enter SwimCrown competition (no auth required)
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP since there's no user
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();

    const validationResult = enterSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0];
      return NextResponse.json(
        { error: firstError.message },
        { status: 400 }
      );
    }

    const { tier, fullName, email, instagram, phone } = validationResult.data;

    const adminClient = createServiceRoleClient();

    // Get current competition
    const { data: competition } = await (adminClient as any)
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

    // Check for duplicate entry by email
    const { data: existingEntry } = await (adminClient as any)
      .from("swimcrown_contestants")
      .select("id")
      .eq("competition_id", competition.id)
      .eq("email", email)
      .maybeSingle();

    if (existingEntry) {
      return NextResponse.json(
        { error: "This email has already been used to enter the competition" },
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
              name: `SwimCrown ${competition.year} — ${TIER_LABELS[tier]}`,
              description: `${TIER_LABELS[tier]} entry into SwimCrown ${competition.year} at Miami Swim Week`,
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
        competition_id: competition.id,
        tier,
        full_name: fullName,
        email,
        instagram,
        phone,
        amount_cents: amountCents.toString(),
      },
      customer_email: email,
    });

    // Insert contestant row with pending status
    const { error: insertError } = await (adminClient as any)
      .from("swimcrown_contestants")
      .insert({
        competition_id: competition.id,
        tier,
        full_name: fullName,
        email,
        instagram,
        phone,
        stripe_session_id: session.id,
        payment_status: "pending",
        amount_cents: amountCents,
        status: "pending",
        vote_count: 0,
      });

    if (insertError) {
      console.error("SwimCrown entry insert error:", insertError);
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "This email has already been used to enter the competition" },
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
