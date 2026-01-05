import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST /api/lists/[id]/items - Add model to list
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
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
    return NextResponse.json({ error: "Only brands can add to lists" }, { status: 403 });
  }

  // Verify the list belongs to this brand
  const { data: list } = await (supabase
    .from("brand_lists") as any)
    .select("id")
    .eq("id", listId)
    .eq("brand_id", actor.id)
    .single();

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  const body = await request.json();
  const { modelId, notes } = body;

  if (!modelId) {
    return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
  }

  // Add model to list
  const { data: item, error } = await (supabase
    .from("brand_list_items") as any)
    .insert({
      list_id: listId,
      model_id: modelId,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Model is already in this list" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item });
}

// DELETE /api/lists/[id]/items - Remove model from list
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listId } = await params;
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
    return NextResponse.json({ error: "Only brands can remove from lists" }, { status: 403 });
  }

  // Get modelId from query params
  const url = new URL(request.url);
  const modelId = url.searchParams.get("modelId");

  if (!modelId) {
    return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
  }

  // Verify the list belongs to this brand
  const { data: list } = await (supabase
    .from("brand_lists") as any)
    .select("id")
    .eq("id", listId)
    .eq("brand_id", actor.id)
    .single();

  if (!list) {
    return NextResponse.json({ error: "List not found" }, { status: 404 });
  }

  // Remove model from list
  const { error } = await (supabase
    .from("brand_list_items") as any)
    .delete()
    .eq("list_id", listId)
    .eq("model_id", modelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
