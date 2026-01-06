import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";

// POST /api/campaigns/[id]/models - Add model to campaign
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
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
    return NextResponse.json({ error: "Only brands can add to campaigns" }, { status: 403 });
  }

  // Use service role client to bypass RLS
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Verify the campaign belongs to this brand
  const { data: campaign } = await (supabase
    .from("campaigns") as any)
    .select("id")
    .eq("id", campaignId)
    .eq("brand_id", actor.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Get brand's subscription tier
  const { data: brand } = await (adminClient
    .from("brands") as any)
    .select("subscription_tier, subscription_status")
    .eq("id", actor.id)
    .single();

  const tier = (brand?.subscription_status === "active" ? brand?.subscription_tier : "free") as BrandTier || "free";
  const tierConfig = BRAND_SUBSCRIPTION_TIERS[tier];

  // Check models per campaign limit (skip if unlimited: -1)
  if (tierConfig.maxModelsPerList !== -1) {
    const { count } = await (adminClient
      .from("campaign_models") as any)
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    if ((count || 0) >= tierConfig.maxModelsPerList) {
      return NextResponse.json({
        error: `This campaign has reached its limit (${tierConfig.maxModelsPerList} models). Upgrade your plan to add more models.`,
        code: "CAMPAIGN_MODEL_LIMIT_REACHED"
      }, { status: 403 });
    }
  }

  const body = await request.json();
  const { modelId, notes } = body;

  if (!modelId) {
    return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
  }

  // Add model to campaign
  const { data: item, error } = await (adminClient
    .from("campaign_models") as any)
    .insert({
      campaign_id: campaignId,
      model_id: modelId,
      notes: notes?.trim() || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Model is already in this campaign" }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ item });
}

// DELETE /api/campaigns/[id]/models - Remove model from campaign
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params;
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
    return NextResponse.json({ error: "Only brands can remove from campaigns" }, { status: 403 });
  }

  // Get modelId from query params
  const url = new URL(request.url);
  const modelId = url.searchParams.get("modelId");

  if (!modelId) {
    return NextResponse.json({ error: "Model ID is required" }, { status: 400 });
  }

  // Verify the campaign belongs to this brand
  const { data: campaign } = await (supabase
    .from("campaigns") as any)
    .select("id")
    .eq("id", campaignId)
    .eq("brand_id", actor.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Use service role client to bypass RLS for delete
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Remove model from campaign
  const { error } = await (adminClient
    .from("campaign_models") as any)
    .delete()
    .eq("campaign_id", campaignId)
    .eq("model_id", modelId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
