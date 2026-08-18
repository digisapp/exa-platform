import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/rate/queue?status=<all|visible|visible_pending|all_pending>&state=<XX|all>
 *
 * The admin rating deck: next 100 unrated models (full rows — the deck shows
 * everything) plus rated/unrated counts under the same pool filters. Browser
 * admin pages can no longer select("*") on models or filter on admin_rating
 * (Phase B2 column grants), so the queue is served via service role.
 */
export const GET = withAuth(
  async ({ request }) => {
    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status") || "all";
    const stateFilter = url.searchParams.get("state") || "all";

    const svc = createServiceRoleClient();
    const applyPoolFilters = (q: any) => {
      q = q.is("deleted_at", null).not("profile_photo_url", "is", null);
      if (statusFilter === "visible_pending") {
        q = q.eq("is_approved", true).not("invite_token", "is", null).is("user_id", null);
      } else if (statusFilter === "visible") {
        q = q.eq("is_approved", true);
      } else if (statusFilter === "all_pending") {
        q = q.not("invite_token", "is", null).is("user_id", null);
      }
      if (stateFilter !== "all") {
        q = q.eq("state", stateFilter);
      }
      return q;
    };

    const [{ data: models }, { count: unratedCount }, { count: ratedCount }] = await Promise.all([
      applyPoolFilters(
        (svc as any)
          .from("models")
          .select("*")
          .is("admin_rating", null)
          .order("instagram_followers", { ascending: false, nullsFirst: false })
      ).limit(100),
      applyPoolFilters(
        (svc as any).from("models").select("id", { count: "exact", head: true }).is("admin_rating", null)
      ),
      applyPoolFilters(
        (svc as any).from("models").select("id", { count: "exact", head: true }).not("admin_rating", "is", null)
      ),
    ]);

    return NextResponse.json({
      models: models || [],
      unratedCount: unratedCount || 0,
      ratedCount: ratedCount || 0,
    });
  },
  { requireType: "admin", rateLimit: "general" }
);
