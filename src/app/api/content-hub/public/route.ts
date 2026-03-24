import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getActorId } from "@/lib/ids";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";

// Extract storage path from either a raw path or an expired signed URL
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url;
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

async function toSignedUrl(
  rawUrl: string | null | undefined
): Promise<string | null> {
  if (!rawUrl) return null;
  const path = extractStoragePath(rawUrl);
  if (!path) return null;
  const service = createServiceRoleClient();
  const { data } = await service.storage
    .from("portfolio")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID required" },
        { status: 400 }
      );
    }

    // Get current user (may be null for anonymous visitors)
    const supabase: any = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Rate limit: use user ID if authenticated, IP if not
    const rateLimitResponse = await checkEndpointRateLimit(
      request,
      "general",
      user?.id
    );
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const actorId = user ? await getActorId(supabase, user.id) : null;
    const isOwner = actorId === modelId;

    // Fetch content items using service role client
    const service: any = createServiceRoleClient();

    const { data: items, error: itemsError } = await service
      .from("content_items")
      .select(
        "id, title, description, media_url, media_type, preview_url, coin_price, set_id, tags, unlock_count, status, created_at"
      )
      .eq("model_id", modelId)
      .in("status", ["portfolio", "exclusive"])
      .or("publish_at.is.null,publish_at.lte.now()")
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (itemsError) {
      console.error("Error fetching content items:", itemsError);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    // Fetch purchased item IDs and set IDs for this buyer
    let purchasedItemIds: string[] = [];
    let purchasedSetIds: string[] = [];

    if (actorId && !isOwner) {
      const { data: purchases } = await service
        .from("content_purchases")
        .select("item_id, set_id")
        .eq("buyer_id", actorId);

      if (purchases) {
        purchasedItemIds = purchases
          .filter((p: { item_id: string | null }) => p.item_id)
          .map((p: { item_id: string }) => p.item_id);
        purchasedSetIds = purchases
          .filter((p: { set_id: string | null }) => p.set_id)
          .map((p: { set_id: string }) => p.set_id);
      }
    }

    // Build response items with signed URLs in parallel
    const contentItems = (items || []) as {
      id: string;
      title: string | null;
      description: string | null;
      media_url: string | null;
      media_type: string;
      preview_url: string | null;
      coin_price: number;
      set_id: string | null;
      tags: string[] | null;
      unlock_count: number | null;
      status: string;
      created_at: string;
    }[];

    const mappedItems = await Promise.all(
      contentItems.map(async (item) => {
        const isUnlocked =
          isOwner ||
          item.coin_price === 0 ||
          purchasedItemIds.includes(item.id) ||
          (item.set_id !== null && purchasedSetIds.includes(item.set_id));

        const [signedPreviewUrl, signedMediaUrl] = await Promise.all([
          toSignedUrl(item.preview_url),
          isUnlocked ? toSignedUrl(item.media_url) : Promise.resolve(null),
        ]);

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          media_type: item.media_type,
          preview_url: signedPreviewUrl,
          coin_price: item.coin_price,
          set_id: item.set_id,
          tags: item.tags ?? [],
          unlock_count: item.unlock_count ?? 0,
          isUnlocked,
          mediaUrl: signedMediaUrl,
          created_at: item.created_at,
        };
      })
    );

    // Fetch live content sets for this model with item counts
    const { data: sets, error: setsError } = await service
      .from("content_sets")
      .select("id, title, description, cover_item_id, coin_price, status")
      .eq("model_id", modelId)
      .eq("status", "live")
      .order("position", { ascending: true });

    if (setsError) {
      console.error("Error fetching content sets:", setsError);
      return NextResponse.json(
        { error: "Failed to fetch content sets" },
        { status: 500 }
      );
    }

    // Get item counts per set and cover URLs in parallel
    const mappedSets = await Promise.all(
      ((sets || []) as {
        id: string;
        title: string | null;
        description: string | null;
        cover_item_id: string | null;
        coin_price: number;
        status: string;
      }[]).map(async (set) => {
        // Count items in this set
        const { count } = await service
          .from("content_items")
          .select("id", { count: "exact", head: true })
          .eq("set_id", set.id)
          .in("status", ["portfolio", "exclusive"]);

        // Get cover image URL from cover item
        let coverUrl: string | null = null;
        if (set.cover_item_id) {
          const { data: coverItem } = await service
            .from("content_items")
            .select("preview_url, media_url")
            .eq("id", set.cover_item_id)
            .single();

          if (coverItem) {
            coverUrl = await toSignedUrl(
              coverItem.preview_url || coverItem.media_url
            );
          }
        }

        return {
          id: set.id,
          title: set.title,
          description: set.description,
          cover_url: coverUrl,
          coin_price: set.coin_price,
          item_count: count ?? 0,
          status: set.status,
        };
      })
    );

    return NextResponse.json({ items: mappedItems, sets: mappedSets });
  } catch (error) {
    console.error("Content hub public fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
