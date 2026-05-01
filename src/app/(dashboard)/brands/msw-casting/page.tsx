"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search, Heart, HeartOff, Loader2, ArrowLeft, ChevronDown, ChevronUp, Users,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModelCard {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  hair_color: string | null;
  eye_color: string | null;
  instagram_followers: number | null;
  city: string | null;
  state: string | null;
}

interface MeasurementRowProps {
  label: string;
  value: string | null;
}

function MeasurementRow({ label, value }: MeasurementRowProps) {
  if (!value) return null;
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function ModelPickCard({
  model,
  isPicked,
  onToggle,
  toggling,
}: {
  model: ModelCard;
  isPicked: boolean;
  onToggle: () => void;
  toggling: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasMeasurements = model.bust || model.waist || model.hips || model.height;

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isPicked
          ? "border-pink-500 bg-pink-500/5 shadow-[0_0_20px_rgba(236,72,153,0.15)]"
          : "border-border hover:border-pink-500/30 bg-card"
      }`}
    >
      {/* Photo + name row */}
      <div className="flex items-center gap-3 p-3">
        <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-muted shrink-0">
          {model.profile_photo_url ? (
            <Image
              src={model.profile_photo_url}
              alt={model.first_name || "Model"}
              fill
              className="object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-lg text-muted-foreground font-medium">
              {model.first_name?.[0]}{model.last_name?.[0]}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {model.first_name} {model.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            @{model.username}
            {model.city ? ` · ${model.city}${model.state ? `, ${model.state}` : ""}` : ""}
          </p>
          {model.instagram_followers && (
            <p className="text-xs text-muted-foreground">
              {model.instagram_followers.toLocaleString()} followers
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {hasMeasurements && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title={expanded ? "Hide measurements" : "Show measurements"}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={onToggle}
            disabled={toggling}
            className={`rounded-lg p-2 transition-all ${
              isPicked
                ? "bg-pink-500 text-white hover:bg-pink-600"
                : "border border-border hover:border-pink-500 text-muted-foreground hover:text-pink-500"
            }`}
            title={isPicked ? "Remove from picks" : "Add to picks"}
          >
            {toggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isPicked ? (
              <Heart className="h-4 w-4 fill-current" />
            ) : (
              <Heart className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Measurements drawer */}
      {expanded && hasMeasurements && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2 mx-3 mb-1">
          <div className="space-y-0">
            <MeasurementRow label="Height" value={model.height} />
            <MeasurementRow label="Bust" value={model.bust} />
            <MeasurementRow label="Waist" value={model.waist} />
            <MeasurementRow label="Hips" value={model.hips} />
            <MeasurementRow label="Dress" value={model.dress_size} />
            <MeasurementRow label="Shoe" value={model.shoe_size} />
            <MeasurementRow label="Hair" value={model.hair_color} />
            <MeasurementRow label="Eyes" value={model.eye_color} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MswCastingPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notParticipant, setNotParticipant] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [models, setModels] = useState<ModelCard[]>([]);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showPicksOnly, setShowPicksOnly] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: actor } = await supabase
      .from("actors")
      .select("id, type")
      .eq("user_id", user.id)
      .single() as { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "brand") { setNotParticipant(true); setLoading(false); return; }

    // Find MSW event
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

    // Check brand is a show participant
    const { data: designer } = await (supabase as any)
      .from("event_show_designers")
      .select("id")
      .eq("brand_id", actor.id)
      .maybeSingle() as { data: { id: string } | null };

    if (!designer) { setNotParticipant(true); setLoading(false); return; }

    // Confirmed models = badge holders for this event's badge (same source as the public designers page)
    const { data: eventBadge } = await supabase
      .from("badges")
      .select("id")
      .eq("event_id", event.id)
      .eq("badge_type", "event")
      .eq("is_active", true)
      .maybeSingle() as { data: { id: string } | null };

    const modelIds: string[] = [];
    if (eventBadge) {
      const { data: badgeHolders } = await supabase
        .from("model_badges")
        .select("model_id")
        .eq("badge_id", eventBadge.id) as { data: { model_id: string }[] | null };
      modelIds.push(...(badgeHolders || []).map((b) => b.model_id));
    }

    const [modelsRes, picksRes] = await Promise.all([
      modelIds.length
        ? supabase
            .from("models")
            .select("id, first_name, last_name, username, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, hair_color, eye_color, instagram_followers, city, state")
            .in("id", modelIds)
        : Promise.resolve({ data: [] }),
      fetch(`/api/brands/msw-casting/picks?event_id=${event.id}`).then((r) => r.json()),
    ]);

    const confirmedModels = ((modelsRes.data || []) as ModelCard[])
      .sort((a, b) => (a.first_name || "").localeCompare(b.first_name || ""));

    setModels(confirmedModels);
    setPicks(new Set(picksRes.picks || []));
    setLoading(false);
  }

  async function togglePick(modelId: string) {
    if (!eventId) return;
    setToggling((prev) => new Set(prev).add(modelId));

    const isPicked = picks.has(modelId);
    const method = isPicked ? "DELETE" : "POST";

    const res = await fetch("/api/brands/msw-casting/picks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, event_id: eventId }),
    });

    if (res.ok) {
      setPicks((prev) => {
        const next = new Set(prev);
        isPicked ? next.delete(modelId) : next.add(modelId);
        return next;
      });
      toast.success(isPicked ? "Removed from picks" : "Added to picks");
    } else {
      toast.error("Failed — please try again");
    }

    setToggling((prev) => { const next = new Set(prev); next.delete(modelId); return next; });
  }

  const filtered = useMemo(() => {
    let list = showPicksOnly ? models.filter((m) => picks.has(m.id)) : models;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.first_name?.toLowerCase().includes(q) ||
          m.last_name?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [models, picks, search, showPicksOnly]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notParticipant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <HeartOff className="h-12 w-12 text-muted-foreground opacity-50" />
        <h2 className="text-xl font-semibold">Casting Portal Not Available</h2>
        <p className="text-muted-foreground max-w-sm">
          Your account isn&apos;t registered as an MSW 2026 show participant. Contact the EXA team if you believe this is an error.
        </p>
        <Button variant="outline" asChild>
          <Link href="/brands">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/brands"><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">Model Casting</h1>
          <p className="text-sm text-muted-foreground">{eventName} · {models.length} confirmed models</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={showPicksOnly ? "default" : "outline"}
            className={`cursor-pointer select-none transition-colors ${showPicksOnly ? "bg-pink-500 hover:bg-pink-600 border-pink-500" : "hover:border-pink-500/50"}`}
            onClick={() => setShowPicksOnly((v) => !v)}
          >
            <Heart className={`h-3 w-3 mr-1 ${picks.size > 0 ? "fill-current" : ""}`} />
            My Picks ({picks.size})
          </Badge>
        </div>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-pink-500/20 bg-pink-500/5 p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">How this works:</strong> Browse the confirmed model roster below. Click the heart icon to add models to your private shortlist. Only you and the EXA team can see your picks — other brands cannot. Click a model&apos;s chevron to see full measurements.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or username…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">
            {showPicksOnly ? "No picks yet — browse all models and start adding." : "No models found."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((model) => (
            <ModelPickCard
              key={model.id}
              model={model}
              isPicked={picks.has(model.id)}
              onToggle={() => togglePick(model.id)}
              toggling={toggling.has(model.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
