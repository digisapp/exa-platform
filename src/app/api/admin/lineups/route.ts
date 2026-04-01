import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// GET /api/admin/lineups?event_id=xxx — list all lineups for an event with model counts
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  // Tables not yet in generated types — cast to any
  const { data: lineups, error } = await supabase.from("show_lineups")
    .select(`
      *,
      designer:designers(id, first_name, last_name, brand_name, instagram_url),
      models:show_lineup_models(
        id,
        model_id,
        walk_order,
        outfit_notes,
        status,
        model:models(id, username, first_name, last_name, profile_photo_url, height, instagram_followers)
      )
    `)
    .eq("event_id", eventId)
    .order("show_date", { ascending: true })
    .order("show_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort models within each lineup by walk_order
  const sorted = (lineups || []).map((lineup: any) => ({
    ...lineup,
    models: (lineup.models || []).sort((a: any, b: any) => a.walk_order - b.walk_order),
  }));

  return NextResponse.json(sorted);
}

// POST /api/admin/lineups — create a new lineup
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event_id, designer_id, name, show_date, show_time, show_order, notes } = body;

  if (!event_id || !designer_id || !name) {
    return NextResponse.json(
      { error: "event_id, designer_id, and name are required" },
      { status: 400 }
    );
  }

  const supabase: any = createServiceRoleClient();

  const { data, error } = await supabase.from("show_lineups")
    .insert({
      event_id,
      designer_id,
      name,
      show_date: show_date || null,
      show_time: show_time || null,
      show_order: show_order || 0,
      notes: notes || null,
    })
    .select(`
      *,
      designer:designers(id, first_name, last_name, brand_name, instagram_url)
    `)
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This designer already has a lineup for this event" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, models: [] }, { status: 201 });
}
