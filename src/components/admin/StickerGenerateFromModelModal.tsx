"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Search,
  Loader2,
  Sparkles,
  Check,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type FrameStyle = "neon" | "gold" | "circle" | "polaroid" | "plain";

const FRAME_STYLES: { id: FrameStyle; label: string }[] = [
  { id: "neon", label: "Neon" },
  { id: "gold", label: "Gold" },
  { id: "circle", label: "Circle" },
  { id: "polaroid", label: "Polaroid" },
  { id: "plain", label: "Plain" },
];

interface ModelHit {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
}

interface Asset {
  id: string;
  url: string | null;
  photo_url: string | null;
  mime_type: string | null;
  type: string | null;
  asset_type: string | null;
  is_primary: boolean | null;
  display_order: number | null;
}

interface AssetState {
  status: "idle" | "generating" | "done" | "error";
  error?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function StickerGenerateFromModelModal({ open, onClose, onCreated }: Props) {
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<ModelHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelHit | null>(null);

  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("neon");
  const [assetState, setAssetState] = useState<Record<string, AssetState>>({});

  // Load default models when opened
  useEffect(() => {
    if (!open) return;
    setSelectedModel(null);
    setAssets([]);
    setAssetState({});
    void doSearch("");
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      void doSearch(search);
    }, 250);
    return () => clearTimeout(t);
  }, [search, open]);

  const doSearch = async (q: string) => {
    setSearching(true);
    try {
      const res = await fetch(
        `/api/admin/stickers/model-search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setModels(data.models || []);
    } finally {
      setSearching(false);
    }
  };

  const pickModel = async (m: ModelHit) => {
    setSelectedModel(m);
    setAssets([]);
    setAssetState({});
    setLoadingAssets(true);
    try {
      const res = await fetch(
        `/api/admin/stickers/model-portfolio?modelId=${m.id}`
      );
      const data = await res.json();
      setAssets(data.assets || []);
    } finally {
      setLoadingAssets(false);
    }
  };

  const generateFromAsset = async (a: Asset) => {
    setAssetState((s) => ({ ...s, [a.id]: { status: "generating" } }));
    try {
      const res = await fetch("/api/admin/stickers/from-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaAssetId: a.id,
          frameStyle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAssetState((s) => ({ ...s, [a.id]: { status: "done" } }));
      onCreated();
    } catch (e: any) {
      setAssetState((s) => ({
        ...s,
        [a.id]: { status: "error", error: e.message || "Failed" },
      }));
    }
  };

  const modelLabel = (m: ModelHit) =>
    m.username
      ? `@${m.username}`
      : `${m.first_name || ""} ${m.last_name || ""}`.trim() || "Model";

  const completedCount = useMemo(
    () => Object.values(assetState).filter((s) => s.status === "done").length,
    [assetState]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d0820] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-pink-400" />
            <h2 className="text-base font-semibold text-white">
              Generate stickers from a model
            </h2>
            {completedCount > 0 && (
              <span className="ml-2 text-xs text-emerald-400">
                +{completedCount} created
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selectedModel ? (
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search models by username or name…"
                  className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500/40"
                />
              </div>

              {searching ? (
                <div className="py-12 text-center text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </div>
              ) : models.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-sm">
                  No models found.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => pickModel(m)}
                      className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-pink-500/30 transition text-left"
                    >
                      <div className="w-10 h-10 rounded-full bg-black/40 overflow-hidden shrink-0">
                        {m.profile_photo_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.profile_photo_url}
                            alt={modelLabel(m)}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                          {modelLabel(m)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Model header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/10">
                <div className="w-12 h-12 rounded-full bg-black/40 overflow-hidden">
                  {selectedModel.profile_photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedModel.profile_photo_url}
                      alt={modelLabel(selectedModel)}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">
                    {modelLabel(selectedModel)}
                  </div>
                  <div className="text-xs text-white/50">
                    Pick a frame, then click any photo to make a sticker
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedModel(null);
                    setAssets([]);
                    setAssetState({});
                  }}
                  className="text-xs text-white/60 hover:text-white px-3 py-1.5 rounded-md bg-white/5"
                >
                  Change model
                </button>
              </div>

              {/* Frame style picker */}
              <div className="mb-4">
                <label className="text-xs text-white/60 mb-2 block">
                  Frame style
                </label>
                <div className="flex flex-wrap gap-2">
                  {FRAME_STYLES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrameStyle(f.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        frameStyle === f.id
                          ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                          : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Portfolio grid */}
              {loadingAssets ? (
                <div className="py-12 text-center text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin inline" />
                </div>
              ) : assets.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-sm">
                  This model has no usable photos.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                  {assets.map((a) => {
                    const state = assetState[a.id]?.status || "idle";
                    const error = assetState[a.id]?.error;
                    const src = a.url || a.photo_url || "";
                    return (
                      <button
                        key={a.id}
                        onClick={() =>
                          state === "idle" || state === "error"
                            ? generateFromAsset(a)
                            : undefined
                        }
                        disabled={state === "generating" || state === "done"}
                        className={cn(
                          "group relative aspect-square rounded-lg overflow-hidden bg-black/40 border transition",
                          state === "done"
                            ? "border-emerald-400/40"
                            : state === "error"
                              ? "border-red-500/40"
                              : "border-white/10 hover:border-pink-500/40"
                        )}
                        title={error || (state === "done" ? "Sticker created" : "Generate sticker")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {state === "idle" && (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Sparkles className="h-5 w-5 text-pink-300" />
                          </div>
                        )}
                        {state === "generating" && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                          </div>
                        )}
                        {state === "done" && (
                          <div className="absolute inset-0 bg-emerald-500/30 flex items-center justify-center">
                            <Check className="h-5 w-5 text-emerald-300" />
                          </div>
                        )}
                        {state === "error" && (
                          <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-red-100" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
          <span>Stickers generated here are saved to the EXA library and tagged with the model.</span>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
