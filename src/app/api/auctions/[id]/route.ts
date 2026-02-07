import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enrichBidsWithBidderInfo } from "@/lib/auction-utils";
import type { AuctionWithDetails } from "@/types/auctions";

const updateAuctionSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  deliverables: z.string().max(2000).optional(),
  cover_image_url: z.string().url().optional().nullable(),
  category: z.enum(["video_call", "custom_content", "meet_greet", "shoutout", "experience", "other"]).optional(),
  starting_price: z.number().int().min(10).optional(),
  reserve_price: z.number().int().min(10).optional().nullable(),
  buy_now_price: z.number().int().min(10).optional().nullable(),
  ends_at: z.string().datetime().optional(),
  allow_auto_bid: z.boolean().optional(),
  anti_snipe_minutes: z.number().int().min(0).max(10).optional(),
});

// GET - Get single auction with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Get auction with model info
    const { data: auction, error } = await (supabase as any)
      .from("auctions")
      .select(`
        *,
        model:models!auctions_model_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url,
          username,
          user_id
        )
      `)
      .eq("id", id)
      .single();

    if (error || !auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Get watchlist count
    const { count: watchlistCount } = await (supabase as any)
      .from("auction_watchlist")
      .select("*", { count: "exact", head: true })
      .eq("auction_id", id);

    // Check if current user is watching
    let isWatching = false;
    if (user) {
      const { data: actor } = await supabase
        .from("actors")
        .select("id")
        .eq("user_id", user.id)
        .single() as { data: { id: string } | null };

      if (actor) {
        const { data: watchEntry } = await (supabase as any)
          .from("auction_watchlist")
          .select("id")
          .eq("auction_id", id)
          .eq("actor_id", actor.id)
          .single();

        isWatching = !!watchEntry;
      }
    }

    // Get bid history
    const { data: bids } = await (supabase as any)
      .from("auction_bids")
      .select(`
        *,
        bidder:actors!auction_bids_bidder_id_fkey (
          id,
          type
        )
      `)
      .eq("auction_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    // Batch-enrich bids with bidder info (2 queries instead of N+1)
    const enhancedBids = await enrichBidsWithBidderInfo(supabase, bids || []);

    // Format response
    const auctionWithDetails: AuctionWithDetails = {
      ...auction,
      model: auction.model ? {
        id: auction.model.id,
        display_name: auction.model.first_name
          ? `${auction.model.first_name} ${auction.model.last_name || ""}`.trim()
          : null,
        profile_image_url: auction.model.profile_photo_url,
        slug: auction.model.username,
        user_id: auction.model.user_id,
      } : undefined,
      watchlist_count: watchlistCount || 0,
      is_watching: isWatching,
    };

    return NextResponse.json({
      auction: auctionWithDetails,
      bids: enhancedBids,
    });
  } catch (error) {
    console.error("Get auction error:", error);
    return NextResponse.json(
      { error: "Failed to fetch auction" },
      { status: 500 }
    );
  }
}

// PATCH - Update auction (owner only, draft status only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model
    const { data: model } = await (supabase as any)
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get auction
    const { data: auction } = await (supabase as any)
      .from("auctions")
      .select("id, model_id, status")
      .eq("id", id)
      .single();

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.model_id !== model.id) {
      return NextResponse.json({ error: "Not your auction" }, { status: 403 });
    }

    if (auction.status !== "draft") {
      return NextResponse.json(
        { error: "Can only edit draft auctions" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = updateAuctionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate ends_at if provided
    if (data.ends_at && new Date(data.ends_at) <= new Date()) {
      return NextResponse.json(
        { error: "Auction end time must be in the future" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.deliverables !== undefined) updateData.deliverables = data.deliverables;
    if (data.cover_image_url !== undefined) updateData.cover_image_url = data.cover_image_url;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.starting_price !== undefined) updateData.starting_price = data.starting_price;
    if (data.reserve_price !== undefined) updateData.reserve_price = data.reserve_price;
    if (data.buy_now_price !== undefined) updateData.buy_now_price = data.buy_now_price;
    if (data.ends_at !== undefined) {
      updateData.ends_at = data.ends_at;
      updateData.original_end_at = data.ends_at;
    }
    if (data.allow_auto_bid !== undefined) updateData.allow_auto_bid = data.allow_auto_bid;
    if (data.anti_snipe_minutes !== undefined) updateData.anti_snipe_minutes = data.anti_snipe_minutes;

    updateData.updated_at = new Date().toISOString();

    const { data: updated, error } = await (supabase as any)
      .from("auctions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update auction error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, auction: updated });
  } catch (error) {
    console.error("Update auction error:", error);
    return NextResponse.json(
      { error: "Failed to update auction" },
      { status: 500 }
    );
  }
}

// DELETE - Delete auction (owner only, draft status only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model
    const { data: model } = await (supabase as any)
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    // Get auction
    const { data: auction } = await (supabase as any)
      .from("auctions")
      .select("id, model_id, status")
      .eq("id", id)
      .single();

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    if (auction.model_id !== model.id) {
      return NextResponse.json({ error: "Not your auction" }, { status: 403 });
    }

    if (auction.status !== "draft") {
      return NextResponse.json(
        { error: "Can only delete draft auctions" },
        { status: 400 }
      );
    }

    const { error } = await (supabase as any)
      .from("auctions")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete auction error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete auction error:", error);
    return NextResponse.json(
      { error: "Failed to delete auction" },
      { status: 500 }
    );
  }
}
