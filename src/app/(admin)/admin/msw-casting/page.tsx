"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, Heart, ChevronDown, ChevronUp, Building2, RefreshCw, Loader2, Users,
} from "lucide-react";

interface ModelRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  height: string | null;
}

interface BrandPick {
  brand_id: string;
  company_name: string;
  logo_url: string | null;
  picks: string[];
}

export default function AdminMswCastingPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [confirmedCount, setConfirmedCount] = useState(0);

  const [brandPicks, setBrandPicks] = useState<BrandPick[]>([]);
  const [picksLoading, setPicksLoading] = useState(false);
  const [expandedBrand, setExpandedBrand] = useState<string | null>(null);
  const [modelMap, setModelMap] = useState<Map<string, ModelRow>>(new Map());

  useEffect(() => {
    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadInitial() {
    const { data: event } = await supabase
      .from("events")
      .select("id, name")
      .ilike("name", "%miami swim week%")
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: { id: string; name: string } | null };

    if (!event) { setLoading(false); return; }
    setEventId(event.id);
    setEventName(event.name);

    // Confirmed models = badge holders for this event
    const { data: eventBadge } = await supabase
      .from("badges")
      .select("id")
      .eq("event_id", event.id)
      .eq("badge_type", "event")
      .eq("is_active", true)
      .maybeSingle() as { data: { id: string } | null };

    if (eventBadge) {
      const { data: badgeHolders } = await supabase
        .from("model_badges")
        .select("model_id")
        .eq("badge_id", eventBadge.id) as { data: { model_id: string }[] | null };

      const modelIds = (badgeHolders || []).map((b) => b.model_id);
      setConfirmedCount(modelIds.length);

      if (modelIds.length > 0) {
        const { data: models } = await supabase
          .from("models")
          .select("id, first_name, last_name, username, profile_photo_url, height")
          .in("id", modelIds);
        setModelMap(new Map(((models || []) as ModelRow[]).map((m) => [m.id, m])));
      }
    }

    setLoading(false);
  }

  async function loadBrandPicks() {
    if (!eventId) return;
    setPicksLoading(true);

    const { data: designers } = await (supabase as any)
      .from("event_show_designers")
      .select("brand_id, brand:brands ( company_name, logo_url )")
      .not("brand_id", "is", null) as {
        data: Array<{
          brand_id: string;
          brand: { company_name: string; logo_url: string | null } | null;
        }> | null;
      };

    if (!designers?.length) { setPicksLoading(false); return; }

    const { data: picks } = await (supabase as any)
      .from("msw_casting_picks")
      .select("brand_id, model_id")
      .eq("event_id", eventId) as { data: Array<{ brand_id: string; model_id: string }> | null };

    const picksByBrand: Record<string, string[]> = {};
    for (const p of picks || []) {
      if (!picksByBrand[p.brand_id]) picksByBrand[p.brand_id] = [];
      picksByBrand[p.brand_id].push(p.model_id);
    }

    const seen = new Set<string>();
    const rows: BrandPick[] = [];
    for (const d of designers) {
      if (!d.brand_id || !d.brand || seen.has(d.brand_id)) continue;
      seen.add(d.brand_id);
      rows.push({
        brand_id: d.brand_id,
        company_name: d.brand.company_name,
        logo_url: d.brand.logo_url,
        picks: picksByBrand[d.brand_id] || [],
      });
    }
    rows.sort((a, b) => b.picks.length - a.picks.length);
    setBrandPicks(rows);
    setPicksLoading(false);
  }

  useEffect(() => {
    if (eventId && brandPicks.length === 0 && !picksLoading) loadBrandPicks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Admin</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">MSW Casting Portal</h1>
          <p className="text-sm text-muted-foreground">
            {eventName} · {confirmedCount} confirmed models (badge holders) · {brandPicks.filter((b) => b.picks.length > 0).length} brands with picks
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{confirmedCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Confirmed Models</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{brandPicks.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Brands Registered</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{brandPicks.reduce((s, b) => s + b.picks.length, 0)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Picks</p>
          </CardContent>
        </Card>
      </div>

      {/* Import instructions */}
      <Card className="border-dashed border-border/60">
        <CardContent className="p-4">
          <p className="text-sm font-medium mb-1">Import Brand Accounts from CSV</p>
          <p className="text-xs text-muted-foreground mb-2">
            Run once from your terminal after placing the CSV at any path. CSV must have <code className="bg-muted px-1 rounded">brand_name,email</code> headers.
          </p>
          <code className="block text-xs bg-muted rounded-lg px-3 py-2 text-muted-foreground select-all">
            npx tsx scripts/data-imports/import-msw-brands.ts path/to/brands.csv
          </code>
          <p className="text-xs text-muted-foreground mt-2">Add <code className="bg-muted px-1 rounded">--dry-run</code> first to preview without sending emails.</p>
        </CardContent>
      </Card>

      {/* Brand Picks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500" />
            Brand Picks
          </h2>
          <Button variant="outline" size="sm" onClick={() => { setBrandPicks([]); loadBrandPicks(); }}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
          </Button>
        </div>

        {picksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : brandPicks.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No brands registered yet. Run the import script first.</p>
          </div>
        ) : (
          brandPicks.map((brand) => (
            <Card key={brand.brand_id} className={`border-border transition-colors ${brand.picks.length === 0 ? "opacity-60" : ""}`}>
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedBrand(expandedBrand === brand.brand_id ? null : brand.brand_id)}
              >
                <div className="relative h-9 w-9 rounded-lg overflow-hidden bg-muted shrink-0">
                  {brand.logo_url ? (
                    <Image src={brand.logo_url} alt={brand.company_name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground font-medium">
                      {brand.company_name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{brand.company_name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={brand.picks.length > 0 ? "default" : "outline"}
                    className={brand.picks.length > 0 ? "bg-pink-500 border-pink-500" : ""}
                  >
                    {brand.picks.length} pick{brand.picks.length !== 1 ? "s" : ""}
                  </Badge>
                  {brand.picks.length > 0 && (
                    expandedBrand === brand.brand_id
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {expandedBrand === brand.brand_id && brand.picks.length > 0 && (
                <CardContent className="pt-0 pb-4 px-4 border-t border-border/50">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mt-3">
                    {brand.picks.map((modelId) => {
                      const model = modelMap.get(modelId);
                      if (!model) return null;
                      return (
                        <div key={modelId} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                          <div className="relative h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                            {model.profile_photo_url ? (
                              <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                                {model.first_name?.[0]}{model.last_name?.[0]}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{model.first_name} {model.last_name}</p>
                            <p className="text-[10px] text-muted-foreground">@{model.username}{model.height ? ` · ${model.height}` : ""}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}

        {brandPicks.length > 0 && brandPicks.filter((b) => b.picks.length === 0).length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {brandPicks.filter((b) => b.picks.length === 0).length} brand{brandPicks.filter((b) => b.picks.length === 0).length !== 1 ? "s" : ""} haven&apos;t picked yet
          </p>
        )}
      </div>

      {/* Manage confirmed models link */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Confirmed models are managed via the <strong>badge system</strong>. To add or remove models from the casting pool, go to{" "}
          <Link href="/admin/models" className="text-pink-500 hover:underline">Admin → Models</Link> and award/revoke the MSW 2026 event badge.
        </p>
      </div>
    </div>
  );
}
