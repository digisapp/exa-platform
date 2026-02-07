import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const supabase = createServiceRoleClient();

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "financial");
    if (rateLimitResponse) return rateLimitResponse;

    const { session_id, closing_cash, notes } = await request.json();

    if (!session_id) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    if (closing_cash === undefined || closing_cash < 0) {
      return NextResponse.json({ error: "Invalid closing cash amount" }, { status: 400 });
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from("pos_drawer_sessions")
      .select("*")
      .eq("id", session_id)
      .eq("status", "open")
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Session not found or already closed" }, { status: 404 });
    }

    // Calculate expected cash from transactions during this session
    const { data: transactions } = await supabase
      .from("pos_transactions")
      .select("payment_method, amount")
      .gte("created_at", session.opened_at)
      .eq("status", "completed");

    let totalCashSales = 0;
    let totalCardSales = 0;
    let totalTransactions = 0;

    if (transactions) {
      transactions.forEach((t: any) => {
        totalTransactions++;
        if (t.payment_method === "cash") {
          totalCashSales += t.amount;
        } else {
          totalCardSales += t.amount;
        }
      });
    }

    const expectedCash = session.opening_cash + totalCashSales;
    const cashDifference = closing_cash - expectedCash;

    // Update session
    const { error: updateError } = await supabase
      .from("pos_drawer_sessions")
      .update({
        closed_at: new Date().toISOString(),
        closing_cash,
        expected_cash: expectedCash,
        cash_difference: cashDifference,
        total_sales: totalCashSales + totalCardSales,
        total_cash_sales: totalCashSales,
        total_card_sales: totalCardSales,
        total_transactions: totalTransactions,
        status: "closed",
        notes,
      })
      .eq("id", session_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error closing drawer:", updateError);
      return NextResponse.json({ error: "Failed to close drawer" }, { status: 500 });
    }

    return NextResponse.json({
      summary: {
        opening_cash: session.opening_cash,
        closing_cash,
        expected_cash: expectedCash,
        difference: cashDifference,
        total_sales: totalCashSales + totalCardSales,
        total_cash_sales: totalCashSales,
        total_card_sales: totalCardSales,
        total_transactions: totalTransactions,
        status: Math.abs(cashDifference) < 0.01 ? "balanced" : cashDifference > 0 ? "over" : "short",
      },
    });
  } catch (error) {
    console.error("Drawer close error:", error);
    return NextResponse.json({ error: "Failed to close drawer" }, { status: 500 });
  }
}
