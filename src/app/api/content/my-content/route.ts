import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Extract storage path from either a raw path or an expired signed URL.
// Handles: "premium/modelId/timestamp.jpg" and
// "https://.../object/sign/portfolio/premium/...?token=..." (or /public/).
function extractStoragePath(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("http")) return url; // already a storage path
  const match = url.match(/\/object\/(?:sign|public)\/[^/]+\/(.+?)(?:\?|$)/);
  return match ? match[1] : null;
}

// How many seconds of remaining validity to consider a signed URL still fresh.
const RESIGN_THRESHOLD_SECS = 300;

function isSignedUrlFresh(url: string): boolean {
  try {
    const u = new URL(url);
    const token = u.searchParams.get("token");
    if (!token) return false;
    // JWT payload is the second segment (base64url encoded)
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString()
    );
    return typeof payload.exp === "number" &&
      payload.exp - Date.now() / 1000 > RESIGN_THRESHOLD_SECS;
  } catch {
    return false;
  }
}

async function resignUrl(
  rawUrl: string | null | undefined,
  service: ReturnType<typeof createServiceRoleClient>
): Promise<string | null> {
  if (!rawUrl) return null;
  // Skip re-signing if the URL is already a fresh signed URL
  if (rawUrl.startsWith("http") && isSignedUrlFresh(rawUrl)) return rawUrl;
  const path = extractStoragePath(rawUrl);
  if (!path) return rawUrl; // not a storage path we can re-sign; pass through
  const { data } = await service.storage
    .from("portfolio")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? rawUrl;
}

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

    // Rate limit
    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

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

    // Fetch all purchased content with creator info (unified content_items system)
    const query = (supabase as any)
      .from("content_purchases")
      .select(`
        id,
        coins_spent,
        created_at,
        content:content_items (
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
      .not("item_id", "is", null)
      .order("created_at", { ascending: false });

    const { data: purchases, error } = await query as { data: any[] | null; error: any };

    if (error) {
      logger.error("Error fetching content", error);
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

    // Re-sign media URLs so purchased content actually renders. Without this,
    // rows stored as raw storage paths OR as signed URLs whose token has
    // already expired (1hr TTL) come back broken in <Image>.
    const service = createServiceRoleClient();
    const items = filteredPurchases.filter((p) => p.content);

    const signedPairs = await Promise.all(
      items.map(async (p) => {
        const [mediaUrl, previewUrl] = await Promise.all([
          resignUrl(p.content.media_url, service),
          resignUrl(p.content.preview_url, service),
        ]);
        return { mediaUrl, previewUrl };
      })
    );

    // Transform data for frontend
    const content = items.map((p, i) => ({
      id: p.id,
      purchasedAt: p.created_at,
      coinsSpent: p.coins_spent,
      content: {
        id: p.content.id,
        title: p.content.title,
        description: p.content.description,
        mediaUrl: signedPairs[i].mediaUrl,
        mediaType: p.content.media_type,
        previewUrl: signedPairs[i].previewUrl,
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
    logger.error("Content fetch error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
