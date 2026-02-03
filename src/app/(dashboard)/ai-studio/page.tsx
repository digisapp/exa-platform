"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  Loader2,
  Check,
  Download,
  Plus,
  ImageIcon,
  Coins,
  RefreshCw,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AI_SCENARIOS, AI_GENERATION_COST, type ScenarioId } from "@/lib/replicate";
import { useCoinBalance } from "@/contexts/CoinBalanceContext";

type GenerationStatus = "idle" | "uploading" | "generating" | "completed" | "error";

interface Generation {
  id: string;
  scenario_name: string;
  status: string;
  result_urls: string[] | null;
  created_at: string;
}

export default function AIStudioPage() {
  const router = useRouter();
  const { balance: coinBalance, deductCoins } = useCoinBalance();
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [selectedScenario, setSelectedScenario] = useState<ScenarioId | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<string[]>([]);
  const [pastGenerations, setPastGenerations] = useState<Generation[]>([]);
  const [selectedResult, setSelectedResult] = useState<string | null>(null);
  const [savingImage, setSavingImage] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Fetch past generations (non-blocking)
  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const genRes = await fetch("/api/ai/generate?limit=10", {
          signal: controller.signal,
        });
        if (genRes.ok) {
          const data = await genRes.json();
          setPastGenerations(data.generations || []);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Failed to fetch generations:", error);
        }
      }
    }
    fetchData();
    return () => controller.abort();
  }, []);

  // Poll for generation status
  useEffect(() => {
    if (!generationId || status !== "generating") return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/ai/generate/${generationId}`);
        if (!res.ok) return;

        const data = await res.json();

        if (data.status === "completed" && data.resultUrls) {
          setResultImages(data.resultUrls);
          setStatus("completed");
          toast.success("Your AI photos are ready!");
          clearInterval(pollInterval);

          // Refresh past generations
          const genRes = await fetch("/api/ai/generate?limit=10");
          if (genRes.ok) {
            const genData = await genRes.json();
            setPastGenerations(genData.generations || []);
          }
        } else if (data.status === "failed") {
          setStatus("error");
          toast.error(data.error || "Generation failed");
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [generationId, status]);

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setStatus("uploading");

    // Create preview first
    const previewUrl = URL.createObjectURL(file);
    setUploadedImagePreview(previewUrl);

    try {
      // Upload to storage (use ai-source for faster upload without image processing)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "ai-source");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      console.log("[AI Studio] Upload response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      if (!data.url) {
        throw new Error("No URL returned from upload");
      }

      setUploadedImageUrl(data.url);
      setStatus("idle");
      toast.success("Photo uploaded! Now select a scenario.");
    } catch (error) {
      console.error("Upload error:", error);
      setStatus("idle");
      setUploadedImagePreview(null);
      setUploadedImageUrl(null);
      toast.error(error instanceof Error ? error.message : "Failed to upload image. Please try again.");
    }
  }, []);

  // Start generation
  const handleGenerate = async () => {
    // Show specific error messages for missing requirements
    if (!uploadedImageUrl) {
      toast.error("Please upload a photo first");
      return;
    }

    if (!selectedScenario) {
      toast.error("Please select a scenario");
      return;
    }

    if (coinBalance < AI_GENERATION_COST) {
      toast.error(`You need ${AI_GENERATION_COST} coins. Buy more coins to continue.`);
      router.push("/wallet");
      return;
    }

    setStatus("generating");
    setResultImages([]);

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceImageUrl: uploadedImageUrl,
          scenarioId: selectedScenario,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setGenerationId(data.generationId);
      deductCoins(AI_GENERATION_COST);
      toast.success(`Generation started! ${AI_GENERATION_COST} coins deducted.`);
    } catch (error) {
      console.error("Generation error:", error);
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Failed to start generation");
    }
  };

  // Save image to portfolio
  const handleSaveToPortfolio = async (imageUrl: string) => {
    if (!generationId) return;

    setSavingImage(imageUrl);

    try {
      const res = await fetch("/api/ai/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId,
          imageUrl,
          saveToPortfolio: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }

      toast.success("Added to your portfolio!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSavingImage(null);
    }
  };

  // Download image
  const handleDownload = async (imageUrl: string) => {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-photo-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download");
    }
  };

  // Reset for new generation
  const handleReset = () => {
    setStatus("idle");
    setSelectedScenario(null);
    setUploadedImageUrl(null);
    setUploadedImagePreview(null);
    setGenerationId(null);
    setResultImages([]);
  };

  // Get unique categories
  const categories = Array.from(new Set(Object.values(AI_SCENARIOS).map(s => s.category)));

  // Filter scenarios
  const filteredScenarios = Object.entries(AI_SCENARIOS).filter(
    ([, scenario]) => !filterCategory || scenario.category === filterCategory
  );

  return (
    <div className="container max-w-6xl py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          AI Photo Studio
        </h1>
        <p className="text-muted-foreground mt-1">
          Generate stunning photos of yourself in different scenarios
        </p>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Upload & Scenarios */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Upload Photo */}
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">1</span>
              Upload Your Face Photo
            </h2>

            {!uploadedImagePreview ? (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  disabled={status === "uploading" || status === "generating"}
                />
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-12 text-center transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  status === "uploading" && "opacity-50 pointer-events-none"
                )}>
                  {status === "uploading" ? (
                    <Loader2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  )}
                  <p className="text-muted-foreground mb-2">
                    {status === "uploading" ? "Uploading..." : "Click or drag a clear face photo"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    For best results, use a well-lit photo showing your face clearly
                  </p>
                </div>
              </label>
            ) : (
              <div className="flex items-start gap-4">
                <div className="relative w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={uploadedImagePreview}
                    alt="Your photo"
                    className="w-full h-full object-cover"
                  />
                  {status !== "generating" && status !== "completed" && (
                    <button
                      onClick={handleReset}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 hover:bg-black/80"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Photo uploaded
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Now select a scenario below to generate your AI photos
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Select Scenario */}
          <div className="rounded-2xl border bg-card p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">2</span>
              Choose a Scenario
            </h2>

            {/* Category Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setFilterCategory(null)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  !filterCategory
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all",
                    filterCategory === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Scenarios List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredScenarios.map(([id, scenario]) => (
                <button
                  key={id}
                  onClick={() => setSelectedScenario(id as ScenarioId)}
                  disabled={status === "generating"}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl text-left transition-all",
                    "border hover:bg-muted/50",
                    selectedScenario === id
                      ? "border-primary bg-primary/10"
                      : "border-border"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                    "bg-gradient-to-br from-violet-500/20 to-pink-500/20"
                  )}>
                    <ImageIcon className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{scenario.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{scenario.description}</p>
                  </div>
                  {selectedScenario === id && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button - Always visible */}
          {status !== "completed" && (
            <Button
              onClick={handleGenerate}
              disabled={status === "generating" || status === "uploading"}
              size="lg"
              className="w-full h-14 text-lg exa-gradient-button"
            >
              {status === "generating" ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Generating... (this takes ~30 seconds)
                </>
              ) : status === "uploading" ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate ({AI_GENERATION_COST} coins)
                </>
              )}
            </Button>
          )}

          {/* Results */}
          {status === "completed" && resultImages.length > 0 && (
            <div className="rounded-2xl border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  Your AI Photos
                </h2>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate More
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {resultImages.map((url, index) => (
                  <div
                    key={index}
                    className="relative group rounded-xl overflow-hidden cursor-pointer"
                    onClick={() => setSelectedResult(url)}
                  >
                    <img
                      src={url}
                      alt={`Generated photo ${index + 1}`}
                      className="w-full aspect-[3/4] object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSaveToPortfolio(url); }}
                          disabled={savingImage === url}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                        >
                          {savingImage === url ? (
                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                          ) : (
                            <Plus className="h-5 w-5 text-white" />
                          )}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownload(url); }}
                          className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm"
                        >
                          <Download className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Past Generations & Info */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold mb-3">How it works</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">1</span>
                Upload a clear photo of your face
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">2</span>
                Choose a scenario (beach, city, studio, etc.)
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">3</span>
                AI generates 4 unique photos of you
              </li>
              <li className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">4</span>
                Save your favorites to your portfolio
              </li>
            </ol>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cost per generation</span>
                <span className="font-semibold flex items-center gap-1">
                  <Coins className="h-4 w-4 text-amber-500" />
                  {AI_GENERATION_COST} coins
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-muted-foreground">Photos generated</span>
                <span className="font-semibold">4 images</span>
              </div>
            </div>

            {coinBalance < AI_GENERATION_COST && (
              <Button
                variant="outline"
                className="w-full mt-4 border-amber-500/50 text-amber-500 hover:bg-amber-500/10"
                onClick={() => router.push("/wallet")}
              >
                <Coins className="h-4 w-4 mr-2" />
                Buy Coins
              </Button>
            )}
          </div>

          {/* Past Generations */}
          {pastGenerations.length > 0 && (
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="font-semibold mb-4">Recent Generations</h3>
              <div className="space-y-3">
                {pastGenerations.slice(0, 5).map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => {
                      if (gen.result_urls?.length) {
                        setResultImages(gen.result_urls);
                        setGenerationId(gen.id);
                        setStatus("completed");
                      }
                    }}
                  >
                    {gen.result_urls?.[0] ? (
                      <img
                        src={gen.result_urls[0]}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        {gen.status === "processing" ? (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{gen.scenario_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {gen.status === "completed"
                          ? `${gen.result_urls?.length || 0} photos`
                          : gen.status === "processing"
                          ? "Generating..."
                          : gen.status}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {selectedResult && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedResult(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20"
            onClick={() => setSelectedResult(null)}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={selectedResult}
            alt="Generated photo"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            <Button
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); handleSaveToPortfolio(selectedResult); }}
              disabled={savingImage === selectedResult}
            >
              {savingImage === selectedResult ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add to Portfolio
            </Button>
            <Button
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); handleDownload(selectedResult); }}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
