import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Users } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ModelCard } from "@/components/models/model-card";
import { RemoveFromCampaignButton } from "@/components/campaigns/RemoveFromCampaignButton";
import { BulkAddModelsDialog } from "@/components/campaigns/BulkAddModelsDialog";
import { ModelTagsDisplay } from "@/components/brands/ModelTagsDisplay";
import { SendOfferDialog } from "@/components/offers/SendOfferDialog";
import { CampaignOffers } from "@/components/campaigns/CampaignOffers";

export const metadata: Metadata = {
  title: "Campaign | EXA",
  description: "View your campaign on EXA",
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Get campaign with models
  const { data: campaign, error } = await (supabase
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
    .eq("id", id)
    .eq("brand_id", actor.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Get model details
  const modelIds = campaign.campaign_models?.map((item: any) => item.model_id) || [];
  let models: any[] = [];

  if (modelIds.length > 0) {
    const { data: modelData } = await supabase
      .from("models")
      .select("*")
      .in("id", modelIds);
    models = modelData || [];
  }

  // Create a map for quick lookup
  const modelsMap = new Map(models.map(m => [m.id, m]));

  // Merge with campaign items to preserve order and get notes
  const orderedModels = campaign.campaign_models
    ?.map((item: any) => ({
      ...modelsMap.get(item.model_id),
      campaignItemId: item.id,
      notes: item.notes,
      addedAt: item.added_at,
    }))
    .filter((m: any) => m.id) || [];

  return (
    <>
      <PageHeader
        backHref="/campaigns"
        backLabel="Back to Campaigns"
        title={campaign.name}
        actions={
          <div className="flex items-center gap-3">
            <BulkAddModelsDialog
              campaignId={id}
              campaignName={campaign.name}
              existingModelIds={modelIds}
            />
            {orderedModels.length > 0 && (
              <SendOfferDialog
                campaignId={id}
                campaignName={campaign.name}
                modelCount={orderedModels.length}
              />
            )}
          </div>
        }
      />

      {/* Campaign Details */}
      <div className="mb-8 -mt-2">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: campaign.color }}
          />
          <span className="text-muted-foreground">{campaign.description}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {orderedModels.length} {orderedModels.length === 1 ? "model" : "models"}
        </p>
      </div>

      {/* Offers Section */}
      <CampaignOffers campaignId={id} />

      {/* Models Section */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Models in Campaign</h2>
        {orderedModels.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {orderedModels.map((model: any) => (
              <div key={model.id} className="relative group">
                <ModelTagsDisplay
                  modelId={model.id}
                  modelName={model.first_name || model.username}
                />
                <ModelCard
                  model={model}
                  showFavorite={false}
                  isLoggedIn={true}
                />
                <RemoveFromCampaignButton
                  campaignId={id}
                  modelId={model.id}
                  modelName={model.first_name || model.username}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Users className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No models in this campaign</h2>
            <p className="text-muted-foreground mb-6">
              Browse models and add them to this campaign.
            </p>
            <Button asChild>
              <Link href="/models">Browse Models</Link>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
