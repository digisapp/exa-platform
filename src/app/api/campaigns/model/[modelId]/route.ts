import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { checkEndpointRateLimit } from "@/lib/rate-limit";

// GET /api/campaigns/model/[modelId] - Get all campaigns and whether this model is in each
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
  if (rateLimitResponse) return rateLimitResponse;

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can access campaigns" }, { status: 403 });
  }

  // Get all campaigns for this brand
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select(`
      id,
      name,
      color,
      campaign_models (
        model_id
      )
    `)
    .eq("brand_id", actor.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Format campaigns with inCampaign boolean
  const campaignsWithStatus = campaigns?.map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    color: campaign.color,
    inCampaign: campaign.campaign_models?.some((item: any) => item.model_id === modelId) || false,
    modelCount: campaign.campaign_models?.length || 0,
  })) || [];

  return NextResponse.json({ campaigns: campaignsWithStatus });
}

// POST /api/campaigns/model/[modelId] - Toggle model in campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ modelId: string }> }
) {
  const { modelId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit
  const rateLimitResponse = await checkEndpointRateLimit(request, "general", user.id);
  if (rateLimitResponse) return rateLimitResponse;

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    return NextResponse.json({ error: "Only brands can modify campaigns" }, { status: 403 });
  }

  const body = await request.json();
  const { campaignId, add } = body;

  if (!campaignId) {
    return NextResponse.json({ error: "Campaign ID is required" }, { status: 400 });
  }

  // Verify the campaign belongs to this brand
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("brand_id", actor.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Use service role client to bypass RLS for insert/delete
  const adminClient = createServiceRoleClient();

  if (add) {
    // Add model to campaign
    const { error } = await adminClient
      .from("campaign_models")
      .upsert({
        campaign_id: campaignId,
        model_id: modelId,
      }, { onConflict: "campaign_id,model_id" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Remove model from campaign
    const { error } = await adminClient
      .from("campaign_models")
      .delete()
      .eq("campaign_id", campaignId)
      .eq("model_id", modelId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true, added: add });
}
