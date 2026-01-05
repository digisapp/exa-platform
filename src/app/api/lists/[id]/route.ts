import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/lists/[id] - Get single list with models
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can access lists" }, { status: 403 });
  }

  // Get list with items
  const { data: list, error } = await (supabase
    .from("brand_lists") as any)
    .select(`
      *,
      brand_list_items (
        id,
        model_id,
        notes,
        added_at
      )
    `)
    .eq("id", id)
    .eq("brand_id", actor.id)
    .single();

  if (error || !list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Get model details for items
  const modelIds = list.brand_list_items?.map((item: any) => item.model_id) || [];
  let models: any[] = [];

  if (modelIds.length > 0) {
    const { data: modelData } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url, state, city")
      .in("id", modelIds);
    models = modelData || [];
  }

  // Merge model data with list items
  const itemsWithModels = list.brand_list_items?.map((item: any) => ({
    ...item,
    model: models.find(m => m.id === item.model_id),
  })) || [];

  return NextResponse.json({
    list: {
      ...list,
      brand_list_items: itemsWithModels,
      item_count: itemsWithModels.length,
    },
  });
}

// PUT /api/lists/[id] - Update list
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can update lists" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, color } = body;

  const updates: any = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (color !== undefined) updates.color = color;

  const { data: list, error } = await (supabase
    .from("brand_lists") as any)
    .update(updates)
    .eq("id", id)
    .eq("brand_id", actor.id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A list with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  return NextResponse.json({ list });
}

// DELETE /api/lists/[id] - Delete list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can delete lists" }, { status: 403 });
  }

  const { error } = await (supabase
    .from("brand_lists") as any)
    .delete()
    .eq("id", id)
    .eq("brand_id", actor.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
