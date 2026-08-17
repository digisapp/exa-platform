import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { isContentMediaPath } from "@/lib/content-media";

/**
 * GET /api/content/library — the logged-in model's own content library.
 *
 * Serves the chat LibraryPicker and the comp-card builder, which previously
 * read content_items straight from the browser. content_items.media_url is no
 * longer column-granted to client roles (Phase B1 lockdown), so the raw path
 * resolution happens here with the service client instead.
 *
 * Exposure model (unchanged from the old client-side logic):
 * - portfolio items resolve to their public portfolio-bucket URL
 * - exclusive items in the private content-media bucket are EXCLUDED
 *   (fail closed — chat attachments can only carry public http URLs);
 *   legacy exclusive items resolve to their already-public URL
 * - only the caller's own items are ever returned
 */

function resolvePublicUrl(url: string): string {
  return url.startsWith("http")
    ? url
    : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
    if (rateLimitResponse) return rateLimitResponse;

    // Resolve the caller's own model row — the library is strictly self-view.
    const service = createServiceRoleClient();
    const { data: model } = await (service as any)
      .from("models")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!model) {
      return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    }

    const [{ data: portfolioItems }, { data: exclusiveItems }] = await Promise.all([
      (service as any)
        .from("content_items")
        .select("id, media_url, media_type, title, created_at")
        .eq("model_id", model.id)
        .eq("status", "portfolio")
        .order("created_at", { ascending: false }),
      (service as any)
        .from("content_items")
        .select("id, media_url, media_type, coin_price, preview_url")
        .eq("model_id", model.id)
        .eq("status", "exclusive")
        .gt("coin_price", 0)
        .order("created_at", { ascending: false }),
    ]);

    const portfolio = (portfolioItems || []).map((c: any) => ({
      id: c.id,
      url: resolvePublicUrl(c.media_url),
      mediaType: c.media_type,
      title: c.title,
      createdAt: c.created_at,
    }));

    const exclusive = (exclusiveItems || [])
      // Private-bucket paths can't travel through chat (messages only carry
      // http URLs) — exclude them, same fail-closed rule the picker had.
      .filter((c: any) => !isContentMediaPath(c.media_url))
      .map((c: any) => ({
        id: c.id,
        url: resolvePublicUrl(c.media_url),
        mediaType: c.media_type,
        coinPrice: c.coin_price,
        // Previews always live in the public portfolio bucket
        thumbnailUrl: c.preview_url ? resolvePublicUrl(c.preview_url) : null,
      }));

    return NextResponse.json({ portfolio, exclusive });
  } catch (error) {
    logger.error("Content library fetch error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
