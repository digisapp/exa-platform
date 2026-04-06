"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Search,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Image as ImageIcon,
  RefreshCw,
  Wand2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface ExaDollModel {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  country_code: string | null;
  hair_color: string | null;
  eye_color: string | null;
  skin_tone: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  profile_photo_url: string | null;
  focus_tags: string[] | null;
  exa_doll_image_url: string | null;
  exa_doll_prompt: string | null;
  exa_doll_generated_at: string | null;
  is_approved: boolean | null;
}

const SKIN_TONES = [
  "fair",
  "light",
  "medium",
  "olive",
  "tan",
  "brown",
  "deep brown",
  "dark",
  "ebony",
];

export default function ExaDollsPage() {
  const [models, setModels] = useState<ExaDollModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [previewModel, setPreviewModel] = useState<ExaDollModel | null>(null);
  const [generatedTotal, setGeneratedTotal] = useState(0);
  const pageSize = 50;

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        filter,
        search,
      });
      const res = await fetch(`/api/admin/exa-dolls?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setModels(data.models);
      setTotal(data.total);
      setGeneratedTotal(data.generatedTotal);
    } catch {
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [page, filter, search]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const generateDoll = async (modelId: string) => {
    setGeneratingIds((prev) => new Set(prev).add(modelId));
    try {
      // Step 1: Generate base + start face swap
      const res = await fetch(`/api/admin/exa-dolls/${modelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await res.json();

      if (data.status === "base_only") {
        toast.warning("Base image generated but face swap failed. Using base image.");
        fetchModels();
        return;
      }

      if (data.status === "face_swap_pending") {
        toast.info("Generating Exa Doll... Face swap in progress");
        // Poll for face swap completion
        await pollFaceSwap(modelId, data.predictionId);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(modelId);
        return next;
      });
    }
  };

  const pollFaceSwap = async (
    modelId: string,
    predictionId: string
  ) => {
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));

      const res = await fetch(
        `/api/admin/exa-dolls/${modelId}?predictionId=${predictionId}`
      );
      const data = await res.json();

      if (data.status === "completed") {
        toast.success("Exa Doll generated successfully!");
        fetchModels();
        return;
      }

      if (data.status === "failed") {
        toast.error(data.error || "Face swap failed");
        return;
      }
    }
    toast.error("Face swap timed out. Check back later.");
  };

  const updateSkinTone = async (modelId: string, skinTone: string) => {
    try {
      const res = await fetch(`/api/admin/exa-dolls/${modelId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skin_tone: skinTone }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Skin tone updated");
      setModels((prev) =>
        prev.map((m) => (m.id === modelId ? { ...m, skin_tone: skinTone } : m))
      );
    } catch {
      toast.error("Failed to update skin tone");
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-pink-500" />
              Exa Dolls
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-generated doll-style digital twins for your models
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            {total} models total
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex">
        <Card>
          <CardContent className="pt-4 pb-3 px-6 text-center">
            <p className="text-2xl font-bold text-green-600">{generatedTotal}</p>
            <p className="text-xs text-muted-foreground">Dolls Generated</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Models</SelectItem>
            <SelectItem value="generated">Has Doll</SelectItem>
            <SelectItem value="pending">No Doll Yet</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchModels}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Model Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : models.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center text-muted-foreground">
            No models found
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {models.map((model) => {
            const isGenerating = generatingIds.has(model.id);
            const hasDoll = !!model.exa_doll_image_url;
            const name =
              [model.first_name, model.last_name].filter(Boolean).join(" ") ||
              model.username ||
              "Unknown";

            return (
              <Card
                key={model.id}
                className={`overflow-hidden group relative${hasDoll ? " cursor-pointer" : ""}`}
                onClick={hasDoll ? () => setPreviewModel(model) : undefined}
              >
                {/* Status badge */}
                {hasDoll && (
                  <div className="absolute top-2 right-2 z-10">
                    <CheckCircle className="h-5 w-5 text-green-500 bg-white rounded-full" />
                  </div>
                )}

                {/* Images: Original + Doll side by side */}
                <div className="aspect-[3/4] relative bg-muted">
                  {hasDoll ? (
                    <div className="grid grid-cols-2 h-full">
                      {/* Original */}
                      <div className="relative">
                        {model.profile_photo_url ? (
                          <Image
                            src={model.profile_photo_url}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full bg-muted">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {/* Doll */}
                      <div className="relative">
                        <Image
                          src={model.exa_doll_image_url!}
                          alt={`${name} Exa Doll`}
                          fill
                          className="object-cover"
                          sizes="120px"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </div>
                  ) : model.profile_photo_url ? (
                    <Image
                      src={model.profile_photo_url}
                      alt={name}
                      fill
                      className="object-cover"
                      sizes="240px"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <CardContent className="p-3 space-y-2">
                  {/* Name & info */}
                  <div>
                    <p className="font-medium text-sm truncate">{name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{model.username || "—"}
                      {model.country_code && ` · ${model.country_code}`}
                    </p>
                  </div>

                  {/* Attributes */}
                  <div className="flex flex-wrap gap-1">
                    {model.hair_color && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {model.hair_color}
                      </span>
                    )}
                    {model.eye_color && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {model.eye_color}
                      </span>
                    )}
                    {model.skin_tone && (
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {model.skin_tone}
                      </span>
                    )}
                  </div>

                  {/* Generate button */}
                  <Button
                    size="sm"
                    className="w-full text-xs h-8"
                    variant={hasDoll ? "outline" : "default"}
                    disabled={isGenerating || !model.profile_photo_url}
                    onClick={(e) => { e.stopPropagation(); generateDoll(model.id); }}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : hasDoll ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Regenerate
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-3 w-3 mr-1" />
                        Generate Doll
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!previewModel}
        onOpenChange={() => setPreviewModel(null)}
      >
        <DialogContent className="max-w-3xl">
          {previewModel && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-pink-500" />
                  {[previewModel.first_name, previewModel.last_name]
                    .filter(Boolean)
                    .join(" ") ||
                    previewModel.username ||
                    "Exa Doll"}
                </DialogTitle>
                <DialogDescription>
                  @{previewModel.username}
                  {previewModel.exa_doll_generated_at &&
                    ` · Generated ${new Date(previewModel.exa_doll_generated_at).toLocaleDateString()}`}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {/* Original photo */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Original</p>
                  <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted">
                    {previewModel.profile_photo_url ? (
                      <Image
                        src={previewModel.profile_photo_url}
                        alt="Original"
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Exa Doll */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Exa Doll
                  </p>
                  <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-muted">
                    {previewModel.exa_doll_image_url ? (
                      <Image
                        src={previewModel.exa_doll_image_url}
                        alt="Exa Doll"
                        fill
                        className="object-cover"
                        sizes="400px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Sparkles className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Prompt used */}
              {previewModel.exa_doll_prompt && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">
                    Prompt used:
                  </p>
                  <p className="text-xs bg-muted p-3 rounded-lg font-mono break-words max-h-32 overflow-y-auto">
                    {previewModel.exa_doll_prompt}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Skin tone:</span>
                  <Select
                    value={previewModel.skin_tone || ""}
                    onValueChange={(v) => {
                      updateSkinTone(previewModel.id, v);
                      setPreviewModel({ ...previewModel, skin_tone: v });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue placeholder="Auto-detected" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKIN_TONES.map((tone) => (
                        <SelectItem key={tone} value={tone} className="text-xs">
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    generateDoll(previewModel.id);
                    setPreviewModel(null);
                  }}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
