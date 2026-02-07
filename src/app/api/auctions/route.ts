import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { AuctionWithModel, AuctionFilters, AuctionSortOption } from "@/types/auctions";

const createAuctionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  deliverables: z.string().max(2000).optional(),
  cover_image_url: z.string().url().optional(),
  category: z.enum(["video_call", "custom_content", "meet_greet", "shoutout", "experience", "other"]).optional().default("other"),
  starting_price: z.number().int().min(10),
  reserve_price: z.number().int().min(10).optional(),
  buy_now_price: z.number().int().min(10).optional(),
  ends_at: z.string().datetime(),
  allow_auto_bid: z.boolean().optional().default(true),
  anti_snipe_minutes: z.number().int().min(0).max(10).optional().default(2),
});

// GET - List auctions with filters
export async function GET(request: NextRequest) {
  try {
    const supabase: any = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status") as AuctionFilters["status"] || "active";
    const modelId = searchParams.get("model_id");
    const sort = searchParams.get("sort") as AuctionSortOption || "ending_soon";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);
    const hasBuyNow = searchParams.get("has_buy_now") === "true";

    let query = supabase
      .from("auctions")
      .select(`
        *,
        model:models!auctions_model_id_fkey (
          id,
          first_name,
          last_name,
          profile_photo_url,
          username
        )
      `, { count: "exact" });

    // Filter by status
    if (status === "all") {
      query = query.neq("status", "draft");
    } else if (status === "active") {
      query = query.eq("status", "active");
    } else if (status === "ending_soon") {
      query = query
        .eq("status", "active")
        .lt("ends_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
    } else if (status === "new") {
      query = query
        .eq("status", "active")
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    }

    // Filter by model
    if (modelId) {
      query = query.eq("model_id", modelId);
    }

    // Filter by buy now
    if (hasBuyNow) {
      query = query.not("buy_now_price", "is", null);
    }

    // Sorting
    switch (sort) {
      case "ending_soon":
        query = query.order("ends_at", { ascending: true });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "most_bids":
        query = query.order("bid_count", { ascending: false });
        break;
      case "price_low":
        query = query.order("current_bid", { ascending: true, nullsFirst: true });
        break;
      case "price_high":
        query = query.order("current_bid", { ascending: false });
        break;
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: auctions, error, count } = await query;

    if (error) {
      console.error("List auctions error:", error);
      throw error;
    }

    // Format response
    const formattedAuctions: AuctionWithModel[] = (auctions || []).map((auction: any) => ({
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
    }));

    return NextResponse.json({
      auctions: formattedAuctions,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("List auctions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch auctions" },
      { status: 500 }
    );
  }
}

// POST - Create a new auction (models only)
export async function POST(request: NextRequest) {
  try {
    const supabase: any = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get model profile
    const { data: model } = await supabase
      .from("models")
      .select("id, is_approved")
      .eq("user_id", user.id)
      .single();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    if (!model.is_approved) {
      return NextResponse.json({ error: "Your profile must be approved to create auctions" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createAuctionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Validate ends_at is in the future
    if (new Date(data.ends_at) <= new Date()) {
      return NextResponse.json(
        { error: "Auction end time must be in the future" },
        { status: 400 }
      );
    }

    // Validate buy_now_price is greater than starting_price
    if (data.buy_now_price && data.buy_now_price <= data.starting_price) {
      return NextResponse.json(
        { error: "Buy now price must be greater than starting price" },
        { status: 400 }
      );
    }

    // Validate reserve_price is greater than starting_price
    if (data.reserve_price && data.reserve_price <= data.starting_price) {
      return NextResponse.json(
        { error: "Reserve price must be greater than starting price" },
        { status: 400 }
      );
    }

    // Create auction as draft
    const { data: auction, error } = await supabase
      .from("auctions")
      .insert({
        model_id: model.id,
        title: data.title,
        description: data.description,
        deliverables: data.deliverables,
        cover_image_url: data.cover_image_url,
        category: data.category,
        starting_price: data.starting_price,
        reserve_price: data.reserve_price,
        buy_now_price: data.buy_now_price,
        ends_at: data.ends_at,
        original_end_at: data.ends_at,
        allow_auto_bid: data.allow_auto_bid,
        anti_snipe_minutes: data.anti_snipe_minutes,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Create auction error:", error);
      throw error;
    }

    return NextResponse.json({ success: true, auction });
  } catch (error) {
    console.error("Create auction error:", error);
    return NextResponse.json(
      { error: "Failed to create auction" },
      { status: 500 }
    );
  }
}
