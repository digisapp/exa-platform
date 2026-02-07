import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PlaceBidResponse } from "@/types/auctions";

const placeBidSchema = z.object({
  amount: z.number().int().min(10),
  max_auto_bid: z.number().int().min(10).optional(),
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
        { error: "Invalid input", details: parsed.error.flatten() },
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

    const response: PlaceBidResponse = {
      success: true,
      bid_id: result.bid_id,
      final_amount: result.final_amount,
      escrow_deducted: result.escrow_deducted,
      new_balance: balanceResult || 0,
      is_winning: result.is_winning,
      auction_extended: result.auction_extended,
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

    // Enhance bids with bidder info
    const enhancedBids = await Promise.all(
      (bids || []).map(async (bid: any) => {
        let bidderInfo = null;

        if (bid.bidder) {
          if (bid.bidder.type === "model") {
            const { data: model } = await (supabase as any)
              .from("models")
              .select("first_name, last_name, profile_photo_url")
              .eq("id", bid.bidder.id)
              .single();

            if (model) {
              bidderInfo = {
                id: bid.bidder.id,
                display_name: model.first_name
                  ? `${model.first_name} ${model.last_name || ""}`.trim()
                  : "Anonymous",
                profile_image_url: model.profile_photo_url,
                type: "model",
              };
            }
          } else if (bid.bidder.type === "fan") {
            const { data: fan } = await (supabase as any)
              .from("fans")
              .select("display_name, username, profile_photo_url")
              .eq("id", bid.bidder.id)
              .single();

            if (fan) {
              bidderInfo = {
                id: bid.bidder.id,
                display_name: fan.display_name || fan.username || "Anonymous",
                profile_image_url: fan.profile_photo_url,
                type: "fan",
              };
            }
          }
        }

        return {
          id: bid.id,
          amount: bid.amount,
          status: bid.status,
          is_buy_now: bid.is_buy_now,
          created_at: bid.created_at,
          bidder: bidderInfo,
        };
      })
    );

    return NextResponse.json({ bids: enhancedBids });
  } catch (error) {
    console.error("Get bids error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
