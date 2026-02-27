import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichBidsWithBidderInfo } from "@/lib/auction-utils";
import type { PlaceBidResponse } from "@/types/auctions";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { sendAuctionOutbidEmail } from "@/lib/email";

const adminClient = createServiceRoleClient();

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
      .single();

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

    // Capture current leading bid + auction info before placing (for outbid notification)
    const { data: auctionBefore } = await adminClient
      .from("auctions")
      .select("title, current_bid, leading_bidder_id")
      .eq("id", auctionId)
      .single() as { data: { title: string; current_bid: number; leading_bidder_id: string | null } | null };

    // Call the RPC function to place the bid
    const { data: result, error } = await supabase.rpc("place_auction_bid", {
      p_auction_id: auctionId,
      p_bidder_id: actor.id,
      p_amount: amount,
      p_max_auto_bid: max_auto_bid || undefined,
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

    // Notify the outbid user if they were previously leading and have notify_outbid enabled
    if (auctionBefore?.leading_bidder_id && auctionBefore.leading_bidder_id !== actor.id) {
      try {
        const { data: watchlistEntry } = await adminClient
          .from("auction_watchlist")
          .select("notify_outbid")
          .eq("auction_id", auctionId)
          .eq("actor_id", auctionBefore.leading_bidder_id)
          .single() as { data: { notify_outbid: boolean } | null };

        if (watchlistEntry?.notify_outbid !== false) {
          const { data: outbidActor } = await adminClient
            .from("actors")
            .select("user_id, fans(display_name), models(first_name, last_name)")
            .eq("id", auctionBefore.leading_bidder_id)
            .single() as { data: any };

          if (outbidActor?.user_id) {
            const { data: authUser } = await adminClient.auth.admin.getUserById(outbidActor.user_id);
            const email = authUser?.user?.email;
            if (email) {
              const bidderName = outbidActor.fans?.display_name
                || [outbidActor.models?.first_name, outbidActor.models?.last_name].filter(Boolean).join(" ")
                || "Bidder";
              await sendAuctionOutbidEmail({
                to: email,
                bidderName,
                auctionTitle: auctionBefore.title,
                auctionId,
                currentBid: amount,
                yourBid: auctionBefore.current_bid,
              });
            }
          }
        }
      } catch (emailErr) {
        console.error("Failed to send outbid email:", emailErr);
      }
    }

    // Get updated balance
    const { data: balanceResult } = await supabase.rpc("get_actor_coin_balance", {
      p_actor_id: actor.id,
    });

    // Map RPC field names to API response format
    const bidResult = result as Record<string, any>;
    const response: PlaceBidResponse = {
      success: true,
      bid_id: bidResult.bid_id,
      final_amount: bidResult.final_amount ?? bidResult.amount ?? amount,
      escrow_deducted: bidResult.escrow_deducted ?? 0,
      new_balance: balanceResult || 0,
      is_winning: bidResult.is_winning ?? true,
      auction_extended: bidResult.auction_extended ?? bidResult.extended ?? false,
      new_end_time: bidResult.new_end_time,
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

    // Use admin client to bypass actors RLS — fan actor rows are blocked for unauthenticated
    // users, but bid history on active auctions is intentionally public
    const { data: bids, error } = await (adminClient as any)
      .from("auction_bids")
      .select(`
        id,
        bidder_id,
        amount,
        status,
        is_buy_now,
        created_at,
        bidder:actors (
          id,
          type
        )
      `)
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Get bids error:", error);
      // Return empty rather than 500 so the UI still updates
      return NextResponse.json({ bids: [] });
    }

    // Batch-enrich bids with bidder info (2 queries instead of N+1)
    try {
      const enhancedBids = await enrichBidsWithBidderInfo(adminClient, bids || []);
      return NextResponse.json({ bids: enhancedBids });
    } catch (enrichErr) {
      console.error("Bid enrichment error:", enrichErr);
      // Return raw bids without enrichment so the history still shows
      return NextResponse.json({ bids: bids || [] });
    }
  } catch (error) {
    console.error("Get bids error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bids" },
      { status: 500 }
    );
  }
}
