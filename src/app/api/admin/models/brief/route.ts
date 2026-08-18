import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/models/brief?ids=<uuid,...>&by=id|user_id
 *
 * Name/photo lookups for admin list surfaces (content assignment, fan detail
 * timeline, flyers, MSW casting). Browser admin pages can no longer select
 * first_name/last_name on models (Phase B2 column grants); this serves the
 * admin-sanctioned brief via service role. Fixed field set on purpose.
 */
export const GET = withAuth(
  async ({ request }) => {
    const url = new URL(request.url);
    const by = url.searchParams.get("by") === "user_id" ? "user_id" : "id";
    const ids = (url.searchParams.get("ids") || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) return NextResponse.json({ models: [] });
    if (ids.length > 200) {
      return NextResponse.json({ error: "Too many ids (max 200)" }, { status: 400 });
    }

    const { data: models } = await (createServiceRoleClient() as any)
      .from("models")
      .select("id, user_id, first_name, last_name, username, profile_photo_url, instagram_name, height")
      .in(by, ids);

    return NextResponse.json({ models: models || [] });
  },
  { requireType: "admin", rateLimit: "general" }
);
