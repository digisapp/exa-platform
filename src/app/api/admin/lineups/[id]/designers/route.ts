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

// PATCH /api/admin/lineups/[id]/designers — rename or move a designer
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json();
  const { designer_id, designer_name, move_to_show_id } = body as {
    designer_id: string;
    designer_name?: string;
    move_to_show_id?: string;
  };

  if (!designer_id) {
    return NextResponse.json({ error: "designer_id required" }, { status: 400 });
  }

  const supabase: any = createServiceRoleClient();

  if (move_to_show_id) {
    // Get next designer_order in target show
    const { data: existing } = await supabase
      .from("event_show_designers")
      .select("designer_order")
      .eq("show_id", move_to_show_id)
      .order("designer_order", { ascending: false })
      .limit(1);
    const nextOrder = (existing?.[0]?.designer_order ?? -1) + 1;

    const update: Record<string, any> = { show_id: move_to_show_id, designer_order: nextOrder };
    if (designer_name?.trim()) update.designer_name = designer_name.trim();

    const { data, error } = await supabase
      .from("event_show_designers")
      .update(update)
      .eq("id", designer_id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Designer already exists in the target show" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  if (designer_name?.trim()) {
    const { data, error } = await supabase
      .from("event_show_designers")
      .update({ designer_name: designer_name.trim() })
      .eq("id", designer_id)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Designer name already exists in this show" }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
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
