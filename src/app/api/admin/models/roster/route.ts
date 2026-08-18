import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/models/roster?variant=shows|comp-cards
 *
 * Admin roster lists that need names/measurements/admin_rating:
 * - shows: full approved+claimed roster for the lineup picker, ordered by
 *   first name.
 * - comp-cards: 4-5 star models with a photo and username, best first.
 * Browser admin pages can no longer read names or admin_rating (Phase B2
 * column grants); served via service role behind the admin gate.
 */
export const GET = withAuth(
  async ({ request }) => {
    const variant = new URL(request.url).searchParams.get("variant") || "shows";
    const svc = createServiceRoleClient() as any;

    if (variant === "comp-cards") {
      const { data } = await svc
        .from("models")
        .select("id, username, first_name, profile_photo_url, admin_rating, instagram_name")
        .in("admin_rating", [4, 5])
        .is("deleted_at", null)
        .not("profile_photo_url", "is", null)
        .not("username", "is", null)
        .order("admin_rating", { ascending: false })
        .order("username", { ascending: true });
      return NextResponse.json({ models: data || [] });
    }

    const { data } = await svc
      .from("models")
      .select(
        "id, username, first_name, last_name, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers, admin_rating, reliability_score, city, state, focus_tags"
      )
      .eq("is_approved", true)
      .not("user_id", "is", null)
      .order("first_name", { ascending: true });
    return NextResponse.json({ models: data || [] });
  },
  { requireType: "admin", rateLimit: "general" }
);
