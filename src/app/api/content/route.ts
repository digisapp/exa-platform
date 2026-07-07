import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getActorId } from "@/lib/ids";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Extract storage path from either a raw path or an expired signed URL
// Handles: "premium/modelId/timestamp.jpg" and "https://.../sign/portfolio/premium/...?token=..."
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url; // already a storage path
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

async function toSignedUrl(rawUrl: string | null | undefined): Promise<string | null> {
  if (!rawUrl) return null;
  const path = extractStoragePath(rawUrl);
  if (!path) return null;
  const service = createServiceRoleClient();
  const { data } = await service.storage.from("portfolio").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// Get premium content for a model
export async function GET(request: NextRequest) {
  try {
    // as any needed: nullable field mismatches with typed query results and RPC parameters
    const supabase: any = await createClient();
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json(
        { error: "Model ID required" },
        { status: 400 }
      );
    }

    // Get current user to check if they've unlocked content
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Rate limit check (use IP for unauthenticated, user ID for authenticated)
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user?.id);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Use helper to get actor ID
    const actorId = user ? await getActorId(supabase, user.id) : null;

    // Get exclusive content from content_items (unified table)
    const { data: content, error } = await supabase
      .from("content_items")
      .select("id, title, description, media_type, preview_url, media_url, coin_price, unlock_count, created_at")
      .eq("model_id", modelId)
      .eq("status", "exclusive")
      .gt("coin_price", 0)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching content", error);
      return NextResponse.json(
        { error: "Failed to fetch content" },
        { status: 500 }
      );
    }

    // If user is logged in, check which content they've unlocked
    let unlockedIds: string[] = [];
    if (actorId) {
      const { data: unlocks } = await supabase
        .from("content_purchases")
        .select("item_id")
        .eq("buyer_id", actorId);

      unlockedIds = (unlocks || [])
        .map((u: { item_id: string | null }) => u.item_id)
        .filter(Boolean) as string[];
    }

    // Check if the viewer is the model themselves
    const isOwner = actorId === modelId;

    // Determine which content IDs are unlocked
    const unlockedContentIds = (content || [])
      .filter((item: { id: string; coin_price: number }) => {
        const isFree = item.coin_price === 0;
        return isFree || unlockedIds.includes(item.id) || isOwner;
      })
      .map((item: { id: string }) => item.id);

    // Batch fetch media_urls via secure RPC (only returns URLs for unlocked/owned content)
    const mediaUrlMap = new Map<string, string>();
    if (unlockedContentIds.length > 0) {
      const { data: mediaUrls } = await supabase.rpc(
        "get_unlocked_media_urls",
        {
          p_content_ids: unlockedContentIds,
          p_buyer_id: actorId,
        }
      );

      (mediaUrls || []).forEach((item: { content_id: string; media_url: string }) => {
        mediaUrlMap.set(item.content_id, item.media_url);
      });
    }

    // Generate fresh signed URLs for preview_url and media_url in parallel
    const contentItems = (content || []) as {
      id: string;
      title: string | null;
      description: string | null;
      media_type: string;
      preview_url: string | null;
      media_url: string | null;
      coin_price: number;
      unlock_count: number | null;
      created_at: string | null;
    }[];

    const contentWithStatus = await Promise.all(contentItems.map(async (item) => {
      const isFree = item.coin_price === 0;
      const isUnlocked = isFree || unlockedIds.includes(item.id) || isOwner;

      // Locked items only get a dedicated preview (blurred low-res generated at
      // upload). Falling back to the full media as "preview" let anyone rip the
      // paid file from the network tab — the fan UI's CSS blur was the only gate.
      const hasDistinctPreview = !!item.preview_url && item.preview_url !== item.media_url;
      const previewSource = isUnlocked
        ? item.preview_url || item.media_url
        : hasDistinctPreview
          ? item.preview_url
          : null;

      const [freshPreviewUrl, freshMediaUrl] = await Promise.all([
        toSignedUrl(previewSource),
        isUnlocked ? toSignedUrl(mediaUrlMap.get(item.id) ?? null) : Promise.resolve(null),
      ]);

      // Never return the raw media_url (storage path) — the portfolio bucket is
      // public, so the path alone is enough to fetch the full file unpaid.
      const { media_url: _rawMediaUrl, ...safeItem } = item;

      return {
        ...safeItem,
        preview_url: freshPreviewUrl ?? previewSource,
        isUnlocked,
        mediaUrl: freshMediaUrl,
      };
    }));

    return NextResponse.json({ content: contentWithStatus });
  } catch (error) {
    logger.error("Content fetch error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
