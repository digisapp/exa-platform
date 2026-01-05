import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET /api/lists - Get all lists for current brand
export async function GET() {
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

  // Get all lists for this brand with item counts
  const { data: lists, error } = await (supabase
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
    .eq("brand_id", actor.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add item count to each list
  const listsWithCounts = lists?.map((list: any) => ({
    ...list,
    item_count: list.brand_list_items?.length || 0,
  })) || [];

  return NextResponse.json({ lists: listsWithCounts });
}

// POST /api/lists - Create new list
export async function POST(request: Request) {
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
    return NextResponse.json({ error: "Only brands can create lists" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, color } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }

  // Create the list
  const { data: list, error } = await (supabase
    .from("brand_lists") as any)
    .insert({
      brand_id: actor.id,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || "#ec4899",
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A list with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ list, item_count: 0 });
}
