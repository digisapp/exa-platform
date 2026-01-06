"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, Megaphone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteCampaignButton } from "@/components/campaigns/DeleteCampaignButton";
import { EditCampaignButton } from "@/components/campaigns/EditCampaignButton";
import { CreateCampaignDialog } from "@/components/campaigns/CreateCampaignDialog";

interface Model {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  profile_photo_url?: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  models: Model[];
  model_count: number;
}

interface CampaignsGridProps {
  campaigns: Campaign[];
}

export function CampaignsGrid({ campaigns }: CampaignsGridProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCampaigns = campaigns.filter((campaign) => {
    const query = searchQuery.toLowerCase();
    // Search by campaign name
    if (campaign.name.toLowerCase().includes(query)) return true;
    // Search by description
    if (campaign.description?.toLowerCase().includes(query)) return true;
    // Search by model names in the campaign
    if (campaign.models.some((model) => {
      const modelName = model.first_name
        ? `${model.first_name} ${model.last_name || ""}`.trim().toLowerCase()
        : model.username?.toLowerCase() || "";
      return modelName.includes(query) || model.username?.toLowerCase().includes(query);
    })) return true;
    return false;
  });

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16">
        <Megaphone className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">No campaigns yet</h2>
        <p className="text-muted-foreground mb-6">
          Create campaigns to organize models and send offers for your events.
        </p>
        <CreateCampaignDialog />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      {campaigns.length > 3 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns or models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Campaigns Grid */}
      {filteredCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="group hover:border-violet-500/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: campaign.color }}
                    />
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <EditCampaignButton
                      campaignId={campaign.id}
                      campaignName={campaign.name}
                      campaignDescription={campaign.description}
                      campaignColor={campaign.color}
                    />
                    <DeleteCampaignButton campaignId={campaign.id} campaignName={campaign.name} />
                  </div>
                </div>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <Link href={`/campaigns/${campaign.id}`}>
                  <div className="space-y-3 cursor-pointer">
                    {/* Model Avatars Preview */}
                    <div className="flex items-center">
                      {campaign.models.slice(0, 5).map((model, idx) => (
                        <div
                          key={model.id}
                          className="w-10 h-10 rounded-full border-2 border-background overflow-hidden"
                          style={{ marginLeft: idx === 0 ? 0 : -12 }}
                        >
                          {model.profile_photo_url ? (
                            <Image
                              src={model.profile_photo_url}
                              alt={model.first_name || model.username}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center text-xs">
                              {(model.first_name || model.username)?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      ))}
                      {campaign.model_count > 5 && (
                        <div
                          className="w-10 h-10 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium"
                          style={{ marginLeft: -12 }}
                        >
                          +{campaign.model_count - 5}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {campaign.model_count} {campaign.model_count === 1 ? "model" : "models"}
                      </span>
                      <span className="text-violet-500 group-hover:underline">
                        View Campaign
                      </span>
                    </div>
                  </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-muted-foreground">
            Try a different search term
          </p>
        </div>
      )}
    </div>
  );
}
