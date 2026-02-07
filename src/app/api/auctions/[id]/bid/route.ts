import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichBidsWithBidderInfo } from "@/lib/auction-utils";
import type { PlaceBidResponse } from "@/types/auctions";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

const placeBidSchema = z.object({
  amount: z.number().int().min(10).max(1000000),
  max_auto_bid: z.number().int().min(10).max(1000000).optional(),
});

// POST - Place a bid on an auction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "financial", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get actor
    const { data: actor } = await supabase
      .from("actors")
      .select("id")
      .eq("user_id", user.id)
      .single() as { data: { id: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = placeBidSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { amount, max_auto_bid } = parsed.data;

    // Validate max_auto_bid
    if (max_auto_bid && max_auto_bid < amount) {
      return NextResponse.json(
        { error: "Max auto-bid must be greater than or equal to bid amount" },
        { status: 400 }
      );
    }

    // Call the RPC function to place the bid
    const { data: result, error } = await (supabase as any).rpc("place_auction_bid", {
      p_auction_id: auctionId,
      p_bidder_id: actor.id,
      p_amount: amount,
      p_max_auto_bid: max_auto_bid || null,
    });

    if (error) {
      console.error("Place bid error:", error);

      // Parse known error messages
      if (error.message.includes("Auction not found")) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 });
      }
      if (error.message.includes("not active")) {
        return NextResponse.json({ error: "This auction is not active" }, { status: 400 });
      }
      if (error.message.includes("Cannot bid on your own")) {
        return NextResponse.json({ error: "Cannot bid on your own auction" }, { status: 400 });
      }
      if (error.message.includes("higher than current")) {
        return NextResponse.json({ error: "Bid must be higher than current bid" }, { status: 400 });
      }
      if (error.message.includes("meet the minimum")) {
        return NextResponse.json({ error: "Bid must be at least the starting price" }, { status: 400 });
      }
      if (error.message.includes("Insufficient coin balance")) {
        return NextResponse.json({ error: "Insufficient coin balance" }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to place bid" },
        { status: 500 }
      );
    }

    // Get updated balance
    const { data: balanceResult } = await (supabase as any).rpc("get_actor_coin_balance", {
      p_actor_id: actor.id,
    });

    // Map RPC field names to API response format
    const response: PlaceBidResponse = {
      success: true,
      bid_id: result.bid_id,
      final_amount: result.final_amount ?? result.amount ?? amount,
      escrow_deducted: result.escrow_deducted ?? 0,
      new_balance: balanceResult || 0,
      is_winning: result.is_winning ?? true,
      auction_extended: result.auction_extended ?? result.extended ?? false,
      new_end_time: result.new_end_time,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Place bid error:", error);
    return NextResponse.json(
      { error: "Failed to place bid" },
      { status: 500 }
    );
  }
}

// GET - Get bids for an auction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const supabase = await createClient();

    const { data: bids, error } = await (supabase as any)
      .from("auction_bids")
      .select(`
        id,
        amount,
        status,
        is_buy_now,
        created_at,
        bidder:actors!auction_bids_bidder_id_fkey (
          id,
          type
        )
      `)
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Get bids error:", error);
      throw error;
    }

    // Batch-enrich bids with bidder info (2 queries instead of N+1)
    const enhancedBids = await enrichBidsWithBidderInfo(supabase, bids || []);

    return NextResponse.json({ bids: enhancedBids });
  } catch (error) {
    console.error("Get bids error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
