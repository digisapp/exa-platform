import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// POST - Publish/activate an auction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auctionId } = await params;
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Get model
    const { data: model } = await supabase
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get auction
    const { data: auction } = await supabase
      .from("auctions")
      .select("id, model_id, status, ends_at, starting_price, buy_now_price, reserve_price")
      .eq("id", auctionId)
      .single();

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.model_id !== model.id) {
      return NextResponse.json({ error: "Not your auction" }, { status: 403 });
    }

    if (auction.status !== "draft") {
      return NextResponse.json(
        { error: "Auction is already published or ended" },
        { status: 400 }
      );
    }

    // Validate ends_at is in the future
    if (new Date(auction.ends_at) <= new Date()) {
      return NextResponse.json(
        { error: "Auction end time must be in the future" },
        { status: 400 }
      );
    }

    // Validate buy_now_price is greater than starting_price
    if (auction.buy_now_price && auction.buy_now_price <= auction.starting_price) {
      return NextResponse.json(
        { error: "Buy now price must be greater than starting price" },
        { status: 400 }
      );
    }

    // Validate reserve_price is greater than starting_price
    if (auction.reserve_price && auction.reserve_price <= auction.starting_price) {
      return NextResponse.json(
        { error: "Reserve price must be greater than starting price" },
        { status: 400 }
      );
    }

    // Activate the auction
    const { data: updated, error } = await supabase
      .from("auctions")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", auctionId)
      .select()
      .single();

    if (error) {
      console.error("Publish auction error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, auction: updated });
  } catch (error) {
    console.error("Publish auction error:", error);
    return NextResponse.json(
      { error: "Failed to publish auction" },
      { status: 500 }
    );
  }
}
