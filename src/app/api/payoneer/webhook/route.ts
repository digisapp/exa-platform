import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { verifyPayoneerWebhook, PayoneerWebhookPayload } from "@/lib/payoneer";

// Use service role for webhook processing
const supabase = createServiceRoleClient();

/**
 * Check if a Payoneer webhook event has already been processed.
 * Uses the payoneer_payouts table metadata to detect duplicate events,
 * falling back to an in-memory cache for events that don't touch payouts.
 */
async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  // Check payoneer_payouts for any record referencing this event
  const { data: existingPayout } = await supabase
    .from("payoneer_payouts")
    .select("id")
    .eq("payoneer_payout_id", eventId)
    .maybeSingle();

  if (existingPayout) {
    return true;
  }

  // Also check payoneer_accounts for status change events by looking at
  // the updated_at timestamp pattern (events are unique by event_id)
  // For non-payout events, fall back to in-memory cache as a secondary check
  if (processedEventsCache.has(eventId)) {
    return true;
  }

  return false;
}

// Secondary in-memory cache for non-payout events (e.g., payee status changes)
// that don't have a dedicated DB record to check against
const processedEventsCache = new Map<string, number>();
const EVENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old event IDs periodically
function cleanupProcessedEventsCache() {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEventsCache.entries()) {
    if (now - timestamp > EVENT_CACHE_TTL) {
      processedEventsCache.delete(eventId);
    }
  }
}

/**
 * POST /api/payoneer/webhook
 * Handle Payoneer webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-payoneer-signature") || "";
    const webhookSecret = process.env.PAYONEER_WEBHOOK_SECRET;
    const isProduction = process.env.NODE_ENV === "production";

    // SECURITY: Verify webhook signature
    // In production, signature verification is REQUIRED
    if (isProduction && !webhookSecret) {
      console.error("PAYONEER_WEBHOOK_SECRET not configured in production");
      return NextResponse.json(
        { error: "Webhook secret not configured" },
        { status: 500 }
      );
    }

    if (webhookSecret) {
      // When the secret is configured, always require a valid signature
      if (!signature) {
        console.error("Missing Payoneer webhook signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 401 }
        );
      }

      const isValid = verifyPayoneerWebhook(payload, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid Payoneer webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    } else {
      // Only reachable in development (production returns 500 above)
      console.warn(
        "PAYONEER_WEBHOOK_SECRET not set - skipping signature verification (development only)"
      );
    }

    const event: PayoneerWebhookPayload = JSON.parse(payload);

    // IDEMPOTENCY: Check database + in-memory cache for duplicate events
    if (event.event_id) {
      const alreadyProcessed = await isEventAlreadyProcessed(event.event_id);
      if (alreadyProcessed) {
        console.log("Duplicate Payoneer webhook event ignored:", event.event_id);
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    console.log("Payoneer webhook received:", event.event_type, event.event_id);

    // Mark event as processed in the in-memory cache (DB records are
    // created by the individual handlers for payout events)
    if (event.event_id) {
      processedEventsCache.set(event.event_id, Date.now());
      // Cleanup old events periodically
      if (processedEventsCache.size > 1000) {
        cleanupProcessedEventsCache();
      }
    }

    switch (event.event_type) {
      case "payee.status.changed":
        await handlePayeeStatusChanged(event);
        break;

      case "payout.completed":
        await handlePayoutCompleted(event);
        break;

      case "payout.failed":
        await handlePayoutFailed(event);
        break;

      case "payout.cancelled":
        await handlePayoutCancelled(event);
        break;

      default:
        console.log("Unhandled Payoneer webhook event:", event.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Payoneer webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle payee status change (e.g., registration completed)
 */
async function handlePayeeStatusChanged(event: PayoneerWebhookPayload) {
  const { payee_id, status } = event.data;

  if (!payee_id) return;

  const newStatus =
    status === "ACTIVE"
      ? "active"
      : status === "INACTIVE"
      ? "inactive"
      : status === "SUSPENDED"
      ? "suspended"
      : "pending";

  const canReceivePayments = status === "ACTIVE";

  const { error } = await supabase
    .from("payoneer_accounts")
    .update({
      status: newStatus,
      can_receive_payments: canReceivePayments,
      registration_completed_at: canReceivePayments
        ? new Date().toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("payee_id", payee_id);

  if (error) {
    console.error("Error updating payee status:", error);
  }
}

/**
 * Handle payout completed
 */
async function handlePayoutCompleted(event: PayoneerWebhookPayload) {
  const { payout_id } = event.data;

  if (!payout_id) return;

  // Update payoneer_payouts table
  const { data: payoneerPayout, error: updateError } = await supabase
    .from("payoneer_payouts")
    .update({
      status: "completed",
      payoneer_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("payoneer_payout_id", payout_id)
    .select("withdrawal_request_id")
    .single();

  if (updateError) {
    console.error("Error updating payout status:", updateError);
    return;
  }

  // Complete the withdrawal request
  if (payoneerPayout?.withdrawal_request_id) {
    const { error: withdrawalError } = await supabase.rpc("complete_withdrawal", {
      p_withdrawal_id: payoneerPayout.withdrawal_request_id,
    });

    if (withdrawalError) {
      console.error("Error completing withdrawal:", withdrawalError);
    }
  }
}

/**
 * Handle payout failed
 */
async function handlePayoutFailed(event: PayoneerWebhookPayload) {
  const { payout_id } = event.data;
  const failureReason =
    (event.data.failure_reason as string) || "Payout failed";

  if (!payout_id) return;

  // Update payoneer_payouts table
  const { data: payoneerPayout, error: updateError } = await supabase
    .from("payoneer_payouts")
    .update({
      status: "failed",
      failure_reason: failureReason,
      updated_at: new Date().toISOString(),
    })
    .eq("payoneer_payout_id", payout_id)
    .select("withdrawal_request_id")
    .single();

  if (updateError) {
    console.error("Error updating payout status:", updateError);
    return;
  }

  // Cancel the withdrawal (refund coins)
  if (payoneerPayout?.withdrawal_request_id) {
    const { error: cancelError } = await supabase.rpc("cancel_withdrawal", {
      p_withdrawal_id: payoneerPayout.withdrawal_request_id,
    });

    if (cancelError) {
      console.error("Error cancelling withdrawal:", cancelError);
    }

    // Update withdrawal with failure reason
    await supabase
      .from("withdrawal_requests")
      .update({
        status: "failed",
        failure_reason: `Payoneer: ${failureReason}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoneerPayout.withdrawal_request_id);

  }
}

/**
 * Handle payout cancelled
 */
async function handlePayoutCancelled(event: PayoneerWebhookPayload) {
  const { payout_id } = event.data;

  if (!payout_id) return;

  // Update payoneer_payouts table
  const { data: payoneerPayout, error: updateError } = await supabase
    .from("payoneer_payouts")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("payoneer_payout_id", payout_id)
    .select("withdrawal_request_id")
    .single();

  if (updateError) {
    console.error("Error updating payout status:", updateError);
    return;
  }

  // Cancel the withdrawal (refund coins)
  if (payoneerPayout?.withdrawal_request_id) {
    const { error: cancelError } = await supabase.rpc("cancel_withdrawal", {
      p_withdrawal_id: payoneerPayout.withdrawal_request_id,
    });

    if (cancelError) {
      console.error("Error cancelling withdrawal:", cancelError);
    }

  }
}
