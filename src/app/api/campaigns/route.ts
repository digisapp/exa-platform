import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Zod schema for campaign creation validation
const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(100, "Campaign name is too long").trim(),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid color format").optional().default("#ec4899"),
});

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
export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Only brands can create campaigns" }, { status: 403 });
  }

  // Use service role client to bypass RLS
  const adminClient = createServiceRoleClient();

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

  // Validate request body with Zod schema
  const validationResult = createCampaignSchema.safeParse(body);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return NextResponse.json(
      { error: firstError.message },
      { status: 400 }
    );
  }

  const { name, description, color } = validationResult.data;

  // Create the campaign
  const { data: campaign, error } = await (adminClient
    .from("campaigns") as any)
    .insert({
      brand_id: actor.id,
      name,
      description: description || null,
      color,
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
