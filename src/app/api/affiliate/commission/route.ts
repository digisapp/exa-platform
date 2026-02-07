import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

// POST - Record a commission (called by ticket system webhook)
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret (simple auth for now)
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      orderId,
      eventId,
      affiliateCode,
      saleAmountCents,
      commissionRate = 0.20, // 20% default
    } = await request.json();

    if (!orderId || !eventId || !affiliateCode || !saleAmountCents) {
      return NextResponse.json({
        error: "Missing required fields: orderId, eventId, affiliateCode, saleAmountCents"
      }, { status: 400 });
    }

    // Use admin client
    const adminClient = createServiceRoleClient();

    // Find the model by affiliate code
    const { data: model } = await adminClient
      .from("models")
      .select("id")
      .eq("affiliate_code", affiliateCode)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
    }

    // Verify the event exists
    const { data: event } = await adminClient
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (!event) {
      return NextResponse.json({ error: "Invalid event ID" }, { status: 404 });
    }

    // Check if this order was already recorded (prevent duplicates)
    const { data: existingCommission } = await adminClient
      .from("affiliate_commissions")
      .select("id")
      .eq("order_id", orderId)
      .single();

    if (existingCommission) {
      return NextResponse.json({
        error: "Commission already recorded for this order",
        commissionId: existingCommission.id
      }, { status: 409 });
    }

    // Find the most recent click from this model for this event (for attribution)
    const { data: recentClick } = await adminClient
      .from("affiliate_clicks")
      .select("id")
      .eq("model_id", model.id)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Calculate commission
    const commissionAmountCents = Math.round(saleAmountCents * commissionRate);

    // Record the commission
    const { data: commission, error } = await adminClient
      .from("affiliate_commissions")
      .insert({
        model_id: model.id,
        event_id: eventId,
        click_id: recentClick?.id || null,
        order_id: orderId,
        sale_amount_cents: saleAmountCents,
        commission_rate: commissionRate,
        commission_amount_cents: commissionAmountCents,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error recording commission:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      commission: {
        id: commission.id,
        modelId: model.id,
        saleAmountCents,
        commissionAmountCents,
        commissionRate,
      }
    });
  } catch (error) {
    console.error("Record commission error:", error);
    return NextResponse.json(
      { error: "Failed to record commission" },
      { status: 500 }
    );
  }
}

// PATCH - Update commission status (confirm or mark as paid)
export async function PATCH(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get("authorization");
    const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET;

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      commissionId,
      status,
      paymentReference,
    } = await request.json();

    if (!commissionId || !status) {
      return NextResponse.json({
        error: "Missing required fields: commissionId, status"
      }, { status: 400 });
    }

    if (!["pending", "confirmed", "paid", "cancelled"].includes(status)) {
      return NextResponse.json({
        error: "Invalid status. Must be one of: pending, confirmed, paid, cancelled"
      }, { status: 400 });
    }

    // Use admin client
    const adminClient = createServiceRoleClient();

    const updateData: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "paid") {
      updateData.paid_at = new Date().toISOString();
      if (paymentReference) {
        updateData.payment_reference = paymentReference;
      }
    }

    const { data: commission, error } = await adminClient
      .from("affiliate_commissions")
      .update(updateData)
      .eq("id", commissionId)
      .select()
      .single();

    if (error) {
      console.error("Error updating commission:", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      commission: {
        id: commission.id,
        status: commission.status,
        paidAt: commission.paid_at,
      }
    });
  } catch (error) {
    console.error("Update commission error:", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}
