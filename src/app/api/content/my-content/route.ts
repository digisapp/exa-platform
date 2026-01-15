import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actor ID
    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 400 });
    }

    // Get filter from query params
    const searchParams = request.nextUrl.searchParams;
    const typeFilter = searchParams.get("type"); // "image", "video", or null for all

    // Fetch all purchased content with creator info
    const query = supabase
      .from("content_unlocks")
      .select(`
        id,
        amount_paid,
        created_at,
        content:premium_content (
          id,
          title,
          description,
          media_url,
          media_type,
          preview_url,
          coin_price,
          model:models (
            id,
            username,
            first_name,
            last_name,
            profile_photo_url
          )
        )
      `)
      .eq("buyer_id", actor.id)
      .order("created_at", { ascending: false });

    const { data: purchases, error } = await query as { data: any[] | null; error: any };

    if (error) {
      console.error("Error fetching content:", error);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    // Filter by media type if specified
    let filteredPurchases = purchases || [];
    if (typeFilter && (typeFilter === "image" || typeFilter === "video")) {
      filteredPurchases = filteredPurchases.filter(
        (p) => p.content?.media_type === typeFilter
      );
    }

    // Transform data for frontend
    const content = filteredPurchases
      .filter((p) => p.content) // Filter out any with missing content
      .map((p) => ({
        id: p.id,
        purchasedAt: p.created_at,
        coinsSpent: p.amount_paid,
        content: {
          id: p.content.id,
          title: p.content.title,
          description: p.content.description,
          mediaUrl: p.content.media_url,
          mediaType: p.content.media_type,
          previewUrl: p.content.preview_url,
        },
        creator: p.content.model ? {
          id: p.content.model.id,
          username: p.content.model.username,
          firstName: p.content.model.first_name,
          lastName: p.content.model.last_name,
          profilePhotoUrl: p.content.model.profile_photo_url,
        } : null,
      }));

    return NextResponse.json({
      content,
      total: content.length,
    });
  } catch (error) {
    console.error("Content fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
