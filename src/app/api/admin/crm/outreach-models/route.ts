import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/crm/outreach-models
 *
 * Unclaimed imported leads with contact email for the CRM outreach panel.
 * Browser admin pages can no longer read email/names/invite_sent_at on models
 * (Phase B2 column grants); served via service role behind the admin gate.
 */
export const GET = withAuth(
  async () => {
    const { data: models, error } = await (createServiceRoleClient() as any)
      .from("models")
      .select(
        "id, username, first_name, last_name, email, instagram_name, instagram_followers, profile_photo_url, created_at, user_id, claimed_at, invite_sent_at"
      )
      .is("user_id", null)
      .is("claimed_at", null)
      .not("email", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load models" }, { status: 500 });
    }
    return NextResponse.json({ models: models || [] });
  },
  { requireType: "admin", rateLimit: "general" }
);
