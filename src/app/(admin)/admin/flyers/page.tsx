"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import {
  Image as ImageIcon,
  Download,
  RefreshCw,
  Loader2,
  Check,
  Trash2,
  ChevronDown,
  Sparkles,
  Archive,
  Palette,
  X,
  Eye,
} from "lucide-react";
import { FlyerDesigner } from "@/components/admin/flyer-designer";
import {
  type FlyerDesignSettings,
  type FlyerOverlay,
  type FlyerTextElement,
  DEFAULT_DESIGN,
  designToParams,
} from "@/types/flyer-design";

interface Event {
  id: string;
  name: string;
  slug: string;
  short_name: string;
  start_date: string | null;
  end_date: string | null;
  location_city: string | null;
  location_state: string | null;
  status: string;
}

interface Flyer {
  id: string;
  model_id: string;
  event_id: string;
  storage_path: string;
  public_url: string;
  width: number;
  height: number;
  created_at: string;
}

interface ModelInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string;
  profile_photo_url: string | null;
  instagram_username?: string | null;
}

export default function AdminFlyersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [models, setModels] = useState<Map<string, ModelInfo>>(new Map());
  const [approvedCount, setApprovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    total: number;
    generated: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [selectedFlyers, setSelectedFlyers] = useState<Set<string>>(new Set());
  const [designSettings, setDesignSettings] = useState<FlyerDesignSettings>(
    () => {
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("exa-flyer-design");
          if (saved) {
            const parsed = JSON.parse(saved);
            // Merge with defaults to handle added/removed fields
            return { ...DEFAULT_DESIGN, ...parsed };
          }
        } catch {}
      }
      return DEFAULT_DESIGN;
    }
  );
  const [showDesigner, setShowDesigner] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sampleModel, setSampleModel] = useState<ModelInfo | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [resolution, setResolution] = useState<1 | 2 | 3>(1);
  // Snap guide lines shown during drag (in template coordinates)
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});

  // Auto-save design settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("exa-flyer-design", JSON.stringify(designSettings));
    } catch {}
  }, [designSettings]);

  // Load events
  useEffect(() => {
    async function loadEvents() {
      const supabase = createClient();
      const { data } = await (supabase.from("events") as any)
        .select(
          "id, name, slug, short_name, start_date, end_date, location_city, location_state, status"
        )
        .in("status", ["upcoming", "active", "completed"])
        .order("start_date", { ascending: false });

      if (data && data.length > 0) {
        setEvents(data);
        setSelectedEventId(data[0].id);
      }
      setLoading(false);
    }
    loadEvents();
  }, []);

  // Load flyers + approved model count
  const loadFlyers = useCallback(async () => {
    if (!selectedEventId) return;
    setLoading(true);
    const supabase = createClient();

    const res = await fetch(`/api/admin/flyers?event_id=${selectedEventId}`);
    const data = await res.json();
    const flyerList: Flyer[] = data.flyers || [];
    setFlyers(flyerList);

    const modelIds = [...new Set(flyerList.map((f) => f.model_id))];
    if (modelIds.length > 0) {
      const { data: modelData } = await (supabase.from("models") as any)
        .select("id, first_name, last_name, username, profile_photo_url")
        .in("id", modelIds);
      const map = new Map<string, ModelInfo>();
      (modelData || []).forEach((m: ModelInfo) => map.set(m.id, m));
      setModels(map);
    } else {
      setModels(new Map());
    }

    // Badge count + sample model for preview
    const { data: badge } = await (supabase.from("badges") as any)
      .select("id")
      .eq("event_id", selectedEventId)
      .eq("badge_type", "event")
      .eq("is_active", true)
      .single();

    if (badge) {
      const { count } = await (supabase.from("model_badges") as any)
        .select("*", { count: "exact", head: true })
        .eq("badge_id", badge.id);
      setApprovedCount(count || 0);

      // Get a sample model for preview
      const { data: sampleBadge } = await (supabase.from("model_badges") as any)
        .select("model_id")
        .eq("badge_id", badge.id)
        .limit(1);
      if (sampleBadge && sampleBadge.length > 0) {
        const { data: sm } = await (supabase.from("models") as any)
          .select("id, first_name, last_name, username, profile_photo_url, instagram_username")
          .eq("id", sampleBadge[0].model_id)
          .single();
        setSampleModel(sm || null);
      }
    } else {
      setApprovedCount(0);
    }

    setSelectedFlyers(new Set());
    setLoading(false);
  }, [selectedEventId]);

  useEffect(() => {
    loadFlyers();
  }, [loadFlyers]);

  // Debounced preview URL
  const [debouncedSettings, setDebouncedSettings] =
    useState<FlyerDesignSettings>(designSettings);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSettings(designSettings), 400);
    return () => clearTimeout(timer);
  }, [designSettings]);

  // Set loading when preview URL is about to change
  useEffect(() => {
    setPreviewLoading(true);
  }, [debouncedSettings, sampleModel]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams(designToParams(debouncedSettings));
    // Text + overlays are rendered as draggable elements on the preview, not baked in
    params.delete("overlays");
    params.delete("texts");
    if (sampleModel) {
      const name = [sampleModel.first_name, sampleModel.last_name]
        .filter(Boolean)
        .join(" ") || sampleModel.username;
      if (name) params.set("name", name);
    }
    if (sampleModel?.profile_photo_url)
      params.set("photo", sampleModel.profile_photo_url);
    if (sampleModel?.instagram_username)
      params.set("ig", sampleModel.instagram_username);
    params.set("_t", String(Date.now()));
    return `/api/admin/flyers/template?${params.toString()}`;
  }, [debouncedSettings, sampleModel]);

  // Generate flyers
  async function handleGenerate(force = false, testOne = false) {
    if (!selectedEventId) return;
    setGenerating(true);
    setProgress(null);

    try {
      const payload: any = {
        event_id: selectedEventId,
        design: designSettings,
        force,
        scale: resolution,
      };

      // For test mode, only generate for the sample model
      if (testOne && sampleModel) {
        payload.model_ids = [sampleModel.id];
        payload.force = true; // always regenerate the test model
      }

      const res = await fetch("/api/admin/flyers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to generate flyers");
        return;
      }

      setProgress({
        total: data.total,
        generated: data.generated,
        skipped: data.skipped,
        failed: data.failed,
      });

      await loadFlyers();
    } catch {
      alert("Failed to generate flyers. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleRegenerate(flyerId: string, modelId: string) {
    try {
      const delRes = await fetch(`/api/admin/flyers?id=${flyerId}`, { method: "DELETE" });
      if (!delRes.ok) throw new Error("Delete failed");

      const genRes = await fetch("/api/admin/flyers/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: selectedEventId,
          model_ids: [modelId],
          design: designSettings,
          scale: resolution,
        }),
      });
      if (!genRes.ok) throw new Error("Regenerate failed");

      await loadFlyers();
    } catch {
      alert("Failed to regenerate flyer. Please try again.");
    }
  }

  async function handleDeleteSelected() {
    if (selectedFlyers.size === 0) return;
    if (!confirm(`Delete ${selectedFlyers.size} flyer(s)?`)) return;
    for (const flyerId of selectedFlyers) {
      await fetch(`/api/admin/flyers?id=${flyerId}`, { method: "DELETE" });
    }
    setSelectedFlyers(new Set());
    await loadFlyers();
  }

  async function handleDownload(flyer: Flyer) {
    const model = models.get(flyer.model_id);
    const rawName = model
      ? [model.first_name, model.last_name].filter(Boolean).join("-") ||
        model.username
      : flyer.model_id;
    const name = rawName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const event = events.find((e) => e.id === flyer.event_id);
    const filename = `${event?.slug || "event"}-${name}-flyer.png`;

    const res = await fetch(flyer.public_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleDownloadAll() {
    for (const flyer of flyers) {
      await handleDownload(flyer);
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  function toggleSelect(flyerId: string) {
    const next = new Set(selectedFlyers);
    if (next.has(flyerId)) next.delete(flyerId);
    else next.add(flyerId);
    setSelectedFlyers(next);
  }

  function toggleSelectAll() {
    if (selectedFlyers.size === flyers.length) setSelectedFlyers(new Set());
    else setSelectedFlyers(new Set(flyers.map((f) => f.id)));
  }

  // Snap system: canvas center, thirds, and element alignment
  const SNAP_THRESHOLD = 20;
  // Snap lines in template coordinates (1080x1350)
  const SNAP_LINES_X = [0, 270, 540, 810, 1080]; // left, ⅓, center, ⅔, right
  const SNAP_LINES_Y = [0, 337, 675, 1012, 1350]; // top, ⅓, center, ⅔, bottom

  function startDrag(
    item: { id: string; x: number; y: number },
    type: "overlay" | "text",
    startClientX: number,
    startClientY: number,
    mode: "mouse" | "touch"
  ) {
    const container = previewContainerRef.current;
    if (!container) return;
    const scl = container.offsetWidth / 1080;
    const origX = item.x;
    const origY = item.y;

    function updatePosition(clientX: number, clientY: number) {
      const dx = (clientX - startClientX) / scl;
      const dy = (clientY - startClientY) / scl;
      let newX = Math.max(0, Math.min(1080, Math.round(origX + dx)));
      let newY = Math.max(0, Math.min(1350, Math.round(origY + dy)));

      const guides: { x?: number; y?: number } = {};

      // Snap to canvas guide lines (center, thirds, edges)
      for (const snapX of SNAP_LINES_X) {
        if (Math.abs(newX - snapX) < SNAP_THRESHOLD) { newX = snapX; guides.x = snapX; break; }
      }
      for (const snapY of SNAP_LINES_Y) {
        if (Math.abs(newY - snapY) < SNAP_THRESHOLD) { newY = snapY; guides.y = snapY; break; }
      }

      // Snap to other elements' X or Y positions
      setDesignSettings((prev) => {
        const allItems = [
          ...prev.textElements.map((t) => ({ id: t.id, x: t.x, y: t.y })),
          ...prev.overlays.map((o) => ({ id: o.id, x: o.x, y: o.y })),
        ].filter((el) => el.id !== item.id);

        for (const other of allItems) {
          if (!guides.x && Math.abs(newX - other.x) < SNAP_THRESHOLD) { newX = other.x; guides.x = other.x; }
          if (!guides.y && Math.abs(newY - other.y) < SNAP_THRESHOLD) { newY = other.y; guides.y = other.y; }
        }

        return {
          ...prev,
          ...(type === "overlay"
            ? { overlays: prev.overlays.map((o) => o.id === item.id ? { ...o, x: newX, y: newY } : o) }
            : { textElements: prev.textElements.map((t) => t.id === item.id ? { ...t, x: newX, y: newY } : t) }
          ),
        };
      });

      setSnapGuides(guides);
    }

    function onEnd() {
      setSnapGuides({});
      if (mode === "mouse") {
        document.removeEventListener("mousemove", onMoveHandler);
        document.removeEventListener("mouseup", onEnd);
      } else {
        document.removeEventListener("touchmove", onMoveHandler);
        document.removeEventListener("touchend", onEnd);
      }
    }

    let onMoveHandler: any;
    if (mode === "mouse") {
      onMoveHandler = (ev: MouseEvent) => updatePosition(ev.clientX, ev.clientY);
      document.addEventListener("mousemove", onMoveHandler);
      document.addEventListener("mouseup", onEnd);
    } else {
      onMoveHandler = (ev: TouchEvent) => { ev.preventDefault(); updatePosition(ev.touches[0].clientX, ev.touches[0].clientY); };
      document.addEventListener("touchmove", onMoveHandler, { passive: false });
      document.addEventListener("touchend", onEnd);
    }
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);

  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(0,191,255,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
              Admin
            </p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="exa-gradient-text">Model Flyers</span>
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Design and generate promotional flyers for approved event models
            </p>
          </div>
          <ImageIcon className="w-10 h-10 text-pink-400/50" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Event selector */}
        <div className="relative">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-pink-500/50"
          >
            {events.map((evt) => (
              <option key={evt.id} value={evt.id} className="bg-zinc-900">
                {evt.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
          <span className="text-pink-400 font-semibold">{approvedCount}</span>{" "}
          approved &middot;{" "}
          <span className="text-emerald-400 font-semibold">
            {flyers.length}
          </span>{" "}
          flyers
        </div>

        {/* Design toggle */}
        <button
          onClick={() => setShowDesigner(!showDesigner)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
            showDesigner
              ? "bg-pink-500/10 border-pink-500/30 text-pink-400"
              : "bg-white/5 border-white/10 text-white hover:bg-white/10"
          }`}
        >
          <Palette className="w-4 h-4" />
          {showDesigner ? "Hide Designer" : "Design"}
        </button>

        {/* Resolution selector */}
        <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          {([
            { value: 1 as const, label: "Social", sub: "1080px" },
            { value: 2 as const, label: "High", sub: "2160px" },
            { value: 3 as const, label: "Print", sub: "3240px" },
          ]).map(({ value, label, sub }) => (
            <button
              key={value}
              onClick={() => setResolution(value)}
              className={`px-3 py-2 text-xs transition-all ${
                resolution === value
                  ? "bg-pink-500/20 text-pink-400 font-semibold"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {label}
              <span className="block text-[9px] text-white/30">{sub}</span>
            </button>
          ))}
        </div>

        {/* Test 1 Model button */}
        <button
          onClick={() => handleGenerate(false, true)}
          disabled={generating || !selectedEventId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-pink-500/30 text-pink-400 text-sm font-semibold hover:bg-pink-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Test 1 Model
            </>
          )}
        </button>

        {/* Generate all button */}
        <button
          onClick={() => handleGenerate()}
          disabled={generating || !selectedEventId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-sm font-semibold hover:from-pink-600 hover:to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate All Flyers
            </>
          )}
        </button>

        {flyers.length > 0 && (
          <>
            <button
              onClick={() => {
                if (
                  !confirm(
                    `Regenerate all ${flyers.length} flyers with current design? This replaces all existing flyers.`
                  )
                )
                  return;
                handleGenerate(true);
              }}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate All
            </button>
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm hover:bg-white/10 transition-colors"
            >
              <Archive className="w-4 h-4" />
              Download All ({flyers.length})
            </button>
          </>
        )}

        {selectedFlyers.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete ({selectedFlyers.size})
          </button>
        )}
      </div>

      {/* Progress banner */}
      {progress && (
        <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
          <Check className="w-5 h-5 text-emerald-400" />
          <div className="text-sm text-white/80">
            <span className="text-emerald-400 font-semibold">
              {progress.generated}
            </span>{" "}
            generated
            {progress.skipped > 0 && (
              <>
                {" "}&middot;{" "}
                <span className="text-amber-400 font-semibold">
                  {progress.skipped}
                </span>{" "}
                skipped
              </>
            )}
            {progress.failed > 0 && (
              <>
                {" "}&middot;{" "}
                <span className="text-red-400 font-semibold">
                  {progress.failed}
                </span>{" "}
                failed
              </>
            )}
            {" "}&middot; {progress.total} total
          </div>
        </div>
      )}

      {/* ── Designer Panel + Preview ── */}
      {showDesigner && (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Designer sidebar */}
          <div className="w-full lg:w-[420px] shrink-0">
            <div className="sticky top-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5 max-h-[calc(100vh-120px)] overflow-y-auto space-y-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-pink-400" />
                  Flyer Designer
                </h2>
                <button
                  onClick={() => setShowDesigner(false)}
                  className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white/60 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <FlyerDesigner
                settings={designSettings}
                onChange={setDesignSettings}
              />
            </div>
          </div>

          {/* Live preview with draggable overlays */}
          <div className="flex-1 flex items-start justify-center">
            <div className="sticky top-4">
              <p className="text-xs text-white/40 mb-2 text-center">
                Live Preview
                {(designSettings.overlays.length > 0 || designSettings.textElements.length > 0) &&
                  " — drag elements to position"}
              </p>
              <div
                className="relative w-[480px] xl:w-[540px] aspect-[4/5] overflow-hidden border border-white/10 bg-white/5"
                ref={previewContainerRef}
              >
                {previewLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
                    <Loader2 className="w-6 h-6 animate-spin text-white/50" />
                  </div>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Flyer preview"
                  className="w-full h-full object-cover"
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                />

                {/* Draggable text elements */}
                {designSettings.textElements.map((el) => {
                  const cw = previewContainerRef.current?.offsetWidth || 480;
                  const s = cw / 1080;
                  return (
                    <div
                      key={el.id}
                      style={{
                        position: "absolute",
                        left: `${el.x * s}px`,
                        top: `${el.y * s}px`,
                        fontSize: `${el.fontSize * s}px`,
                        fontWeight: el.fontWeight,
                        color: el.color,
                        fontStyle: el.italic ? "italic" : "normal",
                        textTransform: el.uppercase ? "uppercase" : "none",
                        cursor: "grab",
                        zIndex: 21,
                        whiteSpace: "nowrap",
                        textShadow: "1px 2px 6px rgba(0,0,0,0.5)",
                        userSelect: "none",
                      }}
                      onMouseDown={(e) => { e.preventDefault(); startDrag(el, "text", e.clientX, e.clientY, "mouse"); }}
                      onTouchStart={(e) => { e.preventDefault(); startDrag(el, "text", e.touches[0].clientX, e.touches[0].clientY, "touch"); }}
                    >
                      {el.text || "..."}
                    </div>
                  );
                })}

                {/* Draggable image overlays */}
                {designSettings.overlays.map((overlay) => {
                  const cw = previewContainerRef.current?.offsetWidth || 480;
                  const s = cw / 1080;
                  return (
                    <div
                      key={overlay.id}
                      style={{
                        position: "absolute",
                        left: `${overlay.x * s}px`,
                        top: `${overlay.y * s}px`,
                        width: `${overlay.width * s}px`,
                        height: `${overlay.height * s}px`,
                        opacity: overlay.opacity,
                        cursor: "grab",
                        zIndex: 20,
                      }}
                      onMouseDown={(e) => { e.preventDefault(); startDrag(overlay, "overlay", e.clientX, e.clientY, "mouse"); }}
                      onTouchStart={(e) => { e.preventDefault(); startDrag(overlay, "overlay", e.touches[0].clientX, e.touches[0].clientY, "touch"); }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={overlay.url} alt="overlay" draggable={false}
                        className="w-full h-full object-contain pointer-events-none select-none" />
                    </div>
                  );
                })}

                {/* Permanent faint guide lines (center + thirds) */}
                {(() => {
                  const cw = previewContainerRef.current?.offsetWidth || 480;
                  const sc = cw / 1080;
                  return (
                    <>
                      {/* Vertical guides: center + thirds */}
                      {[270, 540, 810].map((gx) => (
                        <div key={`gx-${gx}`} style={{
                          position: "absolute", left: `${gx * sc}px`, top: 0,
                          width: gx === 540 ? "1px" : "1px", height: "100%",
                          background: gx === 540 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                          zIndex: 15, pointerEvents: "none",
                        }} />
                      ))}
                      {/* Horizontal guides: center + thirds */}
                      {[337, 675, 1012].map((gy) => (
                        <div key={`gy-${gy}`} style={{
                          position: "absolute", top: `${gy * sc}px`, left: 0,
                          height: "1px", width: "100%",
                          background: gy === 675 ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
                          zIndex: 15, pointerEvents: "none",
                        }} />
                      ))}
                    </>
                  );
                })()}

                {/* Active snap guide lines (bright pink when snapped) */}
                {snapGuides.x !== undefined && (() => {
                  const cw = previewContainerRef.current?.offsetWidth || 480;
                  const sc = cw / 1080;
                  return (
                    <div style={{
                      position: "absolute", left: `${snapGuides.x * sc}px`, top: 0,
                      width: "2px", height: "100%",
                      background: "rgba(255,105,180,0.9)",
                      zIndex: 31, pointerEvents: "none",
                      boxShadow: "0 0 8px rgba(255,105,180,0.6)",
                    }} />
                  );
                })()}
                {snapGuides.y !== undefined && (() => {
                  const cw = previewContainerRef.current?.offsetWidth || 480;
                  const sc = cw / 1080;
                  return (
                    <div style={{
                      position: "absolute", top: `${snapGuides.y * sc}px`, left: 0,
                      height: "2px", width: "100%",
                      background: "rgba(255,105,180,0.9)",
                      zIndex: 31, pointerEvents: "none",
                      boxShadow: "0 0 8px rgba(255,105,180,0.6)",
                    }} />
                  );
                })()}
              </div>
              <p className="text-[10px] text-white/30 mt-2 text-center">
                1080 × 1350px &middot; Drag text + images to position
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Flyers Gallery ── */}
      {flyers.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSelectAll}
            className="text-xs text-white/40 hover:text-white/60 transition-colors"
          >
            {selectedFlyers.size === flyers.length
              ? "Deselect all"
              : "Select all"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-white/30" />
        </div>
      ) : flyers.length === 0 ? (
        <div className="text-center py-20">
          <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">
            No flyers generated yet for{" "}
            <span className="text-white/60">{selectedEvent?.name}</span>
          </p>
          <p className="text-white/30 text-xs mt-1">
            Click &ldquo;Generate Flyers&rdquo; to create flyers for all{" "}
            {approvedCount} approved models
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {flyers.map((flyer) => {
            const model = models.get(flyer.model_id);
            const name = model
              ? [model.first_name, model.last_name]
                  .filter(Boolean)
                  .join(" ") || model.username
              : "Unknown";
            const isSelected = selectedFlyers.has(flyer.id);

            return (
              <div
                key={flyer.id}
                className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer ${
                  isSelected
                    ? "border-pink-500 ring-2 ring-pink-500/30"
                    : "border-white/10 hover:border-white/20"
                }`}
                onClick={() => toggleSelect(flyer.id)}
              >
                <div className="aspect-[4/5] relative bg-white/5">
                  <Image
                    src={flyer.public_url}
                    alt={`Flyer for ${name}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  />

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(flyer);
                      }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerate(flyer.id, flyer.model_id);
                      }}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      title="Regenerate"
                    >
                      <RefreshCw className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!confirm("Delete this flyer?")) return;
                        await fetch(`/api/admin/flyers?id=${flyer.id}`, {
                          method: "DELETE",
                        });
                        await loadFlyers();
                      }}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>

                  <div
                    className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-pink-500 border-pink-500"
                        : "border-white/30 bg-black/30 opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>

                <div className="p-2 bg-white/5">
                  <p className="text-xs text-white/70 truncate font-medium">
                    {name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
