import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

const adminClient = createServiceRoleClient();

// POST /api/auctions/[id]/cancel - Cancel an active auction and refund all escrows
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

    // Get model profile
    const { data: model } = await (supabase as any)
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get auction and verify ownership + status
    const { data: auction } = await adminClient
      .from("auctions")
      .select("id, model_id, status, title, bid_count")
      .eq("id", auctionId)
      .single() as { data: { id: string; model_id: string; status: string; title: string; bid_count: number } | null };

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.model_id !== model.id) {
      return NextResponse.json({ error: "Not your auction" }, { status: 403 });
    }

    if (auction.status !== "active") {
      return NextResponse.json(
        { error: "Only active auctions can be cancelled" },
        { status: 400 }
      );
    }

    // Refund all escrows (p_exclude_bidder_id defaults to NULL — refunds everyone)
    const { error: refundError } = await (adminClient as any).rpc("refund_auction_escrows", {
      p_auction_id: auctionId,
    });

    if (refundError) {
      console.error("Refund escrows error:", refundError);
      return NextResponse.json(
        { error: "Failed to refund bidders" },
        { status: 500 }
      );
    }

    // Mark auction as cancelled
    const { error: updateError } = await adminClient
      .from("auctions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", auctionId);

    if (updateError) {
      console.error("Cancel auction update error:", updateError);
      return NextResponse.json(
        { error: "Failed to cancel auction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel auction error:", error);
    return NextResponse.json(
      { error: "Failed to cancel auction" },
      { status: 500 }
    );
  }
}
