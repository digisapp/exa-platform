import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// GET /api/admin/lineups?event_id=xxx — list all shows for an event with designers and models
export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("event_id");
  if (!eventId) {
    return NextResponse.json({ error: "event_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { data: shows, error } = await supabase.from("event_shows")
    .select(`
      *,
      designers:event_show_designers(
        id,
        designer_name,
        designer_order,
        brand_id,
        notes,
        models:event_show_models(
          id,
          model_id,
          walk_order,
          outfit_notes,
          status,
          model:models(id, username, first_name, last_name, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers)
        )
      )
    `)
    .eq("event_id", eventId)
    .order("show_date", { ascending: true })
    .order("show_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Sort designers by designer_order, models by walk_order
  const sorted = (shows || []).map((show: any) => ({
    ...show,
    designers: (show.designers || [])
      .sort((a: any, b: any) => a.designer_order - b.designer_order)
      .map((d: any) => ({
        ...d,
        models: (d.models || []).sort((a: any, b: any) => a.walk_order - b.walk_order),
      })),
  }));

  return NextResponse.json(sorted);
}

// POST /api/admin/lineups — create a new show
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { event_id, name, show_date, show_time, show_order, notes } = body;

  if (!event_id || !name) {
    return NextResponse.json(
      { error: "event_id and name are required" },
      { status: 400 }
    );
  }

  const supabase: any = createServiceRoleClient();

  const { data, error } = await supabase.from("event_shows")
    .insert({
      event_id,
      name,
      show_date: show_date || null,
      show_time: show_time || null,
      show_order: show_order || 0,
      notes: notes || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, designers: [] }, { status: 201 });
}
