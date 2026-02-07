import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const addWatchlistSchema = z.object({
  auction_id: z.string().uuid(),
  notify_outbid: z.boolean().optional().default(true),
  notify_ending: z.boolean().optional().default(true),
});

// GET - Get user's watchlist
export async function GET() {
  try {
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

    // Get watchlist with auction details
    const { data: watchlist, error } = await (supabase as any)
      .from("auction_watchlist")
      .select(`
        id,
        auction_id,
        notify_outbid,
        notify_ending,
        created_at,
        auction:auctions!auction_watchlist_auction_id_fkey (
          id,
          title,
          cover_image_url,
          current_bid,
          starting_price,
          buy_now_price,
          ends_at,
          status,
          bid_count,
          model:models!auctions_model_id_fkey (
            id,
            first_name,
            last_name,
            profile_photo_url,
            username
          )
        )
      `)
      .eq("actor_id", actor.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get watchlist error:", error);
      throw error;
    }

    // Format response
    const formattedWatchlist = (watchlist || []).map((entry: any) => ({
      id: entry.id,
      auction_id: entry.auction_id,
      notify_outbid: entry.notify_outbid,
      notify_ending: entry.notify_ending,
      added_at: entry.created_at,
      auction: entry.auction ? {
        ...entry.auction,
        model: entry.auction.model ? {
          id: entry.auction.model.id,
          display_name: entry.auction.model.first_name
            ? `${entry.auction.model.first_name} ${entry.auction.model.last_name || ""}`.trim()
            : null,
          profile_image_url: entry.auction.model.profile_photo_url,
          slug: entry.auction.model.username,
        } : null,
      } : null,
    }));

    return NextResponse.json({ watchlist: formattedWatchlist });
  } catch (error) {
    console.error("Get watchlist error:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

// POST - Add to watchlist
export async function POST(request: NextRequest) {
  try {
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
    const parsed = addWatchlistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { auction_id, notify_outbid, notify_ending } = parsed.data;

    // Verify auction exists and is active
    const { data: auction } = await (supabase as any)
      .from("auctions")
      .select("id, status, model_id")
      .eq("id", auction_id)
      .single();

    if (!auction) {
      return NextResponse.json({ error: "Auction not found" }, { status: 404 });
    }

    // Check if already watching
    const { data: existing } = await (supabase as any)
      .from("auction_watchlist")
      .select("id")
      .eq("auction_id", auction_id)
      .eq("actor_id", actor.id)
      .single();

    if (existing) {
      // Update notification preferences
      const { error: updateError } = await (supabase as any)
        .from("auction_watchlist")
        .update({ notify_outbid, notify_ending })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Update watchlist error:", updateError);
        throw updateError;
      }

      return NextResponse.json({ success: true, id: existing.id });
    }

    // Add to watchlist
    const { data: entry, error } = await (supabase as any)
      .from("auction_watchlist")
      .insert({
        auction_id,
        actor_id: actor.id,
        notify_outbid,
        notify_ending,
      })
      .select()
      .single();

    if (error) {
      console.error("Add watchlist error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch (error) {
    console.error("Add watchlist error:", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

// DELETE - Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
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

    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get("auction_id");

    if (!auctionId) {
      return NextResponse.json(
        { error: "auction_id required" },
        { status: 400 }
      );
    }

    const { error } = await (supabase as any)
      .from("auction_watchlist")
      .delete()
      .eq("auction_id", auctionId)
      .eq("actor_id", actor.id);

    if (error) {
      console.error("Remove watchlist error:", error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove watchlist error:", error);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
