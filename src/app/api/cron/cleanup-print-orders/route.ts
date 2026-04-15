import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

// GET /api/cron/cleanup-print-orders - Cancel stale pending_payment print orders
// Runs daily at 4am via Vercel cron
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase: any = createServiceRoleClient();

    // Find pending_payment orders older than 24 hours (abandoned checkouts)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: staleOrders, error: fetchError } = await supabase
      .from("comp_card_print_orders")
      .select("id, email, storage_path")
      .eq("status", "pending_payment")
      .lt("created_at", cutoff);

    if (fetchError) {
      logger.error("Failed to fetch stale print orders", fetchError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    if (!staleOrders?.length) {
      return NextResponse.json({ message: "No stale orders", cancelled: 0 });
    }

    let cancelled = 0;

    for (const order of staleOrders) {
      // Cancel the order
      const { error: updateError } = await supabase
        .from("comp_card_print_orders")
        .update({
          status: "cancelled",
          notes: "Auto-cancelled: payment not completed within 24 hours",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        logger.error("Failed to cancel stale order", updateError, { orderId: order.id });
        continue;
      }

      // Clean up the uploaded PDF from storage
      if (order.storage_path) {
        const { error: deleteError } = await supabase.storage
          .from("portfolio")
          .remove([order.storage_path]);

        if (deleteError) {
          logger.error("Failed to delete PDF for order", deleteError, { orderId: order.id });
        }
      }

      cancelled++;
    }

    logger.info("Cleanup print orders complete", { cancelled });

    return NextResponse.json({
      message: `Cancelled ${cancelled} stale print orders`,
      cancelled,
    });
  } catch (error) {
    logger.error("Cleanup print orders cron error", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
