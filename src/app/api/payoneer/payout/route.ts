import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { getPayoneerClient, isPayoneerConfigured } from "@/lib/payoneer";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// Admin client for bypassing RLS
const adminClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/payoneer/payout
 * Process a Payoneer payout (admin only)
 */
export async function POST(request: NextRequest) {
  try {
    if (!isPayoneerConfigured()) {
      return NextResponse.json(
        { error: "Payoneer is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit check
    const rateLimitResult = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResult) return rateLimitResult;

    // Admin check
    const { data: actor } = (await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single()) as { data: { type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { withdrawal_request_id } = body;

    if (!withdrawal_request_id) {
      return NextResponse.json(
        { error: "withdrawal_request_id is required" },
        { status: 400 }
      );
    }

    // Get withdrawal request with Payoneer account
    const { data: withdrawal, error: fetchError } = await adminClient
      .from("withdrawal_requests")
      .select(
        `
        id,
        model_id,
        coins,
        usd_amount,
        status,
        payout_method,
        payoneer_account_id,
        payoneer_accounts (
          id,
          payee_id,
          status,
          can_receive_payments
        )
      `
      )
      .eq("id", withdrawal_request_id)
      .single();

    if (fetchError || !withdrawal) {
      return NextResponse.json(
        { error: "Withdrawal request not found" },
        { status: 404 }
      );
    }

    // Validate status
    if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
      return NextResponse.json(
        { error: `Cannot process withdrawal with status: ${withdrawal.status}` },
        { status: 400 }
      );
    }

    // Validate payout method
    if (withdrawal.payout_method !== "payoneer") {
      return NextResponse.json(
        { error: "This withdrawal is not set for Payoneer payout" },
        { status: 400 }
      );
    }

    // Get Payoneer account
    const payoneerAccount = (withdrawal as any).payoneer_accounts;
    if (!payoneerAccount) {
      return NextResponse.json(
        { error: "No Payoneer account linked to this withdrawal" },
        { status: 400 }
      );
    }

    if (payoneerAccount.status !== "active" || !payoneerAccount.can_receive_payments) {
      return NextResponse.json(
        { error: "Payoneer account is not active or cannot receive payments" },
        { status: 400 }
      );
    }

    // Update withdrawal to processing
    await adminClient
      .from("withdrawal_requests")
      .update({
        status: "processing",
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", withdrawal_request_id);

    // Create payout via Payoneer
    const payoneer = getPayoneerClient();

    try {
      const payout = await payoneer.createPayout({
        payee_id: payoneerAccount.payee_id,
        amount: Number(withdrawal.usd_amount),
        currency: "USD",
        description: `EXA Models payout - ${withdrawal.coins} coins`,
        client_reference_id: withdrawal_request_id,
      });

      // Record the payout
      await adminClient.from("payoneer_payouts").insert({
        withdrawal_request_id,
        payoneer_payout_id: payout.payout_id,
        payee_id: payoneerAccount.payee_id,
        amount_usd: withdrawal.usd_amount,
        currency: "USD",
        status: payout.status.toLowerCase(),
        payoneer_created_at: payout.created_at,
      });

      // Update withdrawal with payout ID
      await adminClient
        .from("withdrawal_requests")
        .update({
          payoneer_payout_id: payout.payout_id,
          external_reference: payout.payout_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawal_request_id);

      return NextResponse.json({
        success: true,
        payout_id: payout.payout_id,
        status: payout.status,
        message: "Payout initiated successfully",
      });
    } catch (payoutError) {
      // Revert to pending on failure
      await adminClient
        .from("withdrawal_requests")
        .update({
          status: "pending",
          admin_notes: `Payoneer payout failed: ${payoutError instanceof Error ? payoutError.message : "Unknown error"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawal_request_id);

      throw payoutError;
    }
  } catch (error) {
    console.error("Payoneer payout error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payout failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payoneer/payout?id=<payout_id>
 * Check payout status
 */
export async function GET(request: NextRequest) {
  try {
    if (!isPayoneerConfigured()) {
      return NextResponse.json(
        { error: "Payoneer is not configured" },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Admin check
    const { data: actor } = (await supabase
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single()) as { data: { type: string } | null };

    if (!actor || actor.type !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payoutId = request.nextUrl.searchParams.get("id");
    if (!payoutId) {
      return NextResponse.json(
        { error: "Payout ID is required" },
        { status: 400 }
      );
    }

    const payoneer = getPayoneerClient();
    const status = await payoneer.getPayoutStatus(payoutId);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Payoneer payout status error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}
