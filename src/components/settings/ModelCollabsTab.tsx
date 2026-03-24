"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Handshake } from "lucide-react";
import type { Model } from "@/types/database";

interface ModelCollabsTabProps {
  model: Model;
  onChange: (model: Model) => void;
}

export function ModelCollabsTab({ model, onChange }: ModelCollabsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-pink-500" />
          Brand Collaborations
        </CardTitle>
        <CardDescription>
          Let brands know you&apos;re open to sponsored posts and content deals. Your average impressions help brands estimate their reach.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Open to collabs toggle */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-lg border bg-gradient-to-r from-pink-500/10 to-violet-500/10">
          <div className="min-w-0">
            <Label className="text-base font-semibold">Open to Brand Collabs</Label>
            <p className="text-sm text-muted-foreground">Show brands that you&apos;re available for sponsored content deals</p>
          </div>
          <Switch
            checked={(model as any).open_to_collabs ?? false}
            onCheckedChange={(v) => onChange({ ...model, open_to_collabs: v } as any)}
          />
        </div>

        {(model as any).open_to_collabs && (
          <>
            {/* Collab Types */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Types of Collabs You&apos;re Open To</Label>
              <p className="text-sm text-muted-foreground">Select all that apply so brands know what you offer</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: "sponsored_post", label: "Sponsored Posts" },
                  { key: "product_review", label: "Product Reviews" },
                  { key: "brand_ambassador", label: "Brand Ambassador" },
                  { key: "ugc_content", label: "UGC Content" },
                  { key: "event_appearance", label: "Event Appearances" },
                  { key: "affiliate", label: "Affiliate / Commission" },
                  { key: "giveaway", label: "Giveaways" },
                  { key: "takeover", label: "Account Takeovers" },
                ].map(({ key, label }) => {
                  const collabTypes: string[] = (model as any).collab_types || [];
                  const isSelected = collabTypes.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const updated = isSelected
                          ? collabTypes.filter((t: string) => t !== key)
                          : [...collabTypes, key];
                        onChange({ ...model, collab_types: updated } as any);
                      }}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${
                        isSelected
                          ? "border-pink-500 bg-pink-500/10 text-pink-500"
                          : "border-border hover:border-pink-500/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instagram stats */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Instagram</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avg_ig_impressions">Avg Impressions per Post</Label>
                  <Input
                    id="avg_ig_impressions"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 25000"
                    value={(model as any).avg_instagram_impressions || ""}
                    onChange={(e) => onChange({ ...model, avg_instagram_impressions: parseInt(e.target.value) || null } as any)}
                  />
                  <p className="text-xs text-muted-foreground">Find this in Instagram Insights &rarr; Reach/Impressions</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ig_collab_rate">Your Rate per Sponsored Post ($)</Label>
                  <Input
                    id="ig_collab_rate"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 300"
                    value={(model as any).instagram_collab_rate || ""}
                    onChange={(e) => onChange({ ...model, instagram_collab_rate: parseInt(e.target.value) || null } as any)}
                  />
                  <p className="text-xs text-muted-foreground">Flat fee you charge for a sponsored Instagram post/Reel</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ig_engagement_rate">Avg Engagement Rate (%)</Label>
                <Input
                  id="ig_engagement_rate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="e.g. 3.5"
                  value={(model as any).instagram_engagement_rate || ""}
                  onChange={(e) => onChange({ ...model, instagram_engagement_rate: parseFloat(e.target.value) || null } as any)}
                />
                <p className="text-xs text-muted-foreground">Likes + Comments &divide; Followers &times; 100 — find in Instagram Insights</p>
              </div>
              {(model as any).avg_instagram_impressions && (model as any).instagram_collab_rate && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                  <span className="font-medium text-green-400">Your Instagram CPM: </span>
                  <span className="text-green-300">
                    ${(((model as any).instagram_collab_rate / (model as any).avg_instagram_impressions) * 1000).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground"> per 1,000 impressions</span>
                </div>
              )}
            </div>

            {/* TikTok stats */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">TikTok</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avg_tiktok_views">Avg Views per Video</Label>
                  <Input
                    id="avg_tiktok_views"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 50000"
                    value={(model as any).avg_tiktok_views || ""}
                    onChange={(e) => onChange({ ...model, avg_tiktok_views: parseInt(e.target.value) || null } as any)}
                  />
                  <p className="text-xs text-muted-foreground">Find this in TikTok Analytics &rarr; Content &rarr; Video Views</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok_collab_rate">Your Rate per Sponsored TikTok ($)</Label>
                  <Input
                    id="tiktok_collab_rate"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="e.g. 250"
                    value={(model as any).tiktok_collab_rate || ""}
                    onChange={(e) => onChange({ ...model, tiktok_collab_rate: parseInt(e.target.value) || null } as any)}
                  />
                  <p className="text-xs text-muted-foreground">Flat fee you charge for a sponsored TikTok video</p>
                </div>
              </div>
              {(model as any).avg_tiktok_views && (model as any).tiktok_collab_rate && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm">
                  <span className="font-medium text-green-400">Your TikTok CPM: </span>
                  <span className="text-green-300">
                    ${(((model as any).tiktok_collab_rate / (model as any).avg_tiktok_views) * 1000).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground"> per 1,000 views</span>
                </div>
              )}
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <strong className="text-foreground">CPM formula:</strong> (Your Rate &divide; Avg Impressions) &times; 1,000. Industry average is $5–$20 CPM depending on your niche.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
