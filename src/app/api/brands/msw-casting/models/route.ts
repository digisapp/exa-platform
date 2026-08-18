import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * GET /api/brands/msw-casting/models?event_id=...
 *
 * Casting draft cards for the event's badge-holding models, ordered
 * best-first. The brand page previously selected admin_rating with the
 * browser client to sort locally — client roles can no longer read
 * admin_rating (Phase B2 column grants), and ratings must never leave the
 * server anyway: the sort happens here and the rating is NOT in the response.
 */
async function getBrandId(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };
  if (!actor || actor.type !== "brand") return null;
  return actor.id;
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient();
  const brandId = await getBrandId(supabase);
  if (!brandId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) return NextResponse.json({ error: "event_id required" }, { status: 400 });

  // Only designers attached to the event get the roster (same gate the page
  // applies before rendering).
  const { data: designer } = await (supabase as any)
    .from("event_show_designers")
    .select("id")
    .eq("brand_id", brandId)
    .maybeSingle();
  if (!designer) return NextResponse.json({ error: "Not a participant" }, { status: 403 });

  const service = createServiceRoleClient();

  const { data: eventBadge } = await (service as any)
    .from("badges")
    .select("id")
    .eq("event_id", eventId)
    .eq("badge_type", "event")
    .eq("is_active", true)
    .maybeSingle();

  if (!eventBadge) return NextResponse.json({ models: [] });

  const { data: holders } = await (service as any)
    .from("model_badges")
    .select("model_id")
    .eq("badge_id", eventBadge.id);

  const modelIds = (holders || []).map((b: { model_id: string }) => b.model_id);
  if (modelIds.length === 0) return NextResponse.json({ models: [] });

  // Event badge holders are a curated set well under the ~300-UUID .in() cap;
  // slice defensively anyway.
  const { data: models } = await (service as any)
    .from("models")
    .select(
      "id, username, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers, city, state, admin_rating, reliability_score, focus_tags"
    )
    .in("id", modelIds.slice(0, 300));

  const sorted = (models || [])
    .sort(
      (a: any, b: any) =>
        (b.admin_rating ?? 0) - (a.admin_rating ?? 0) ||
        (a.username ?? "").localeCompare(b.username ?? "")
    )
    // Ratings never leave the server — null the field after sorting (an
    // explicit null hits the draft card's designed no-rating rendering path;
    // an absent key would render an empty star row).
    .map(({ admin_rating: _rating, ...m }: any) => ({ ...m, admin_rating: null }));

  return NextResponse.json({ models: sorted });
}
