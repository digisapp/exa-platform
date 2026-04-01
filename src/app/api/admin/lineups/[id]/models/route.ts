import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// Note: [id] here is the designer_entry_id (event_show_designers.id)

// POST /api/admin/lineups/[id]/models — assign models to a designer entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_ids } = body as { model_ids: string[] };

  if (!model_ids?.length) {
    return NextResponse.json({ error: "model_ids required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  // Get current max walk_order
  const { data: existing } = await supabase
    .from("event_show_models")
    .select("walk_order")
    .eq("designer_entry_id", designerEntryId)
    .order("walk_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.walk_order ?? -1) + 1;

  const inserts = model_ids.map((model_id) => ({
    designer_entry_id: designerEntryId,
    model_id,
    walk_order: nextOrder++,
  }));

  const { data, error } = await supabase
    .from("event_show_models")
    .upsert(inserts, { onConflict: "designer_entry_id,model_id", ignoreDuplicates: true })
    .select(`
      id,
      model_id,
      walk_order,
      outfit_notes,
      status,
      model:models(id, username, first_name, last_name, profile_photo_url, height, instagram_followers)
    `);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/admin/lineups/[id]/models — remove models from a designer entry
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_ids } = body as { model_ids: string[] };

  if (!model_ids?.length) {
    return NextResponse.json({ error: "model_ids required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { error } = await supabase
    .from("event_show_models")
    .delete()
    .eq("designer_entry_id", designerEntryId)
    .in("model_id", model_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/lineups/[id]/models — reorder models within a designer entry
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { ordered_model_ids } = body as { ordered_model_ids: string[] };

  if (!ordered_model_ids?.length) {
    return NextResponse.json({ error: "ordered_model_ids required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const updates = ordered_model_ids.map((model_id, index) =>
    supabase
      .from("event_show_models")
      .update({ walk_order: index })
      .eq("designer_entry_id", designerEntryId)
      .eq("model_id", model_id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r: any) => r.error);

  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
