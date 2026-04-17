import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * GET /api/admin/flyers?event_id=xxx
 * List all generated flyers for an event
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
}

/**
 * DELETE /api/admin/flyers?id=xxx
 * Delete a specific flyer
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: actor } = await (supabase.from("actors") as any)
    .select("type")
    .eq("user_id", user.id)
    .single();

  if (!actor || actor.type !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
}
