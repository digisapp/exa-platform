import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";

// Admin client for bypassing RLS
const adminClient = createServiceRoleClient();

// Content Program pricing - $500/month subscription
const MONTHLY_RATE_CENTS = 50000; // $500

export async function POST(request: NextRequest) {
  try {
    const { brandName, contactName, email, phone, website, instagram } = await request.json();

    // Validate input
    if (!brandName || !contactName || !email) {
      return NextResponse.json(
        { error: "Brand name, contact name, and email are required" },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email: email.toLowerCase(),
        name: contactName,
        metadata: {
          brand_name: brandName,
          type: "content_program",
        },
      });
    }

    // Create Stripe checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Swimwear Content Program",
              description: `Monthly content program for ${brandName} - 10 videos + 50 photos per month. Each payment credits toward $3,000 Miami Swim Week package.`,
            },
            unit_amount: MONTHLY_RATE_CENTS,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/swimwear-content/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/swimwear-content?cancelled=true`,
      customer: customer.id,
      subscription_data: {
        metadata: {
          type: "content_program",
          brand_name: brandName,
          contact_name: contactName,
          email: email.toLowerCase(),
          phone: phone || "",
          website_url: website || "",
          instagram_handle: instagram || "",
        },
      },
      metadata: {
        type: "content_program_subscription",
        brand_name: brandName,
        contact_name: contactName,
        email: email.toLowerCase(),
        phone: phone || "",
        website_url: website || "",
        instagram_handle: instagram || "",
      },
    });

    // Create pending enrollment record
    const { error: enrollmentError } = await (adminClient as any)
      .from("content_program_enrollments")
      .insert({
        brand_name: brandName.trim(),
        contact_email: email.trim().toLowerCase(),
        contact_name: contactName.trim(),
        phone: phone?.trim() || null,
        website_url: website?.trim() || null,
        instagram_handle: instagram?.trim() || null,
        stripe_checkout_session_id: session.id,
        stripe_customer_id: customer.id,
        start_date: new Date().toISOString().split("T")[0],
        monthly_rate: MONTHLY_RATE_CENTS / 100,
        swim_week_package_cost: 3000.00,
        swim_week_target_date: "2026-05-26",
        status: "pending",
      });

    if (enrollmentError) {
      console.error("Error creating enrollment record:", enrollmentError);
      // Don't fail the checkout - the webhook will handle it
    }

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Content program checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
