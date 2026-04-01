import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// PATCH /api/admin/lineups/[id] — update show details
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, show_date, show_time, show_order, status, notes } = body;

  const supabase: any = createServiceRoleClient();

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (show_date !== undefined) updates.show_date = show_date || null;
  if (show_time !== undefined) updates.show_time = show_time || null;
  if (show_order !== undefined) updates.show_order = show_order;
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;

  const { data, error } = await supabase.from("event_shows")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/lineups/[id] — delete a show (cascades designers + models)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase: any = createServiceRoleClient();

  const { error } = await supabase.from("event_shows")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
