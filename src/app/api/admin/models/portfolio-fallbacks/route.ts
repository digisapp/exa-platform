import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/models/portfolio-fallbacks?ids=<uuid,uuid,...>
 *
 * First portfolio image per model — the applicant-list fallback thumbnail for
 * models with no profile photo. Browser admin pages can no longer read
 * content_items.media_url directly (Phase B1 column grants), so the lookup
 * runs here via the service role. Returns { fallbacks: { [modelId]: url } }.
 */
export const GET = withAuth(
  async ({ request }) => {
    const idsParam = new URL(request.url).searchParams.get("ids") || "";
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json({ fallbacks: {} });
    }
    // One admin screen's worth of applicants; also keeps the .in() far under
    // the ~300-UUID URL cap.
    if (ids.length > 200) {
      return NextResponse.json({ error: "Too many ids (max 200)" }, { status: 400 });
    }

    const adminDb = createServiceRoleClient();
    const { data: photos } = await (adminDb as any)
      .from("content_items")
      .select("model_id, media_url")
      .in("model_id", ids)
      .eq("status", "portfolio")
      .eq("media_type", "image")
      .order("created_at", { ascending: false });

    const fallbacks: Record<string, string> = {};
    for (const photo of photos || []) {
      if (!fallbacks[photo.model_id]) {
        fallbacks[photo.model_id] = photo.media_url.startsWith("http")
          ? photo.media_url
          : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${photo.media_url}`;
      }
    }

    return NextResponse.json({ fallbacks });
  },
  { requireType: "admin", rateLimit: "general" }
);
