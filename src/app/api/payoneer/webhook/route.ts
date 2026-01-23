import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { verifyPayoneerWebhook, PayoneerWebhookPayload } from "@/lib/payoneer";

// Use service role for webhook processing
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// In-memory cache for processed event IDs (for idempotency)
// In production, you might want to use Redis or a database table
const processedEvents = new Map<string, number>();
const EVENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Clean up old event IDs periodically
function cleanupProcessedEvents() {
  const now = Date.now();
  for (const [eventId, timestamp] of processedEvents.entries()) {
    if (now - timestamp > EVENT_CACHE_TTL) {
      processedEvents.delete(eventId);
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
        { error: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (webhookSecret) {
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
    }

    const event: PayoneerWebhookPayload = JSON.parse(payload);

    // IDEMPOTENCY: Check if we've already processed this event
    if (event.event_id && processedEvents.has(event.event_id)) {
      console.log("Duplicate Payoneer webhook event ignored:", event.event_id);
      return NextResponse.json({ received: true, duplicate: true });
    }

    console.log("Payoneer webhook received:", event.event_type, event.event_id);

    // Mark event as processed
    if (event.event_id) {
      processedEvents.set(event.event_id, Date.now());
      // Cleanup old events periodically
      if (processedEvents.size > 1000) {
        cleanupProcessedEvents();
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
  } else {
    console.log(`Payee ${payee_id} status updated to ${newStatus}`);
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
    } else {
      console.log(
        `Withdrawal ${payoneerPayout.withdrawal_request_id} completed via Payoneer`
      );
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

    console.log(
      `Withdrawal ${payoneerPayout.withdrawal_request_id} failed: ${failureReason}`
    );
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

    console.log(
      `Withdrawal ${payoneerPayout.withdrawal_request_id} cancelled via Payoneer`
    );
  }
}
