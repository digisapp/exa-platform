import { createServiceRoleClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// POST /api/admin/restart-auctions - Restart all ended auctions that received no bids
export async function POST(request: NextRequest) {
  try {
    // Auth check - admin only
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: actor } = await (userSupabase as any)
      .from("actors")
      .select("type")
      .eq("user_id", user.id)
      .single();

    if (actor?.type !== "admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const supabase: any = createServiceRoleClient();

    // Step 1: End any active auctions that have expired (status still 'active' but ends_at passed)
    const { data: stuckActive, error: stuckError } = await supabase
      .from("auctions")
      .select("id, title")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    let ended = 0;
    if (!stuckError && stuckActive?.length) {
      for (const auction of stuckActive) {
        const { error } = await supabase.rpc("end_auction", {
          p_auction_id: auction.id,
        });
        if (!error) ended++;
        else console.error(`Failed to end auction ${auction.id}:`, error);
      }
    }

    // Step 2: Restart all no_sale auctions with 0 bids
    const { data: noSaleAuctions, error: noSaleError } = await supabase
      .from("auctions")
      .select("id, title, created_at, original_end_at")
      .eq("status", "no_sale")
      .eq("bid_count", 0);

    let restarted = 0;
    const restartedAuctions: string[] = [];

    if (!noSaleError && noSaleAuctions?.length) {
      for (const auction of noSaleAuctions) {
        const originalDuration = new Date(auction.original_end_at).getTime() - new Date(auction.created_at).getTime();
        const duration = Math.min(
          Math.max(originalDuration, 60 * 60 * 1000),
          7 * 24 * 60 * 60 * 1000
        );
        const newEndsAt = new Date(Date.now() + duration).toISOString();

        const { error: restartError } = await supabase
          .from("auctions")
          .update({
            status: "active",
            ends_at: newEndsAt,
            original_end_at: newEndsAt,
            current_bid: null,
            bid_count: 0,
            winner_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", auction.id);

        if (!restartError) {
          restarted++;
          restartedAuctions.push(auction.title);
        }
      }
    }

    return NextResponse.json({
      success: true,
      ended,
      restarted,
      restartedAuctions,
    });
  } catch (error) {
    console.error("Restart auctions error:", error);
    return NextResponse.json({ error: "Failed to restart auctions" }, { status: 500 });
  }
}
