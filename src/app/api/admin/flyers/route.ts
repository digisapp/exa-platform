import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { withAuth } from "@/lib/auth/with-auth";

/**
 * GET /api/admin/flyers?event_id=xxx
 * List all generated flyers for an event
 */
export const GET = withAuth(
  async ({ request }) => {
    const eventId = request.nextUrl.searchParams.get("event_id");

    const admin = createServiceRoleClient();

    let query = (admin.from("flyers" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (eventId) {
      query = query.eq("event_id", eventId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ flyers: data || [] });
  },
  { requireType: "admin" }
);

/**
 * DELETE /api/admin/flyers?id=xxx
 * Delete a specific flyer
 */
export const DELETE = withAuth(
  async ({ request }) => {
    const flyerId = request.nextUrl.searchParams.get("id");
    if (!flyerId) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const admin = createServiceRoleClient();

    // Get the flyer to find storage path
    const { data: flyer } = await (admin.from("flyers" as any) as any)
      .select("storage_path")
      .eq("id", flyerId)
      .single();

    if (flyer?.storage_path) {
      await admin.storage.from("portfolio").remove([flyer.storage_path]);
    }

    await (admin.from("flyers" as any) as any).delete().eq("id", flyerId);

    return NextResponse.json({ success: true });
  },
  { requireType: "admin" }
);
