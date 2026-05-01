import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// GET /api/admin/msw-casting/picks?brand_id=X&event_id=Y
// Used by the admin shows page to highlight a designer's casting picks in the model pool
export async function GET(req: NextRequest) {
  const brandId = req.nextUrl.searchParams.get("brand_id");
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!brandId || !eventId) {
    return NextResponse.json({ error: "brand_id and event_id required" }, { status: 400 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await (admin as any)
    .from("msw_casting_picks")
    .select("model_id")
    .eq("brand_id", brandId)
    .eq("event_id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ picks: (data || []).map((r: { model_id: string }) => r.model_id) });
}
