import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { withAuth } from "@/lib/auth/with-auth";

export const PATCH = withAuth<{ id: string }>(
  async ({ request, params }) => {
    const { id } = params;
    const body = await request.json();
    const { rating } = body;

    // Validate rating (1-5 or null to clear)
    if (rating !== null && (typeof rating !== "number" || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: "Rating must be 1-5 or null" }, { status: 400 });
    }

    // Service role: models UPDATE policies are own-row only (20260716000001),
    // so a session-client write to another model's row silently no-ops.
    const { error } = await createServiceRoleClient()
      .from("models")
      .update({ admin_rating: rating, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, rating });
  },
  { requireType: "admin", rateLimit: "general" }
);
