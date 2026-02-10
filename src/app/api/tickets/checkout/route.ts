import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { TICKET_CONFIG } from "@/lib/ticket-config";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Admin client for bypassing RLS
const adminClient = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    // Rate limit (unauthenticated - IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const { tierId, quantity, buyerEmail, buyerName, buyerPhone } = await request.json();

    // Validate input
    if (!tierId || !quantity || !buyerEmail) {
      return NextResponse.json(
        { error: "Missing required fields: tierId, quantity, buyerEmail" },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > TICKET_CONFIG.MAX_QUANTITY_PER_ORDER) {
      return NextResponse.json(
        { error: `Quantity must be between 1 and ${TICKET_CONFIG.MAX_QUANTITY_PER_ORDER}` },
        { status: 400 }
      );
    }

    // Get ticket tier with event info
    const { data: tier, error: tierError } = await adminClient
      .from("ticket_tiers")
      .select(`
        id,
        event_id,
        name,
        slug,
        description,
        price_cents,
        quantity_available,
        quantity_sold,
        is_active,
        sale_starts_at,
        sale_ends_at,
        events (
          id,
          name,
          slug,
          tickets_enabled,
          cover_image_url
        )
      `)
      .eq("id", tierId)
      .single() as { data: any; error: any };

    if (tierError || !tier) {
      return NextResponse.json(
        { error: "Ticket tier not found" },
        { status: 404 }
      );
    }

    // Validate tier is purchasable
    if (!tier.is_active) {
      return NextResponse.json(
        { error: "This ticket tier is not currently available" },
        { status: 400 }
      );
    }

    if (!tier.events?.tickets_enabled) {
      return NextResponse.json(
        { error: "Ticket sales are not enabled for this event" },
        { status: 400 }
      );
    }

    // Check sale dates
    const now = new Date();
    if (tier.sale_starts_at && new Date(tier.sale_starts_at) > now) {
      return NextResponse.json(
        { error: "Ticket sales have not started yet" },
        { status: 400 }
      );
    }
    if (tier.sale_ends_at && new Date(tier.sale_ends_at) < now) {
      return NextResponse.json(
        { error: "Ticket sales have ended" },
        { status: 400 }
      );
    }

    // Check availability
    if (tier.quantity_available !== null) {
      const available = tier.quantity_available - tier.quantity_sold;
      if (available < quantity) {
        return NextResponse.json(
          { error: available === 0 ? "Sold out" : `Only ${available} tickets remaining` },
          { status: 400 }
        );
      }
    }

    // Read affiliate cookie for attribution
    const affiliateCookie = request.cookies.get(TICKET_CONFIG.AFFILIATE_COOKIE_NAME)?.value;
    let affiliateData: {
      modelId?: string;
      affiliateCode?: string;
      eventId?: string;
      clickId?: string;
    } | null = null;

    if (affiliateCookie) {
      try {
        affiliateData = JSON.parse(affiliateCookie);
      } catch {
        // Invalid cookie, ignore
      }
    }

    // Calculate totals
    const unitPriceCents = tier.price_cents;
    const totalPriceCents = unitPriceCents * quantity;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${tier.events.name} - ${tier.name}`,
              description: tier.description || `${quantity} ticket${quantity > 1 ? "s" : ""}`,
              images: tier.events.cover_image_url ? [tier.events.cover_image_url] : [],
            },
            unit_amount: unitPriceCents,
          },
          quantity: quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/shows/${tier.events.slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/shows/${tier.events.slug}?cancelled=true`,
      customer_email: buyerEmail,
      metadata: {
        type: "ticket_purchase",
        event_id: tier.event_id,
        tier_id: tierId,
        quantity: quantity.toString(),
        buyer_email: buyerEmail,
        buyer_name: buyerName || "",
        buyer_phone: buyerPhone || "",
        affiliate_model_id: affiliateData?.modelId || "",
        affiliate_click_id: affiliateData?.clickId || "",
      },
      payment_intent_data: {
        metadata: {
          type: "ticket_purchase",
          event_id: tier.event_id,
          tier_id: tierId,
        },
      },
    });

    // Create pending purchase record
    const { error: purchaseError } = await adminClient
      .from("ticket_purchases")
      .insert({
        ticket_tier_id: tierId,
        event_id: tier.event_id,
        buyer_email: buyerEmail,
        buyer_name: buyerName || null,
        buyer_phone: buyerPhone || null,
        stripe_checkout_session_id: session.id,
        quantity: quantity,
        unit_price_cents: unitPriceCents,
        total_price_cents: totalPriceCents,
        affiliate_model_id: affiliateData?.modelId || null,
        affiliate_click_id: affiliateData?.clickId || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (purchaseError) {
      console.error("Error creating purchase record:", purchaseError);
      // Don't fail the checkout - the webhook will handle it
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Ticket checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
