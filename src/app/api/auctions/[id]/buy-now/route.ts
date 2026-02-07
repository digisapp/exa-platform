import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import type { BuyNowResponse } from "@/types/auctions";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Buy now on an auction
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

    // Call the RPC function to buy now
    const { data: result, error } = await (supabase as any).rpc("buy_now_auction", {
      p_auction_id: auctionId,
      p_buyer_id: actor.id,
    });

    if (error) {
      console.error("Buy now error:", error);

      // Parse known error messages
      if (error.message.includes("Auction not found")) {
        return NextResponse.json({ error: "Auction not found" }, { status: 404 });
      }
      if (error.message.includes("not active")) {
        return NextResponse.json({ error: "This auction is not active" }, { status: 400 });
      }
      if (error.message.includes("Cannot buy your own")) {
        return NextResponse.json({ error: "Cannot buy your own auction" }, { status: 400 });
      }
      if (error.message.includes("no buy now price")) {
        return NextResponse.json({ error: "This auction does not have a buy now option" }, { status: 400 });
      }
      if (error.message.includes("Insufficient coin balance")) {
        return NextResponse.json({ error: "Insufficient coin balance" }, { status: 400 });
      }

      return NextResponse.json(
        { error: "Failed to complete purchase" },
        { status: 500 }
      );
    }

    // Get updated balance
    const { data: balanceResult } = await (supabase as any).rpc("get_actor_coin_balance", {
      p_actor_id: actor.id,
    });

    const response: BuyNowResponse = {
      success: true,
      amount: result.amount,
      new_balance: balanceResult || 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Buy now error:", error);
    return NextResponse.json(
      { error: "Failed to complete purchase" },
      { status: 500 }
    );
  }
}
