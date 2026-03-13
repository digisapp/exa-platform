import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { stripe } from "@/lib/stripe";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const adminClient = createServiceRoleClient();

const COHORT_LABELS: Record<string, string> = {
  "miami-swim-week": "Miami Swim Week",
  "nyfw": "New York Fashion Week",
  "art-basel": "Art Basel",
};

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const { email, name, phone, cohort, paymentType } = await request.json();

    // Validate
    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!cohort || !["miami-swim-week", "nyfw", "art-basel"].includes(cohort)) {
      return NextResponse.json({ error: "Valid cohort is required" }, { status: 400 });
    }
    if (!paymentType || !["full", "installment"].includes(paymentType)) {
      return NextResponse.json({ error: "Valid payment type is required" }, { status: 400 });
    }

    // Find the application
    const currentYear = new Date().getFullYear();
    const { data: application } = await (adminClient as any)
      .from("academy_applications")
      .select("id, status")
      .eq("applicant_email", email.trim().toLowerCase())
      .eq("cohort", cohort)
      .eq("cohort_year", currentYear)
      .eq("status", "applied")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application) {
      return NextResponse.json(
        { error: "Application not found. Please submit an application first." },
        { status: 400 }
      );
    }

    const cohortLabel = COHORT_LABELS[cohort] || cohort;
    const isInstallment = paymentType === "installment";
    const fullPriceCents = 199500; // $1,995
    const installmentAmountCents = 49900; // $499
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `EXA Beauty Academy — ${cohortLabel} Cohort`,
              description: isInstallment
                ? "First installment (1 of 4) — 8-week runway makeup certification program"
                : "Full tuition — 8-week runway makeup certification program",
            },
            unit_amount: isInstallment ? installmentAmountCents : fullPriceCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/academy/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/academy?cancelled=true`,
      customer_email: email.trim().toLowerCase(),
      metadata: {
        type: "academy_enrollment",
        application_id: application.id,
        cohort,
        cohort_year: currentYear.toString(),
        buyer_email: email.trim().toLowerCase(),
        buyer_name: name.trim(),
        buyer_phone: phone || "",
        payment_type: paymentType,
      },
    });

    // Update application with checkout session info
    await (adminClient as any)
      .from("academy_applications")
      .update({
        stripe_checkout_session_id: session.id,
        payment_type: paymentType,
        price_cents: isInstallment ? installmentAmountCents * 4 : fullPriceCents,
        installments_total: isInstallment ? 4 : 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
    });
  } catch (error) {
    console.error("Academy checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
