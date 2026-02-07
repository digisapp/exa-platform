import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const supabase: any = createServiceRoleClient();

// GET /api/cron/end-auctions - End expired auctions
// Runs every 5 minutes via Vercel cron
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error("Cron authentication failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find active auctions that have expired
    const { data: expiredAuctions, error: fetchError } = await supabase
      .from("auctions")
      .select("id, title")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Failed to fetch expired auctions:", fetchError);
      return NextResponse.json({ error: "Failed to fetch auctions" }, { status: 500 });
    }

    if (!expiredAuctions?.length) {
      return NextResponse.json({ message: "No expired auctions", ended: 0 });
    }

    // End each auction using the RPC function
    const results = await Promise.all(
      expiredAuctions.map(async (auction: { id: string; title: string }) => {
        try {
          const { data, error } = await supabase.rpc("end_auction", {
            p_auction_id: auction.id,
          });

          if (error) {
            console.error(`Failed to end auction ${auction.id} (${auction.title}):`, error);
            return { id: auction.id, title: auction.title, success: false, error: error.message };
          }

          return { id: auction.id, title: auction.title, success: true, result: data };
        } catch (err: any) {
          console.error(`Exception ending auction ${auction.id}:`, err);
          return { id: auction.id, title: auction.title, success: false, error: err.message };
        }
      })
    );

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`End auctions cron: ${succeeded} ended, ${failed} failed out of ${results.length}`);

    return NextResponse.json({
      message: `Processed ${results.length} expired auctions`,
      ended: succeeded,
      failed,
    });
  } catch (error) {
    console.error("End auctions cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
