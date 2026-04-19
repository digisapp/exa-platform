"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
  Sparkles,
  Download,
  Loader2,
  Trash2,
  Upload,
  Wand2,
  ImagePlus,
  Palette,
  Copy,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  ZoomIn,
  Paintbrush,
} from "lucide-react";
import {
  type GeneratedImage,
  type StudioSession,
  type XAIImageModel,
  type AspectRatio,
  type Resolution,
  type GenerationMode,
  EXA_PRESETS,
  ASPECT_RATIOS,
  STYLE_TRANSFER_STYLES,
} from "@/types/ai-studio";
import { toast } from "sonner";

const MAX_HISTORY = 200;

export default function AdminAIStudioPage() {
  // ───── State ─────
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState<XAIImageModel>("grok-imagine-image");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1k");
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<GenerationMode>("generate");
  const [generating, setGenerating] = useState(false);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [showStyleTransfer, setShowStyleTransfer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Session persistence (localStorage)
  const [session, setSession] = useState<StudioSession>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("exa-ai-studio-session");
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return { images: [] };
  });

  useEffect(() => {
    try {
      localStorage.setItem("exa-ai-studio-session", JSON.stringify(session));
    } catch {}
  }, [session]);

  // ───── Handlers ─────
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }

    setGenerating(true);
    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        model,
        n: count,
        aspect_ratio: aspectRatio,
        resolution,
        mode,
      };

      if (sourceImageUrl && (mode === "edit" || mode === "style-transfer")) {
        body.image_url = sourceImageUrl;
      }

      const res = await fetch("/api/admin/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Generation failed" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      const newImages: GeneratedImage[] = data.images.map(
        (img: { url: string; saved_url?: string }, i: number) => ({
          id: `${Date.now()}-${i}`,
          url: img.url,
          saved_url: img.saved_url,
          prompt: prompt.trim(),
          model,
          aspect_ratio: aspectRatio,
          resolution,
          mode,
          created_at: new Date().toISOString(),
          parent_id: selectedImageId || undefined,
        })
      );

      setSession((prev) => ({
        images: [...newImages, ...prev.images].slice(0, MAX_HISTORY),
      }));

      toast.success(`Generated ${newImages.length} image${newImages.length > 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [prompt, model, count, aspectRatio, resolution, mode, sourceImageUrl, selectedImageId]);

  const handleSaveToStorage = useCallback(async (image: GeneratedImage) => {
    try {
      const res = await fetch("/api/admin/ai-studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: image.prompt,
          model: image.model,
          n: 1,
          aspect_ratio: image.aspect_ratio,
          resolution: image.resolution,
          mode: image.mode,
          save_to_storage: true,
          ...(image.url ? { image_url: image.url } : {}),
        }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      const savedUrl = data.images?.[0]?.saved_url;

      if (savedUrl) {
        setSession((prev) => ({
          images: prev.images.map((img) =>
            img.id === image.id ? { ...img, saved_url: savedUrl } : img
          ),
        }));
        toast.success("Saved to Media Hub storage");
      }
    } catch {
      toast.error("Failed to save image");
    }
  }, []);

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("Downloaded");
    } catch {
      toast.error("Download failed");
    }
  }, []);

  const handleEditImage = useCallback(
    (image: GeneratedImage) => {
      setSourceImageUrl(image.saved_url || image.url);
      setSelectedImageId(image.id);
      setMode("edit");
      setPrompt("");
      toast.info("Source image set — enter an edit prompt");
    },
    []
  );

  const handleStyleTransfer = useCallback(
    (image: GeneratedImage, stylePrompt: string) => {
      setSourceImageUrl(image.saved_url || image.url);
      setSelectedImageId(image.id);
      setMode("style-transfer");
      setPrompt(stylePrompt);
    },
    []
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error("Image must be under 20MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setSourceImageUrl(dataUrl);
        setMode("edit");
        toast.success("Image uploaded — enter your edit prompt");
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRemoveImage = useCallback((id: string) => {
    setSession((prev) => ({
      images: prev.images.filter((img) => img.id !== id),
    }));
  }, []);

  const handleClearHistory = useCallback(() => {
    setSession({ images: [] });
    toast.success("History cleared");
  }, []);

  const applyPreset = useCallback((presetId: string, promptPrefix: string) => {
    setActivePreset(presetId);
    setPrompt((prev) => {
      // If prompt already starts with a preset prefix, replace it
      const existing = EXA_PRESETS.find((p) => prev.startsWith(p.prompt_prefix));
      if (existing) {
        return prev.replace(existing.prompt_prefix, promptPrefix);
      }
      return promptPrefix + " " + prev;
    });
    setMode("generate");
  }, []);

  const clearSource = useCallback(() => {
    setSourceImageUrl(null);
    setSelectedImageId(null);
    setMode("generate");
  }, []);

  // ───── Render ─────
  return (
    <div className="container px-4 md:px-8 lg:px-16 py-8 space-y-6">
      {/* ─── Hero ─── */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-7"
        style={{
          background:
            "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(236,72,153,0.10) 50%, rgba(34,211,238,0.15) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">
              Admin
            </p>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
              <span className="exa-gradient-text">AI Design Studio</span>
            </h1>
            <p className="text-sm text-white/50 mt-1">
              Generate, edit, and transform images with Grok AI
            </p>
          </div>
          <Wand2 className="w-10 h-10 text-violet-400/50" />
        </div>
      </div>

      {/* ─── Mode + Controls Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Mode selector */}
        <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          {(
            [
              { value: "generate" as const, label: "Generate", icon: Sparkles },
              { value: "edit" as const, label: "Edit", icon: Paintbrush },
              { value: "style-transfer" as const, label: "Style Transfer", icon: Palette },
            ] as const
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-all ${
                mode === value
                  ? "bg-pink-500/20 text-pink-400 font-semibold"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Model selector */}
        <div className="relative">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as XAIImageModel)}
            className="appearance-none bg-white/5 border border-white/10 rounded-xl px-3 py-2 pr-8 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            <option value="grok-imagine-image" className="bg-zinc-900">
              Fast ($0.02/img)
            </option>
            <option value="grok-imagine-image-pro" className="bg-zinc-900">
              Pro ($0.07/img)
            </option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
        </div>

        {/* Resolution */}
        <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          {(["1k", "2k"] as Resolution[]).map((r) => (
            <button
              key={r}
              onClick={() => setResolution(r)}
              className={`px-3 py-2 text-xs transition-all ${
                resolution === r
                  ? "bg-violet-500/20 text-violet-400 font-semibold"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Count */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
          <span className="text-[10px] uppercase tracking-wider text-white/40">Count</span>
          <input
            type="number"
            min={1}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))}
            className="w-10 bg-transparent text-center text-xs text-white border-none focus:outline-none"
          />
        </div>

        {/* Stats pill */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
          <span className="text-violet-400 font-semibold">{session.images.length}</span> in history
        </div>

        {session.images.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* ─── Main Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        {/* ─── Left Panel: Prompt & Settings ─── */}
        <div className="space-y-4">
          {/* Source Image (edit/style-transfer mode) */}
          {sourceImageUrl && (mode === "edit" || mode === "style-transfer") && (
            <div className="relative rounded-2xl border border-violet-500/30 bg-violet-500/5 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-violet-400 font-semibold uppercase tracking-wider">
                  Source Image
                </span>
                <button
                  onClick={clearSource}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/50" />
                </button>
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden bg-black/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourceImageUrl}
                  alt="Source"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Upload button for edit mode */}
          {(mode === "edit" || mode === "style-transfer") && !sourceImageUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 p-8 rounded-2xl border-2 border-dashed border-white/15 hover:border-violet-500/40 bg-white/[0.02] hover:bg-violet-500/5 transition-all cursor-pointer"
            >
              <Upload className="w-8 h-8 text-white/30" />
              <span className="text-sm text-white/50">
                Upload or drop an image to edit
              </span>
              <span className="text-[10px] text-white/30">
                JPG, PNG up to 20MB
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Prompt */}
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                mode === "generate"
                  ? "Describe the image you want to create..."
                  : mode === "edit"
                  ? "Describe the changes you want to make..."
                  : "Describe the style to apply..."
              }
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/30">
                {prompt.length}/4000 &middot; ⌘+Enter to generate
              </span>
              {prompt && (
                <button
                  onClick={() => setPrompt("")}
                  className="text-[10px] text-white/30 hover:text-white/50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating{count > 1 ? ` ${count} images` : ""}...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                {mode === "generate"
                  ? `Generate${count > 1 ? ` ${count} images` : ""}`
                  : mode === "edit"
                  ? "Apply Edit"
                  : "Transfer Style"}
              </>
            )}
          </button>

          {/* Aspect Ratio Grid */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              Aspect Ratio
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {ASPECT_RATIOS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setAspectRatio(value)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-all ${
                    aspectRatio === value
                      ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                      : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10"
                  }`}
                >
                  <span className="text-sm">{icon}</span>
                  <span className="text-[9px]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* EXA Presets */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 font-semibold hover:text-white/60 transition-colors"
            >
              {showPresets ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              EXA Style Presets
            </button>
            {showPresets && (
              <div className="grid grid-cols-2 gap-2">
                {EXA_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyPreset(preset.id, preset.prompt_prefix)}
                    className={`text-left p-2.5 rounded-xl border transition-all ${
                      activePreset === preset.id
                        ? "bg-violet-500/15 border-violet-500/40 ring-1 ring-violet-500/20"
                        : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20"
                    }`}
                  >
                    <p
                      className={`text-xs font-semibold ${
                        activePreset === preset.id ? "text-violet-300" : "text-white/80"
                      }`}
                    >
                      {preset.name}
                    </p>
                    <p className="text-[10px] text-white/40 mt-0.5">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Style Transfer Quick Styles */}
          {mode === "style-transfer" && (
            <div className="space-y-2">
              <button
                onClick={() => setShowStyleTransfer(!showStyleTransfer)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-white/40 font-semibold hover:text-white/60 transition-colors"
              >
                {showStyleTransfer ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                Quick Styles
              </button>
              {showStyleTransfer && (
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_TRANSFER_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setPrompt(style.prompt)}
                      className={`text-left p-2.5 rounded-xl border transition-all ${
                        prompt === style.prompt
                          ? "bg-pink-500/15 border-pink-500/40"
                          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="text-xs font-semibold text-white/80">
                        {style.name}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ─── Right Panel: Gallery ─── */}
        <div className="space-y-4">
          {session.images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                <ImagePlus className="w-12 h-12 text-white/20" />
              </div>
              <p className="text-sm text-white/40">No images generated yet</p>
              <p className="text-xs text-white/25 mt-1">
                Enter a prompt and hit Generate to get started
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {session.images.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onDownload={handleDownload}
                  onEdit={handleEditImage}
                  onSave={handleSaveToStorage}
                  onRemove={handleRemoveImage}
                  onStyleTransfer={(stylePrompt) =>
                    handleStyleTransfer(image, stylePrompt)
                  }
                  onLightbox={() => setLightboxUrl(image.saved_url || image.url)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Lightbox ─── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-w-full max-h-[90vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Image Card Component ─────

function ImageCard({
  image,
  onDownload,
  onEdit,
  onSave,
  onRemove,
  onStyleTransfer,
  onLightbox,
}: {
  image: GeneratedImage;
  onDownload: (url: string, filename: string) => void;
  onEdit: (image: GeneratedImage) => void;
  onSave: (image: GeneratedImage) => void;
  onRemove: (id: string) => void;
  onStyleTransfer: (stylePrompt: string) => void;
  onLightbox: () => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const [saving, setSaving] = useState(false);
  const displayUrl = image.saved_url || image.url;

  const handleSave = async () => {
    setSaving(true);
    await onSave(image);
    setSaving(false);
  };

  return (
    <div
      className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] hover:border-white/20 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-black/20 cursor-pointer" onClick={onLightbox}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayUrl}
          alt={image.prompt}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${
            showActions ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Top badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-black/50 text-[9px] text-white/70 backdrop-blur-sm">
              {image.aspect_ratio}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-black/50 text-[9px] text-white/70 backdrop-blur-sm">
              {image.resolution}
            </span>
            {image.model === "grok-imagine-image-pro" && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/50 text-[9px] text-white font-semibold backdrop-blur-sm">
                PRO
              </span>
            )}
          </div>

          {/* Zoom icon */}
          <div className="absolute top-2 right-2">
            <ZoomIn className="w-4 h-4 text-white/50" />
          </div>

          {/* Bottom actions */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5">
            <p className="text-[10px] text-white/70 line-clamp-2 mb-2">
              {image.prompt}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(displayUrl, `exa-ai-${image.id}.png`);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(image);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Edit this image"
              >
                <Paintbrush className="w-3.5 h-3.5" />
              </button>
              {!image.saved_url && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSave();
                  }}
                  disabled={saving}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-emerald-500/30 text-white transition-colors"
                  title="Save to storage"
                >
                  {saving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              {image.saved_url && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[9px] text-emerald-400">
                  Saved
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(displayUrl);
                  toast.success("URL copied");
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(image.id);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 text-white transition-colors ml-auto"
                title="Remove from history"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mode indicator */}
      {image.mode !== "generate" && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-0">
          <span className="px-2 py-0.5 rounded-full bg-pink-500/30 text-[9px] text-pink-300 backdrop-blur-sm">
            {image.mode === "edit" ? "Edited" : "Style Transfer"}
          </span>
        </div>
      )}
    </div>
  );
}
