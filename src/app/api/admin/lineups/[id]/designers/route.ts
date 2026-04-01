import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service";

// POST /api/admin/lineups/[id]/designers — add a designer to a show
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: showId } = await params;
  const body = await req.json();
  const { designer_name } = body;

  if (!designer_name?.trim()) {
    return NextResponse.json({ error: "designer_name required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  // Get next designer_order
  const { data: existing } = await supabase
    .from("event_show_designers")
    .select("designer_order")
    .eq("show_id", showId)
    .order("designer_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.designer_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("event_show_designers")
    .insert({
      show_id: showId,
      designer_name: designer_name.trim(),
      designer_order: nextOrder,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "This designer is already in this show" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, models: [] }, { status: 201 });
}

// DELETE /api/admin/lineups/[id]/designers — remove a designer from a show
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const { designer_id } = body;

  if (!designer_id) {
    return NextResponse.json({ error: "designer_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  const { error } = await supabase
    .from("event_show_designers")
    .delete()
    .eq("id", designer_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
