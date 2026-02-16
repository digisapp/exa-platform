"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Loader2,
  Image as ImageIcon,
  FileText,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModelData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  eye_color: string | null;
  hair_color: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  instagram_name: string | null;
  city: string | null;
  state: string | null;
  profile_photo_url: string | null;
}

interface PortfolioPhoto {
  id: string;
  url: string | null;
  photo_url: string | null;
  is_primary: boolean | null;
  display_order: number | null;
}

const MAX_PHOTOS = 4;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function CompCardPage() {
  const supabase = createClient();

  const [model, setModel] = useState<ModelData | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: modelData } = await supabase
      .from("models")
      .select(
        "id, first_name, last_name, username, height, bust, waist, hips, eye_color, hair_color, dress_size, shoe_size, instagram_name, city, state, profile_photo_url"
      )
      .eq("user_id", user.id)
      .single();

    if (!modelData) {
      setLoading(false);
      return;
    }

    setModel(modelData);

    const { data: portfolioData } = await supabase
      .from("media_assets")
      .select("id, url, photo_url, is_primary, display_order")
      .eq("model_id", modelData.id)
      .eq("asset_type", "portfolio")
      .neq("is_visible", false)
      .order("display_order", { ascending: true })
      .limit(50);

    const allPhotos = portfolioData || [];
    setPhotos(allPhotos);

    // Pre-select: profile photo as hero + first 3 portfolio photos
    if (allPhotos.length > 0) {
      const initial = allPhotos.slice(0, Math.min(MAX_PHOTOS, allPhotos.length));
      setSelectedIds(initial.map((p) => p.id));
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const togglePhoto = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((p) => p !== id);
      }
      if (prev.length >= MAX_PHOTOS) {
        toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const getSelectionIndex = (id: string) => selectedIds.indexOf(id);

  const handleExportPDF = async () => {
    if (!model || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    setExporting(true);
    try {
      // Convert selected photos to base64
      const selectedPhotos = selectedIds
        .map((id) => photos.find((p) => p.id === id))
        .filter(Boolean) as PortfolioPhoto[];

      const photoBase64 = await Promise.all(
        selectedPhotos.map((p) => toBase64(p.photo_url || p.url || ""))
      );

      // Load logo
      const logoBase64 = await toBase64("/exa-logo-black.png");

      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");
      const { default: CompCardPDF } = await import(
        "@/components/comp-card/CompCardPDF"
      );

      const blob = await pdf(
        CompCardPDF({ model, photos: photoBase64, logoUrl: logoBase64 })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const firstName = model.first_name || "Model";
      const lastName = model.last_name || "";
      link.download = `${firstName}${lastName ? `-${lastName}` : ""}-CompCard.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Comp card downloaded!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate comp card. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  // Check if model has measurements
  const hasMeasurements =
    model &&
    (model.height || model.bust || model.waist || model.hips);

  const measurements = model
    ? [
        { label: "Height", value: model.height },
        { label: "Bust", value: model.bust },
        { label: "Waist", value: model.waist },
        { label: "Hips", value: model.hips },
        { label: "Eyes", value: model.eye_color },
        { label: "Hair", value: model.hair_color },
        { label: "Dress", value: model.dress_size },
        { label: "Shoes", value: model.shoe_size },
      ].filter((m) => m.value)
    : [];

  const fullName =
    model && (model.first_name || model.last_name)
      ? [model.first_name, model.last_name].filter(Boolean).join(" ")
      : "Model";

  const location =
    model && (model.city || model.state)
      ? [model.city, model.state].filter(Boolean).join(", ")
      : null;

  // Selected photos for preview
  const previewPhotos = selectedIds
    .map((id) => photos.find((p) => p.id === id))
    .filter(Boolean) as PortfolioPhoto[];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Comp Card</h1>
        <p className="text-muted-foreground">
          You need a model profile to create a comp card.
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Comp Card</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Select up to {MAX_PHOTOS} photos and download your professional comp
            card
          </p>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={exporting || selectedIds.length === 0}
          className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Missing measurements warning */}
      {!hasMeasurements && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">
              Missing measurements
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add your height, bust, waist, and hips in{" "}
              <Link
                href="/settings"
                className="text-pink-500 hover:text-pink-400 underline"
              >
                Settings
              </Link>{" "}
              for a complete comp card.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Photo Selector */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Select Photos
            <span className="text-sm font-normal text-muted-foreground">
              ({selectedIds.length}/{MAX_PHOTOS})
            </span>
          </h2>

          {photos.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground text-center">
                  No portfolio photos yet.
                  <br />
                  <Link
                    href="/content"
                    className="text-pink-500 hover:text-pink-400"
                  >
                    Upload photos
                  </Link>{" "}
                  to create your comp card.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {photos.map((photo) => {
                const idx = getSelectionIndex(photo.id);
                const isSelected = idx !== -1;
                return (
                  <button
                    key={photo.id}
                    onClick={() => togglePhoto(photo.id)}
                    className={cn(
                      "relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all group",
                      isSelected
                        ? "border-pink-500 ring-2 ring-pink-500/30"
                        : "border-transparent hover:border-white/20"
                    )}
                  >
                    <Image
                      src={photo.photo_url || photo.url || ""}
                      alt="Portfolio"
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                    {/* Dark overlay on hover */}
                    <div
                      className={cn(
                        "absolute inset-0 transition-opacity",
                        isSelected
                          ? "bg-black/30"
                          : "bg-black/0 group-hover:bg-black/20"
                      )}
                    />
                    {/* Selection badge */}
                    {isSelected && (
                      <div className="absolute top-2 left-2 h-6 w-6 rounded-full bg-pink-500 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {idx + 1}
                        </span>
                      </div>
                    )}
                    {/* Unselected indicator */}
                    {!isSelected && (
                      <div className="absolute top-2 left-2 h-6 w-6 rounded-full border-2 border-white/60 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview
          </h2>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Comp card preview (HTML-based, matches PDF layout) */}
              <div className="bg-white p-6 aspect-[8.5/11] flex flex-col">
                {/* Logo */}
                <div className="flex justify-center mb-2">
                  <Image
                    src="/exa-logo-black.png"
                    alt="EXA Models"
                    width={60}
                    height={24}
                    className="h-5 w-auto"
                  />
                </div>

                {/* Name */}
                <div className="text-center mb-2">
                  <h3 className="text-lg font-bold text-black uppercase tracking-widest leading-tight">
                    {fullName}
                  </h3>
                  {location && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {location}
                    </p>
                  )}
                </div>

                {/* Hero Photo */}
                {previewPhotos.length > 0 ? (
                  <div className="relative flex-1 min-h-0 mb-2 rounded overflow-hidden bg-gray-100">
                    <Image
                      src={
                        previewPhotos[0].photo_url || previewPhotos[0].url || ""
                      }
                      alt="Hero"
                      fill
                      className="object-cover"
                      sizes="400px"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 mb-2 rounded bg-gray-100 flex items-center justify-center">
                    <p className="text-gray-400 text-xs">Select a photo</p>
                  </div>
                )}

                {/* Supporting Photos */}
                {previewPhotos.length > 1 && (
                  <div className="flex gap-1 mb-2">
                    {previewPhotos.slice(1, 4).map((photo) => (
                      <div
                        key={photo.id}
                        className="relative flex-1 aspect-square rounded overflow-hidden bg-gray-100"
                      >
                        <Image
                          src={photo.photo_url || photo.url || ""}
                          alt="Supporting"
                          fill
                          className="object-cover"
                          sizes="130px"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Measurements */}
                {measurements.length > 0 && (
                  <div className="border-t border-gray-200 pt-2 mt-auto">
                    <div className="grid grid-cols-4 gap-1">
                      {measurements.map((m) => (
                        <div key={m.label}>
                          <p className="text-[7px] text-gray-400 uppercase tracking-wider">
                            {m.label}
                          </p>
                          <p className="text-[10px] font-bold text-black">
                            {m.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="border-t border-gray-200 pt-1.5 mt-2 flex items-center justify-between">
                  <div>
                    {model.instagram_name && (
                      <p className="text-[8px] text-gray-400">
                        @{model.instagram_name}
                      </p>
                    )}
                    {model.username && (
                      <p className="text-[8px] text-gray-400">
                        examodels.com/{model.username}
                      </p>
                    )}
                  </div>
                  <p className="text-[8px] font-bold text-pink-500">
                    EXA MODELS
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export button (mobile) */}
          <div className="mt-4 lg:hidden">
            <Button
              onClick={handleExportPDF}
              disabled={exporting || selectedIds.length === 0}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
