import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";

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

  // Use service role client to bypass RLS
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get brand's subscription tier
  const { data: brand } = await (adminClient
    .from("brands") as any)
    .select("subscription_tier, subscription_status")
    .eq("id", actor.id)
    .single();

  const tier = (brand?.subscription_status === "active" ? brand?.subscription_tier : "free") as BrandTier || "free";
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[tier];

  // Check list limit (skip if unlimited: -1)
  if (tierConfig.maxLists !== -1) {
    const { count } = await (adminClient
      .from("brand_lists") as any)
      .select("id", { count: "exact", head: true })
      .eq("brand_id", actor.id);

    if ((count || 0) >= tierConfig.maxLists) {
      return NextResponse.json({
        error: `You've reached your list limit (${tierConfig.maxLists} lists). Upgrade your plan to create more lists.`,
        code: "LIST_LIMIT_REACHED"
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const { name, description, color } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }

  // Create the list
  const { data: list, error } = await (adminClient
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
