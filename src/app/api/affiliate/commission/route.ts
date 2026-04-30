import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { logger } from "@/lib/logger";

const postSchema = z.object({
  orderId: z.string().min(1),
  eventId: z.string().min(1),
  // Either affiliateCode (model's unique code) or clickId (examodels click UUID) must be provided.
  // clickId is what digis.cc passes via the aff_sid query param.
  affiliateCode: z.string().min(1).optional(),
  clickId: z.string().uuid().optional(),
  saleAmountCents: z.number().int().min(1),
  commissionRate: z.number().min(0).max(1).default(0.20),
}).refine((d) => d.affiliateCode || d.clickId, {
  message: 'Either affiliateCode or clickId must be provided',
});

const patchSchema = z.object({
  commissionId: z.string().min(1),
  status: z.enum(["pending", "confirmed", "paid", "cancelled"]),
  paymentReference: z.string().optional(),
});

function verifyWebhookSecret(request: NextRequest): NextResponse | null {
  const webhookSecret = process.env.AFFILIATE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

// POST - Record a commission (called by ticket system webhook)
export async function POST(request: NextRequest) {
  try {
    // Rate limit (webhook-like, IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    // Verify webhook secret (mandatory)
    const authError = verifyWebhookSecret(request);
    if (authError) return authError;

    const rawBody = await request.json();
    const parsed = postSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { orderId, eventId, affiliateCode, clickId, saleAmountCents, commissionRate } = parsed.data;

    // Use admin client
    const adminClient = createServiceRoleClient();

    let modelId: string;
    let resolvedClickId: string | null = null;

    if (clickId) {
      // Resolve model from the click record (used when digis.cc passes aff_sid)
      const { data: click } = await adminClient
        .from("affiliate_clicks")
        .select("id, model_id")
        .eq("id", clickId)
        .single();

      if (!click) {
        return NextResponse.json({ error: "Invalid clickId — click not found" }, { status: 404 });
      }

      modelId = click.model_id;
      resolvedClickId = click.id;
    } else {
      // Resolve model from affiliate code
      const { data: model } = await adminClient
        .from("models")
        .select("id")
        .eq("affiliate_code", affiliateCode!)
        .single();

      if (!model) {
        return NextResponse.json({ error: "Invalid affiliate code" }, { status: 404 });
      }

      modelId = model.id;

      // Find the most recent click from this model for this event (best-effort attribution)
      const { data: recentClick } = await adminClient
        .from("affiliate_clicks")
        .select("id")
        .eq("model_id", modelId)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      resolvedClickId = recentClick?.id ?? null;
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

    // Calculate commission
    const commissionAmountCents = Math.round(saleAmountCents * commissionRate);

    // Record the commission
    const { data: commission, error } = await adminClient
      .from("affiliate_commissions")
      .insert({
        model_id: modelId,
        event_id: eventId,
        click_id: resolvedClickId,
        order_id: orderId,
        sale_amount_cents: saleAmountCents,
        commission_rate: commissionRate,
        commission_amount_cents: commissionAmountCents,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      logger.error("Error recording commission", error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      commission: {
        id: commission.id,
        modelId,
        saleAmountCents,
        commissionAmountCents,
        commissionRate,
      }
    });
  } catch (error) {
    logger.error("Record commission error", error);
    return NextResponse.json(
      { error: "Failed to record commission" },
      { status: 500 }
    );
  }
}

// PATCH - Update commission status (confirm or mark as paid)
export async function PATCH(request: NextRequest) {
  try {
    // Rate limit (webhook-like, IP-based)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general");
    if (rateLimitResponse) return rateLimitResponse;

    // Verify webhook secret (mandatory)
    const authError = verifyWebhookSecret(request);
    if (authError) return authError;

    const rawBody = await request.json();
    const parsed = patchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { commissionId, status, paymentReference } = parsed.data;

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
      logger.error("Error updating commission", error);
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
    logger.error("Update commission error", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}
