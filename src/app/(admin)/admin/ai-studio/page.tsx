"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Film,
  Image as ImageIcon,
  Play,
  Clock,
} from "lucide-react";
import {
  type GeneratedImage,
  type StudioSession,
  type XAIImageModel,
  type AspectRatio,
  type Resolution,
  type GenerationMode,
  type OutputType,
  type VideoAspectRatio,
  type VideoResolution,
  EXA_PRESETS,
  ASPECT_RATIOS,
  VIDEO_ASPECT_RATIOS,
  STYLE_TRANSFER_STYLES,
} from "@/types/ai-studio";
import { toast } from "sonner";

const MAX_HISTORY = 200;

export default function AdminAIStudioPage() {
  // ───── State ─────
  const [prompt, setPrompt] = useState("");
  const [outputType, setOutputType] = useState<OutputType>("image");
  const [model, setModel] = useState<XAIImageModel>("grok-imagine-image");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<Resolution>("1k");
  const [videoAspectRatio, setVideoAspectRatio] = useState<VideoAspectRatio>("16:9");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("720p");
  const [videoDuration, setVideoDuration] = useState(5);
  const [count, setCount] = useState(1);
  const [mode, setMode] = useState<GenerationMode>("generate");
  const [generating, setGenerating] = useState(false);
  const [videoPolling, setVideoPolling] = useState(false);
  const [videoProgress, setVideoProgress] = useState("");
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<GeneratedImage | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [showStyleTransfer, setShowStyleTransfer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<boolean>(false);

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

  // Auto-save any images that don't have a permanent URL yet
  useEffect(() => {
    const unsaved = session.images.filter(
      (img) => !img.saved_url && img.url.includes(".x.ai")
    );
    if (unsaved.length === 0) return;

    let cancelled = false;
    (async () => {
      for (const img of unsaved) {
        if (cancelled) break;
        try {
          const res = await fetch("/api/admin/ai-studio/video", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ save_url: img.url }),
          });
          if (!res.ok) continue;
          const { saved_url } = await res.json();
          if (saved_url && !cancelled) {
            setSession((prev) => ({
              images: prev.images.map((i) =>
                i.id === img.id ? { ...i, saved_url } : i
              ),
            }));
          }
        } catch {
          // Non-fatal — image may already be expired
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───── Handlers ─────
  const handleGenerateVideo = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }

    setGenerating(true);
    setVideoPolling(true);
    setVideoProgress("Submitting video generation...");
    pollRef.current = true;

    try {
      // Step 1: Submit
      const submitBody: Record<string, unknown> = {
        prompt: prompt.trim(),
        duration: videoDuration,
        aspect_ratio: videoAspectRatio,
        resolution: videoResolution,
      };

      if (sourceImageUrl && mode === "edit") {
        submitBody.image_url = sourceImageUrl;
      }

      const submitRes = await fetch("/api/admin/ai-studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitBody),
      });

      if (!submitRes.ok) {
        const err = await submitRes.json().catch(() => ({ error: "Submission failed" }));
        throw new Error(err.error || `HTTP ${submitRes.status}`);
      }

      const { request_id } = await submitRes.json();
      setVideoProgress("Generating video... this may take a few minutes");

      // Step 2: Poll
      const maxWait = 10 * 60 * 1000;
      const pollInterval = 5000;
      const startTime = Date.now();

      while (pollRef.current && Date.now() - startTime < maxWait) {
        await new Promise((r) => setTimeout(r, pollInterval));

        const elapsed = Math.round((Date.now() - startTime) / 1000);
        setVideoProgress(`Generating video... ${elapsed}s elapsed`);

        const pollRes = await fetch("/api/admin/ai-studio/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request_id }),
        });

        if (!pollRes.ok) continue;
        const status = await pollRes.json();

        if (status.status === "done" && status.video?.url) {
          const newVideo: GeneratedImage = {
            id: `${Date.now()}-video`,
            url: status.video.url,
            saved_url: status.saved_url,
            prompt: prompt.trim(),
            model: "grok-imagine-video",
            aspect_ratio: videoAspectRatio,
            resolution: videoResolution,
            mode: sourceImageUrl ? "edit" : "generate",
            output_type: "video",
            created_at: new Date().toISOString(),
            duration: status.video.duration,
          };

          setSession((prev) => ({
            images: [newVideo, ...prev.images].slice(0, MAX_HISTORY),
          }));

          toast.success(`Video generated (${status.video.duration}s)`);
          break;
        }

        if (status.status === "failed") throw new Error("Video generation failed");
        if (status.status === "expired") throw new Error("Video request expired");
      }
    } catch (err: any) {
      toast.error(err.message || "Video generation failed");
    } finally {
      setGenerating(false);
      setVideoPolling(false);
      setVideoProgress("");
      pollRef.current = false;
    }
  }, [prompt, videoDuration, videoAspectRatio, videoResolution, sourceImageUrl, mode]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("Enter a prompt first");
      return;
    }

    if (outputType === "video") {
      return handleGenerateVideo();
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
        save_to_storage: true,
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
          output_type: "image" as const,
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
  }, [prompt, model, count, aspectRatio, resolution, mode, sourceImageUrl, selectedImageId, outputType, handleGenerateVideo]);

  const handleSaveToStorage = useCallback(async (image: GeneratedImage) => {
    try {
      // Use the video route's save_url endpoint for both images and videos
      // This directly downloads the URL and stores it — no re-generation needed
      const res = await fetch("/api/admin/ai-studio/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ save_url: image.url }),
      });

      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();

      if (data.saved_url) {
        setSession((prev) => ({
          images: prev.images.map((img) =>
            img.id === image.id ? { ...img, saved_url: data.saved_url } : img
          ),
        }));
        toast.success("Saved to storage");
      }
    } catch {
      toast.error("Failed to save");
    }
  }, []);

  const handleDownload = useCallback(async (url: string, filename: string) => {
    try {
      // Proxy all external URLs through our API to avoid CORS blocks
      const isExternal = url.startsWith("http");
      const fetchUrl = isExternal
        ? `/api/admin/ai-studio/proxy?url=${encodeURIComponent(url)}`
        : url;
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        toast.error("Download failed — image may have expired. Try saving to storage first.");
        return;
      }
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.startsWith("image/") && !contentType.startsWith("video/") && !contentType.startsWith("application/octet-stream")) {
        toast.error("Download failed — unexpected response type");
        return;
      }
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
              Generate images and videos with Grok AI
            </p>
          </div>
          <Wand2 className="w-10 h-10 text-violet-400/50" />
        </div>
      </div>

      {/* ─── Mode + Controls Bar ─── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Image / Video toggle */}
        <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
          {(
            [
              { value: "image" as OutputType, label: "Image", icon: ImageIcon },
              { value: "video" as OutputType, label: "Video", icon: Film },
            ]
          ).map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => {
                setOutputType(value);
                if (value === "video") setMode("generate");
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-all ${
                outputType === value
                  ? "bg-cyan-500/20 text-cyan-400 font-semibold"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Mode selector (image only — video only supports generate/edit) */}
        {outputType === "image" && (
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
        )}

        {/* Image-specific controls */}
        {outputType === "image" && (
          <>
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
          </>
        )}

        {/* Video-specific controls */}
        {outputType === "video" && (
          <>
            {/* Video resolution */}
            <div className="flex items-center rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {(["480p", "720p"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setVideoResolution(r)}
                  className={`px-3 py-2 text-xs transition-all ${
                    videoResolution === r
                      ? "bg-violet-500/20 text-violet-400 font-semibold"
                      : "text-white/50 hover:text-white/70"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Duration */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
              <Clock className="w-3 h-3 text-white/40" />
              <input
                type="range"
                min={1}
                max={15}
                value={videoDuration}
                onChange={(e) => setVideoDuration(parseInt(e.target.value))}
                className="w-20 accent-cyan-500"
              />
              <span className="text-xs text-white/60 w-8">{videoDuration}s</span>
            </div>

            {/* Price estimate */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/50">
              ~${(videoDuration * 0.05).toFixed(2)}
            </div>
          </>
        )}

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
                outputType === "video"
                  ? "Describe the video you want to create..."
                  : mode === "generate"
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
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              outputType === "video"
                ? "bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-600 hover:to-violet-600"
                : "bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
            }`}
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {outputType === "video"
                  ? "Generating video..."
                  : `Generating${count > 1 ? ` ${count} images` : ""}...`}
              </>
            ) : (
              <>
                {outputType === "video" ? (
                  <Film className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {outputType === "video"
                  ? `Generate ${videoDuration}s Video`
                  : mode === "generate"
                  ? `Generate${count > 1 ? ` ${count} images` : ""}`
                  : mode === "edit"
                  ? "Apply Edit"
                  : "Transfer Style"}
              </>
            )}
          </button>

          {/* Video polling progress */}
          {videoPolling && videoProgress && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400 shrink-0" />
              <span className="text-xs text-cyan-300">{videoProgress}</span>
            </div>
          )}

          {/* Aspect Ratio Grid */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
              Aspect Ratio
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {outputType === "image"
                ? ASPECT_RATIOS.map(({ value, label, icon }) => (
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
                  ))
                : VIDEO_ASPECT_RATIOS.map(({ value, label, icon }) => (
                    <button
                      key={value}
                      onClick={() => setVideoAspectRatio(value)}
                      className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg text-xs transition-all ${
                        videoAspectRatio === value
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
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
              <p className="text-sm text-white/40">No creations yet</p>
              <p className="text-xs text-white/25 mt-1">
                Enter a prompt and hit Generate to create images or videos
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
                  onLightbox={() => {
                    setLightboxImage(image);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Lightbox ─── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {lightboxImage.output_type === "video" ? (
              <video
                src={lightboxImage.saved_url || lightboxImage.url}
                controls
                autoPlay
                className="max-w-full max-h-[75vh] rounded-2xl"
              />
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={lightboxImage.saved_url || lightboxImage.url}
                alt={lightboxImage.prompt}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl"
              />
            )}
            {/* Prompt display */}
            <div className="mt-3 max-w-2xl w-full px-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/50 uppercase tracking-wider">
                  {lightboxImage.model}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-white/50">
                  {lightboxImage.aspect_ratio} · {lightboxImage.resolution}
                </span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                {lightboxImage.prompt}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(lightboxImage.prompt);
                  toast.success("Prompt copied");
                }}
                className="mt-2 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                <Copy className="w-3 h-3" />
                Copy prompt
              </button>
            </div>
            <button
              onClick={() => setLightboxImage(null)}
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
  const [imgError, setImgError] = useState(false);
  const displayUrl = image.saved_url || image.url;
  const isVideo = image.output_type === "video";

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
      {/* Media */}
      <div className="relative aspect-square bg-black/20 cursor-pointer" onClick={onLightbox}>
        {isVideo ? (
          <video
            src={displayUrl}
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
            onMouseLeave={(e) => {
              const v = e.target as HTMLVideoElement;
              v.pause();
              v.currentTime = 0;
            }}
          />
        ) : imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-white/30">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[10px]">Expired</span>
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={displayUrl}
            alt={image.prompt}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Video play indicator */}
        {isVideo && !showActions && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
              <Play className="w-5 h-5 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity ${
            showActions ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Top badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            {isVideo && (
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/50 text-[9px] text-white font-semibold backdrop-blur-sm flex items-center gap-1">
                <Film className="w-2.5 h-2.5" />
                {image.duration}s
              </span>
            )}
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
                  onDownload(displayUrl, `exa-ai-${image.id}.${isVideo ? "mp4" : "png"}`);
                }}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Download"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              {!isVideo && (
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
              )}
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
