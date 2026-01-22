import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET /api/campaigns - Get all campaigns for current brand
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit check
  const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can access campaigns" }, { status: 403 });
  }

  // Get all campaigns for this brand with model counts
  const { data: campaigns, error } = await (supabase
    .from("campaigns") as any)
    .select(`
      *,
      campaign_models (
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

  // Add model count to each campaign
  const campaignsWithCounts = campaigns?.map((campaign: any) => ({
    ...campaign,
    model_count: campaign.campaign_models?.length || 0,
  })) || [];

  return NextResponse.json({ campaigns: campaignsWithCounts });
}

// POST /api/campaigns - Create new campaign
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
    return NextResponse.json({ error: "Only brands can create campaigns" }, { status: 403 });
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

  // Check campaign limit (skip if unlimited: -1)
  if (tierConfig.maxLists !== -1) {
    const { count } = await (adminClient
      .from("campaigns") as any)
      .select("id", { count: "exact", head: true })
      .eq("brand_id", actor.id);

    if ((count || 0) >= tierConfig.maxLists) {
      return NextResponse.json({
        error: `You've reached your campaign limit (${tierConfig.maxLists} campaigns). Upgrade your plan to create more.`,
        code: "CAMPAIGN_LIMIT_REACHED"
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const { name, description, color } = body;

  if (!name || name.trim().length === 0) {
    return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
  }

  // Create the campaign
  const { data: campaign, error } = await (adminClient
    .from("campaigns") as any)
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
      return NextResponse.json({ error: "A campaign with this name already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaign, model_count: 0 });
}
