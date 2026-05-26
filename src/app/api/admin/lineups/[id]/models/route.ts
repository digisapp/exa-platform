import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/require-admin";

// Note: [id] here is the designer_entry_id (event_show_designers.id)

const ROW_SELECT = `
  id,
  model_id,
  guest_name,
  walk_order,
  outfit_notes,
  status,
  check_in_status,
  model:models(id, username, first_name, last_name, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers)
`;

// POST /api/admin/lineups/[id]/models — assign models (and/or walk-in guests) to a designer entry
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_ids, guest_names } = body as {
    model_ids?: string[];
    guest_names?: string[];
  };

  if (!model_ids?.length && !guest_names?.length) {
    return NextResponse.json({ error: "model_ids or guest_names required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("event_show_models")
    .select("walk_order")
    .eq("designer_entry_id", designerEntryId)
    .order("walk_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.walk_order ?? -1) + 1;

  const inserted: any[] = [];

  if (model_ids?.length) {
    const inserts = model_ids.map((model_id) => ({
      designer_entry_id: designerEntryId,
      model_id,
      walk_order: nextOrder++,
    }));

    const { data, error } = await supabase
      .from("event_show_models")
      .upsert(inserts, { onConflict: "designer_entry_id,model_id", ignoreDuplicates: true })
      .select(ROW_SELECT);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (data) inserted.push(...data);
  }

  if (guest_names?.length) {
    const inserts = guest_names
      .map((n) => (n || "").trim())
      .filter(Boolean)
      .map((name) => ({
        designer_entry_id: designerEntryId,
        guest_name: name,
        walk_order: nextOrder++,
      }));

    if (inserts.length) {
      const { data, error } = await supabase
        .from("event_show_models")
        .insert(inserts)
        .select(ROW_SELECT);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data) inserted.push(...data);
    }
  }

  return NextResponse.json(inserted, { status: 201 });
}

// DELETE /api/admin/lineups/[id]/models — remove rows by row id (preferred) or by model_id
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { model_ids, row_ids } = body as {
    model_ids?: string[];
    row_ids?: string[];
  };

  if (!model_ids?.length && !row_ids?.length) {
    return NextResponse.json({ error: "model_ids or row_ids required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  if (row_ids?.length) {
    const { error } = await supabase
      .from("event_show_models")
      .delete()
      .eq("designer_entry_id", designerEntryId)
      .in("id", row_ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (model_ids?.length) {
    const { error } = await supabase
      .from("event_show_models")
      .delete()
      .eq("designer_entry_id", designerEntryId)
      .in("model_id", model_ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// PATCH /api/admin/lineups/[id]/models — reorder rows within a designer entry
// Accepts ordered_ids (row ids — preferred) or ordered_model_ids (legacy, real models only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id: designerEntryId } = await params;
  const body = await req.json();
  const { ordered_ids, ordered_model_ids } = body as {
    ordered_ids?: string[];
    ordered_model_ids?: string[];
  };

  const supabase: any = createServiceRoleClient();

  if (ordered_ids?.length) {
    const updates = ordered_ids.map((row_id, index) =>
      supabase
        .from("event_show_models")
        .update({ walk_order: index })
        .eq("designer_entry_id", designerEntryId)
        .eq("id", row_id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r: any) => r.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (ordered_model_ids?.length) {
    const updates = ordered_model_ids.map((model_id, index) =>
      supabase
        .from("event_show_models")
        .update({ walk_order: index })
        .eq("designer_entry_id", designerEntryId)
        .eq("model_id", model_id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r: any) => r.error);
    if (failed?.error) return NextResponse.json({ error: failed.error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "ordered_ids or ordered_model_ids required" }, { status: 400 });
}
