import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// GET /api/lists/model/[modelId] - Get all lists and whether this model is in each
export async function GET(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
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

  // Get all lists for this brand
  const { data: lists, error } = await (supabase
    .from("brand_lists") as any)
    .select(`
      id,
      name,
      color,
      brand_list_items (
        model_id
      )
    `)
    .eq("brand_id", actor.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format lists with inList boolean
  const listsWithStatus = lists?.map((list: any) => ({
    id: list.id,
    name: list.name,
    color: list.color,
    inList: list.brand_list_items?.some((item: any) => item.model_id === modelId) || false,
    itemCount: list.brand_list_items?.length || 0,
  })) || [];

  return NextResponse.json({ lists: listsWithStatus });
}

// POST /api/lists/model/[modelId] - Toggle model in list
export async function POST(
  request: Request,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
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
    return NextResponse.json({ error: "Only brands can modify lists" }, { status: 403 });
  }

  const body = await request.json();
  const { listId, add } = body;

  if (!listId) {
    return NextResponse.json({ error: "List ID is required" }, { status: 400 });
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

  // Use service role client to bypass RLS for insert/delete
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (add) {
    // Add model to list
    const { error } = await (adminClient
      .from("brand_list_items") as any)
      .upsert({
        list_id: listId,
        model_id: modelId,
      }, { onConflict: "list_id,model_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Remove model from list
    const { error } = await (adminClient
      .from("brand_list_items") as any)
      .delete()
      .eq("list_id", listId)
      .eq("model_id", modelId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, added: add });
}
