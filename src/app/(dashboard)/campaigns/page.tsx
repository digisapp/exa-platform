import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Megaphone } from "lucide-react";
import type { Metadata } from "next";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";
import { CampaignsGrid } from "@/components/campaigns/CampaignsGrid";

export const metadata: Metadata = {
  title: "Campaigns | EXA",
  description: "Manage your model campaigns on EXA",
};

export default async function CampaignsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/signin?redirect=/campaigns");
  }

  // Get actor and verify it's a brand
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "brand") {
    redirect("/dashboard");
  }

  // Get all campaigns with models
  const { data: campaigns } = await (supabase
    .from("campaigns") as any)
    .select(`
      *,
      campaign_models (
        id,
        model_id,
        added_at
      )
    `)
    .eq("brand_id", actor.id)
    .order("created_at", { ascending: false });

  // Get model details for campaign previews
  const allModelIds = campaigns?.flatMap((campaign: any) =>
    campaign.campaign_models?.map((item: any) => item.model_id) || []
  ) || [];

  const modelsMap = new Map();
  if (allModelIds.length > 0) {
    const uniqueModelIds = [...new Set(allModelIds)];
    const { data: models } = await supabase
      .from("models")
      .select("id, username, first_name, last_name, profile_photo_url")
      .in("id", uniqueModelIds);

    models?.forEach((m: any) => modelsMap.set(m.id, m));
  }

  // Enrich campaigns with model data
  const enrichedCampaigns = campaigns?.map((campaign: any) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    color: campaign.color,
    models: campaign.campaign_models?.map((item: any) => modelsMap.get(item.model_id)).filter(Boolean) || [],
    model_count: campaign.campaign_models?.length || 0,
  })) || [];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <Megaphone className="h-8 w-8 text-violet-500" />
            <h1 className="text-3xl font-bold">Campaigns</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Organize models and send offers for your events and projects
          </p>
        </div>
        {enrichedCampaigns.length > 0 && <CreateCampaignDialog />}
      </div>

      {/* Campaigns Grid with Search */}
      <CampaignsGrid campaigns={enrichedCampaigns} />
    </>
  );
}
