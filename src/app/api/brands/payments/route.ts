import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor and verify it's a brand
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "brand") {
      return NextResponse.json({ error: "Not a brand account" }, { status: 400 });
    }

    // Get brand data
    const { data: brand } = await (supabase
      .from("brands") as any)
      .select("stripe_customer_id, subscription_tier, subscription_status, billing_cycle, coins_granted_at")
      .eq("id", actor.id)
      .single();

    if (!brand?.stripe_customer_id) {
      return NextResponse.json({ payments: [], subscription: null });
    }

    // Fetch invoices from Stripe
    const invoices = await stripe.invoices.list({
      customer: brand.stripe_customer_id,
      limit: 20,
    });

    const payments = invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      status: invoice.status,
      created: invoice.created,
      period_start: invoice.period_start,
      period_end: invoice.period_end,
      invoice_pdf: invoice.invoice_pdf,
      hosted_invoice_url: invoice.hosted_invoice_url,
      description: invoice.lines.data[0]?.description || "Subscription",
    }));

    return NextResponse.json({
      payments,
      subscription: {
        tier: brand.subscription_tier,
        status: brand.subscription_status,
        billing_cycle: brand.billing_cycle,
        coins_granted_at: brand.coins_granted_at,
      },
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}
