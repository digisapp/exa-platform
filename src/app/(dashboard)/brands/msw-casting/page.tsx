"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, HeartOff, ArrowLeft, X, ChevronDown,
  Users, Zap, Trophy, LayoutGrid,
} from "lucide-react";
import { ModelDraftCard, type DraftModelData } from "@/components/models/model-draft-card";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModelRow extends DraftModelData {
  bust: string | null;
  waist: string | null;
  hips: string | null;
  shoe_size: string | null;
}

// ─── Picked model mini-card in the lineup panel ───────────────────────────────
// Must be a motion element so AnimatePresence can drive its exit animation

function LineupCard({ model, index, onRemove }: { model: ModelRow; index: number; onRemove: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 30, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 30, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className="flex items-center gap-2 p-2 rounded-xl border border-white/[0.07] bg-white/[0.02] group"
    >
      <span className="text-[9px] font-black text-white/20 tabular-nums w-5 shrink-0 text-center">
        #{index + 1}
      </span>
      <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0">
        {model.profile_photo_url ? (
          <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover object-top" />
        ) : (
          <div className="h-full w-full bg-white/5 flex items-center justify-center text-xs text-white/30">
            {model.first_name?.[0]}{model.last_name?.[0]}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white/90 truncate">{model.first_name} {model.last_name}</p>
        <p className="text-[10px] text-white/35 truncate">
          {model.height && `${model.height}`}
          {model.dress_size && ` · Sz ${model.dress_size}`}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

const HEIGHT_FILTERS = [
  { label: "All Heights", min: 0, max: 999 },
  { label: `5'4"–5'6"`, min: 64, max: 66 },
  { label: `5'7"–5'9"`, min: 67, max: 69 },
  { label: `5'10"+`, min: 70, max: 999 },
];

function parseHeightInches(h: string | null): number {
  if (!h) return 0;
  const m = h.match(/(\d+)'(\d+)"/);
  if (m) return parseInt(m[1]) * 12 + parseInt(m[2]);
  const in2 = h.match(/(\d+)"/);
  if (in2) return parseInt(in2[1]);
  return 0;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MswCastingPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [notParticipant, setNotParticipant] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [eventName, setEventName] = useState("");
  const [models, setModels] = useState<ModelRow[]>([]);
  const [picks, setPicks] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  // Filter state
  const [search, setSearch] = useState("");
  const [heightFilter, setHeightFilter] = useState(0); // index into HEIGHT_FILTERS
  const [showPicksOnly, setShowPicksOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: actor } = await supabase
      .from("actors").select("id, type").eq("user_id", user.id).single() as
      { data: { id: string; type: string } | null };

    if (!actor || actor.type !== "brand") { setNotParticipant(true); setLoading(false); return; }

    const { data: event } = await supabase
      .from("events").select("id, name")
      .ilike("name", "%miami swim week%")
      .order("year", { ascending: false }).limit(1).maybeSingle() as
      { data: { id: string; name: string } | null };

    if (!event) { setLoading(false); return; }
    setEventId(event.id);
    setEventName(event.name);

    const { data: designer } = await (supabase as any)
      .from("event_show_designers").select("id")
      .eq("brand_id", actor.id).maybeSingle() as { data: { id: string } | null };

    if (!designer) { setNotParticipant(true); setLoading(false); return; }

    const { data: eventBadge } = await supabase
      .from("badges").select("id")
      .eq("event_id", event.id).eq("badge_type", "event").eq("is_active", true)
      .maybeSingle() as { data: { id: string } | null };

    const modelIds: string[] = [];
    if (eventBadge) {
      const { data: holders } = await supabase
        .from("model_badges").select("model_id").eq("badge_id", eventBadge.id) as
        { data: { model_id: string }[] | null };
      modelIds.push(...(holders || []).map((b) => b.model_id));
    }

    const [modelsRes, picksRes] = await Promise.all([
      modelIds.length
        ? supabase.from("models")
            .select("id, first_name, last_name, username, profile_photo_url, height, bust, waist, hips, dress_size, shoe_size, instagram_followers, city, state, admin_rating, reliability_score, focus_tags")
            .in("id", modelIds)
        : Promise.resolve({ data: [] }),
      fetch(`/api/brands/msw-casting/picks?event_id=${event.id}`).then((r) => r.json()),
    ]);

    const sorted = ((modelsRes.data || []) as ModelRow[])
      .sort((a, b) => (b.admin_rating ?? 0) - (a.admin_rating ?? 0) || (a.first_name ?? "").localeCompare(b.first_name ?? ""));

    setModels(sorted);
    setPicks(new Set(picksRes.picks || []));
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  const togglePick = useCallback(async (modelId: string) => {
    if (!eventId) return;
    setToggling((prev) => new Set(prev).add(modelId));
    const isPicked = picks.has(modelId);

    const res = await fetch("/api/brands/msw-casting/picks", {
      method: isPicked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: modelId, event_id: eventId }),
    });

    if (res.ok) {
      setPicks((prev) => {
        const next = new Set(prev);
        isPicked ? next.delete(modelId) : next.add(modelId);
        return next;
      });
      if (!isPicked) toast.success("Added to your lineup", { duration: 1500 });
    } else {
      toast.error("Failed — please try again");
    }

    setToggling((prev) => { const next = new Set(prev); next.delete(modelId); return next; });
  }, [eventId, picks]);

  const heightRange = HEIGHT_FILTERS[heightFilter];

  const filtered = useMemo(() => {
    let list = showPicksOnly ? models.filter((m) => picks.has(m.id)) : models;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.first_name?.toLowerCase().includes(q) || m.last_name?.toLowerCase().includes(q) || m.username?.toLowerCase().includes(q)
      );
    }
    if (heightFilter > 0) {
      list = list.filter((m) => {
        const inches = parseHeightInches(m.height);
        return inches >= heightRange.min && inches <= heightRange.max;
      });
    }
    return list;
  }, [models, picks, search, showPicksOnly, heightFilter, heightRange]);

  const pickedModels = useMemo(() => models.filter((m) => picks.has(m.id)), [models, picks]);

  // ─── Loading / gate screens ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-br from-pink-500/30 to-violet-600/30 blur-xl" />
        </div>
        <p className="text-sm text-white/40 animate-pulse">Loading Draft Room…</p>
      </div>
    );
  }

  if (notParticipant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
        <HeartOff className="h-12 w-12 text-white/20" />
        <h2 className="text-xl font-semibold">Draft Room Not Available</h2>
        <p className="text-sm text-white/40 max-w-sm">
          Your account isn&apos;t registered as a show participant. Contact the EXA team if this is an error.
        </p>
        <Link href="/brands" className="text-sm text-pink-400 hover:text-pink-300 transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // ─── Draft Room ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">

      {/* ── Header bar ── */}
      <div className="flex-none px-5 py-3 border-b border-white/[0.06] flex items-center gap-4 bg-zinc-950/80 backdrop-blur-sm">
        <Link href="/brands" className="text-white/40 hover:text-white/70 transition-colors shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Link>

        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
            <Trophy className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-white uppercase">Draft Room</h1>
            <p className="text-[10px] text-white/35">{eventName}</p>
          </div>
        </div>

        {/* Stats chips */}
        <div className="flex items-center gap-2 ml-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.07]">
            <Users className="h-3 w-3 text-white/40" />
            <span className="text-[11px] font-semibold text-white/60">{models.length} roster</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/25">
            <Zap className="h-3 w-3 text-pink-400" />
            <span className="text-[11px] font-bold text-pink-300">{picks.size} picked</span>
          </div>
        </div>

        <div className="flex-1" />

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all border ${
            showFilters
              ? "bg-white/10 border-white/20 text-white/80"
              : "bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white/70"
          }`}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          Filters
          <ChevronDown className={`h-3 w-3 transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── Filter bar ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-none overflow-hidden border-b border-white/[0.06] bg-white/[0.01]"
          >
            <div className="px-5 py-3 flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Height</span>
                <div className="flex gap-1">
                  {HEIGHT_FILTERS.map((f, i) => (
                    <button
                      key={f.label}
                      onClick={() => setHeightFilter(i)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                        heightFilter === i
                          ? "bg-violet-500/30 border border-violet-500/50 text-violet-300"
                          : "bg-white/[0.04] border border-white/[0.07] text-white/40 hover:text-white/60"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main split layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: Roster ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-white/[0.06]">

          {/* Search + picks toggle */}
          <div className="flex-none px-4 py-3 flex items-center gap-2 border-b border-white/[0.04]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/25" />
              <Input
                placeholder="Search roster…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm bg-white/[0.03] border-white/[0.08] focus:border-pink-500/40 text-white/80 placeholder:text-white/20"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-2 text-white/30 hover:text-white/60">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowPicksOnly((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border whitespace-nowrap ${
                showPicksOnly
                  ? "bg-pink-500/20 border-pink-500/40 text-pink-300"
                  : "bg-white/[0.03] border-white/[0.07] text-white/35 hover:text-white/60"
              }`}
            >
              My Picks {picks.size > 0 && `(${picks.size})`}
            </button>
          </div>

          {/* Roster grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
                <Users className="h-10 w-10 text-white/10" />
                <p className="text-sm text-white/30">
                  {showPicksOnly ? "No picks yet — start drafting." : "No models found."}
                </p>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                <AnimatePresence mode="popLayout">
                  {filtered.map((model) => (
                    <ModelDraftCard
                      key={model.id}
                      model={model}
                      isPicked={picks.has(model.id)}
                      onPick={() => togglePick(model.id)}
                      isLoading={toggling.has(model.id)}
                      variant="roster"
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer count */}
          <div className="flex-none px-4 py-2 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/20 text-center">
              {filtered.length} of {models.length} models shown
            </p>
          </div>
        </div>

        {/* ── Right: Lineup panel ── */}
        <div className="w-64 xl:w-72 flex-none flex flex-col overflow-hidden bg-zinc-950/50">

          {/* Panel header */}
          <div className="flex-none px-4 py-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30">My Lineup</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {picks.size} model{picks.size !== 1 ? "s" : ""} selected
                </p>
              </div>
              {picks.size > 0 && (
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center">
                  <span className="text-xs font-black text-white">{picks.size}</span>
                </div>
              )}
            </div>
          </div>

          {/* Picked list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pickedModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
                <div className="h-12 w-12 rounded-2xl border border-dashed border-white/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white/15" />
                </div>
                <p className="text-[11px] text-white/25 leading-relaxed">
                  Click <strong className="text-white/35">Draft</strong> on any card<br />to build your lineup
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {pickedModels.map((model, i) => (
                  <LineupCard
                    key={model.id}
                    model={model}
                    index={i}
                    onRemove={() => togglePick(model.id)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Footer */}
          {picks.size > 0 && (
            <div className="flex-none p-3 border-t border-white/[0.06]">
              <p className="text-[10px] text-white/25 text-center leading-relaxed">
                Your picks are saved automatically.<br />EXA team can see your selections.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
