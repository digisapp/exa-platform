"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Megaphone, Plus, Check, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  name: string;
  color: string;
  inCampaign: boolean;
  modelCount: number;
}

interface AddToCampaignButtonProps {
  modelId: string;
  modelName: string;
  size?: "sm" | "md" | "lg";
}

export function AddToCampaignButton({
  modelId,
  modelName,
  size = "md",
}: AddToCampaignButtonProps) {
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [newCampaignName, setNewCampaignName] = useState("");
  const [creating, setCreating] = useState(false);

  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  // Fetch campaigns when popover opens
  useEffect(() => {
    if (open) {
      fetchCampaigns();
    }
  }, [open]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/campaigns/model/${modelId}`);
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCampaign = async (campaignId: string, currentlyInCampaign: boolean) => {
    setToggling(campaignId);
    try {
      const res = await fetch(`/api/campaigns/model/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, add: !currentlyInCampaign }),
      });

      if (!res.ok) throw new Error("Failed to update campaign");

      // Update local state
      setCampaigns(campaigns.map(campaign =>
        campaign.id === campaignId
          ? { ...campaign, inCampaign: !currentlyInCampaign, modelCount: campaign.modelCount + (currentlyInCampaign ? -1 : 1) }
          : campaign
      ));

      const campaignName = campaigns.find(c => c.id === campaignId)?.name;
      toast.success(
        currentlyInCampaign
          ? `Removed ${modelName} from ${campaignName}`
          : `Added ${modelName} to ${campaignName}`
      );
    } catch (error) {
      toast.error("Failed to update campaign");
    } finally {
      setToggling(null);
    }
  };

  const createCampaign = async () => {
    if (!newCampaignName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCampaignName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create campaign");
      }

      const data = await res.json();

      // Add to campaign immediately
      await fetch(`/api/campaigns/model/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: data.campaign.id, add: true }),
      });

      // Refresh campaigns
      await fetchCampaigns();
      setNewCampaignName("");
      toast.success(`Created "${newCampaignName}" and added ${modelName}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create campaign");
    } finally {
      setCreating(false);
    }
  };

  const campaignsWithModel = campaigns.filter(c => c.inCampaign).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            sizeClasses[size],
            "rounded-full flex items-center justify-center transition-all",
            campaignsWithModel > 0
              ? "bg-violet-500 text-white hover:bg-violet-600"
              : "bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 hover:text-violet-400"
          )}
          aria-label="Add to campaign"
        >
          <Megaphone className={iconSizes[size]} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="end">
        <div className="space-y-2">
          <p className="text-sm font-medium px-2 py-1">Add to Campaign</p>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-2">
              No campaigns yet. Create one below.
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  onClick={() => toggleCampaign(campaign.id, campaign.inCampaign)}
                  disabled={toggling === campaign.id}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm transition-colors",
                    "hover:bg-muted",
                    toggling === campaign.id && "opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center",
                      campaign.inCampaign
                        ? "bg-violet-500 border-violet-500"
                        : "border-muted-foreground"
                    )}
                  >
                    {campaign.inCampaign && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: campaign.color }}
                  />
                  <span className="flex-1 text-left truncate">{campaign.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {campaign.modelCount}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Create new campaign */}
          <div className="border-t pt-2 mt-2">
            <div className="flex gap-2">
              <Input
                placeholder="New campaign name..."
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createCampaign()}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={createCampaign}
                disabled={!newCampaignName.trim() || creating}
                className="h-8 px-2"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
