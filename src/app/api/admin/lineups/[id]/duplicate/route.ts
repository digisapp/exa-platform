import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// POST /api/admin/lineups/[id]/duplicate — duplicate a show with all designers + models
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase: any = createServiceRoleClient();

  // Fetch original show with designers and models
  const { data: original, error: fetchErr } = await supabase
    .from("event_shows")
    .select(`
      *,
      designers:event_show_designers(
        id, designer_name, designer_order, notes,
        models:event_show_models(
          model_id, walk_order, outfit_notes, status
        )
      )
    `)
    .eq("id", id)
    .single();

  if (fetchErr || !original) {
    return NextResponse.json({ error: "Show not found" }, { status: 404 });
  }

  // Create new show
  const { data: newShow, error: showErr } = await supabase
    .from("event_shows")
    .insert({
      event_id: original.event_id,
      name: `${original.name} (Copy)`,
      show_date: original.show_date,
      show_time: original.show_time,
      show_order: original.show_order + 1,
      status: "draft",
      notes: original.notes,
    })
    .select("*")
    .single();

  if (showErr) {
    return NextResponse.json({ error: showErr.message }, { status: 500 });
  }

  const designers = (original.designers || []).sort(
    (a: any, b: any) => a.designer_order - b.designer_order
  );

  const newDesigners: any[] = [];

  for (const d of designers) {
    const { data: newDesigner, error: dErr } = await supabase
      .from("event_show_designers")
      .insert({
        show_id: newShow.id,
        designer_name: d.designer_name,
        designer_order: d.designer_order,
        notes: d.notes,
      })
      .select("*")
      .single();

    if (dErr) continue;

    const models = (d.models || []).sort(
      (a: any, b: any) => a.walk_order - b.walk_order
    );

    if (models.length > 0) {
      const modelInserts = models.map((m: any) => ({
        designer_entry_id: newDesigner.id,
        model_id: m.model_id,
        walk_order: m.walk_order,
        outfit_notes: m.outfit_notes,
        status: m.status,
      }));

      const { data: newModels } = await supabase
        .from("event_show_models")
        .insert(modelInserts)
        .select(`
          id, model_id, walk_order, outfit_notes, status,
          model:models(id, username, first_name, last_name, profile_photo_url, height, instagram_followers)
        `);

      newDesigners.push({ ...newDesigner, models: newModels || [] });
    } else {
      newDesigners.push({ ...newDesigner, models: [] });
    }
  }

  return NextResponse.json({ ...newShow, designers: newDesigners }, { status: 201 });
}
