"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Upload,
  X,
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

interface UploadedPhoto {
  id: string;
  dataUrl: string;
}

const MAX_PHOTOS = 5;
const UPLOAD_PREFIX = "upload-";

// For logos and non-photo assets — preserves original format (PNG transparency)
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

// For photos — loads via <img> element which reliably applies EXIF rotation
// in all modern browsers, then draws to canvas to produce a normalized JPEG.
function photoToBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

// For uploaded files — loads via <img> + object URL to normalize EXIF
async function fileToBase64(file: File): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

export default function CompCardPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useState<ModelData | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

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

    // Generate QR code for preview
    try {
      const QRCode = (await import("qrcode")).default;
      const profileUrl = `https://www.examodels.com/${modelData.username || ""}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 200, margin: 1 });
      setQrCodePreview(qrDataUrl);
    } catch {
      // QR code preview is non-critical
    }

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

    // Pre-select first 4 portfolio photos
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

  const PHOTO_LABELS = ["Front", "Back Top Left", "Back Top Right", "Back Bottom Left", "Back Bottom Right"];

  // Handle file upload from device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const totalSelected = selectedIds.length;
    const remainingSlots = MAX_PHOTOS - totalSelected;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }

      const dataUrl = await fileToBase64(file);
      const id = `${UPLOAD_PREFIX}${Date.now()}-${i}`;

      setUploadedPhotos((prev) => [...prev, { id, dataUrl }]);

      // Auto-select if there's room
      if (i < remainingSlots) {
        setSelectedIds((prev) => {
          if (prev.length >= MAX_PHOTOS) return prev;
          return [...prev, id];
        });
      }
    }

    // Reset input so the same file can be re-uploaded
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeUploadedPhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => prev.filter((p) => p !== id));
  };

  const handleExportPDF = async () => {
    if (!model || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    setExporting(true);
    try {
      // Convert selected photos to base64
      const photoBase64: string[] = [];

      for (const id of selectedIds) {
        if (id.startsWith(UPLOAD_PREFIX)) {
          // Uploaded photo — already base64
          const uploaded = uploadedPhotos.find((p) => p.id === id);
          if (uploaded) photoBase64.push(uploaded.dataUrl);
        } else {
          // Portfolio photo — fetch and convert
          const photo = photos.find((p) => p.id === id);
          if (photo) {
            const b64 = await photoToBase64(photo.photo_url || photo.url || "");
            photoBase64.push(b64);
          }
        }
      }

      // Load logos + generate QR code
      const QRCode = (await import("qrcode")).default;
      const profileUrl = `https://www.examodels.com/${model.username || ""}`;
      const [frontLogoBase64, backLogoBase64, qrCodeBase64] = await Promise.all([
        toBase64("/exa-models-logo-white.png"),
        toBase64("/exa-models-logo-black.png"),
        QRCode.toDataURL(profileUrl, { width: 200, margin: 1 }),
      ]);

      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");
      const { default: CompCardPDF } = await import(
        "@/components/comp-card/CompCardPDF"
      );

      const blob = await pdf(
        CompCardPDF({ model, photos: photoBase64, frontLogoUrl: frontLogoBase64, backLogoUrl: backLogoBase64, qrCodeUrl: qrCodeBase64 })
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
    model && (model.height || model.bust || model.waist || model.hips);

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

  // Get preview image URL for a selected ID
  const getPreviewUrl = (id: string): string => {
    if (id.startsWith(UPLOAD_PREFIX)) {
      const uploaded = uploadedPhotos.find((p) => p.id === id);
      return uploaded?.dataUrl || "";
    }
    const photo = photos.find((p) => p.id === id);
    return photo?.photo_url || photo?.url || "";
  };

  // Selected photo URLs for preview
  const previewUrls = selectedIds.map((id) => ({
    id,
    url: getPreviewUrl(id),
  }));

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
            Select {MAX_PHOTOS} photos — first is the front cover, next 4 go on
            the back
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

          {/* Portfolio Photos */}
          {photos.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Portfolio Photos
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
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
                      <div
                        className={cn(
                          "absolute inset-0 transition-opacity",
                          isSelected
                            ? "bg-black/30"
                            : "bg-black/0 group-hover:bg-black/20"
                        )}
                      />
                      {isSelected && (
                        <div className="absolute top-2 left-2 bg-pink-500 rounded-full px-2 py-0.5 flex items-center justify-center">
                          <span className="text-white text-[9px] font-bold whitespace-nowrap">
                            {PHOTO_LABELS[idx]}
                          </span>
                        </div>
                      )}
                      {!isSelected && (
                        <div className="absolute top-2 left-2 h-6 w-6 rounded-full border-2 border-white/60 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Uploaded Photos */}
          {uploadedPhotos.length > 0 && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Uploaded Photos
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {uploadedPhotos.map((photo) => {
                  const idx = getSelectionIndex(photo.id);
                  const isSelected = idx !== -1;
                  return (
                    <div key={photo.id} className="relative">
                      <button
                        onClick={() => togglePhoto(photo.id)}
                        className={cn(
                          "relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all group w-full",
                          isSelected
                            ? "border-pink-500 ring-2 ring-pink-500/30"
                            : "border-transparent hover:border-white/20"
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.dataUrl}
                          alt="Uploaded"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        <div
                          className={cn(
                            "absolute inset-0 transition-opacity",
                            isSelected
                              ? "bg-black/30"
                              : "bg-black/0 group-hover:bg-black/20"
                          )}
                        />
                        {isSelected && (
                          <div className="absolute top-2 left-2 bg-pink-500 rounded-full px-2 py-0.5 flex items-center justify-center">
                            <span className="text-white text-[9px] font-bold whitespace-nowrap">
                              {PHOTO_LABELS[idx]}
                            </span>
                          </div>
                        )}
                        {!isSelected && (
                          <div className="absolute top-2 left-2 h-6 w-6 rounded-full border-2 border-white/60 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={() => removeUploadedPhoto(photo.id)}
                        className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center hover:bg-red-600 transition-colors z-10"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-border hover:border-pink-500/50 rounded-lg p-6 flex flex-col items-center gap-2 transition-colors group"
          >
            <Upload className="h-6 w-6 text-muted-foreground group-hover:text-pink-500 transition-colors" />
            <span className="text-sm text-muted-foreground group-hover:text-pink-500 transition-colors">
              Upload from device
            </span>
            <span className="text-xs text-muted-foreground">
              JPG, PNG, or WebP
            </span>
          </button>

          {photos.length === 0 && uploadedPhotos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Upload photos or{" "}
              <Link
                href="/content"
                className="text-pink-500 hover:text-pink-400"
              >
                add portfolio photos
              </Link>{" "}
              to create your comp card.
            </p>
          )}
        </div>

        {/* Right: Live Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview
          </h2>

          <div className="space-y-4">
            {/* ── FRONT PREVIEW ── */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Front</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-black aspect-[8.5/11] relative">
                    {/* Hero photo full-bleed */}
                    {previewUrls.length > 0 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrls[0].url}
                          alt="Hero"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                        {/* Logo at top center */}
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-7 z-10">
                          <Image
                            src="/exa-models-logo-white.png"
                            alt="EXA Models"
                            width={120}
                            height={40}
                            className="h-8 w-auto"
                          />
                        </div>
                        {/* Name at bottom — no overlay */}
                        {model.first_name && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-6 text-center">
                            <p className="text-white text-6xl sm:text-7xl font-black uppercase tracking-[0.03em] leading-tight">
                              {model.first_name}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-500 text-xs">
                          Select a photo for the front
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── BACK PREVIEW ── */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Back</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-white p-5 aspect-[8.5/11] flex flex-col justify-between">
                    {/* Top section: Logo + Name + Measurements + Photos */}
                    <div>
                      {/* EXA Models Logo */}
                      <div className="flex justify-center mb-2">
                        <Image
                          src="/exa-models-logo-black.png"
                          alt="EXA Models"
                          width={80}
                          height={28}
                          className="h-5 w-auto"
                        />
                      </div>

                      {/* Model Name */}
                      <p className="text-lg font-bold text-black uppercase tracking-[0.15em] text-center mb-2">
                        {fullName}
                      </p>

                      {/* Measurements */}
                      {measurements.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mb-2">
                          {measurements.map((m) => (
                            <div key={m.label} className="text-center">
                              <p className="text-[6px] text-gray-400 uppercase tracking-wider">
                                {m.label}
                              </p>
                              <p className="text-[9px] font-bold text-black">
                                {m.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 2x2 photo grid */}
                      {previewUrls.length > 1 ? (
                        <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
                          {previewUrls.slice(1, 5).map((item) => (
                            <div
                              key={item.id}
                              className="relative aspect-[3/4] rounded overflow-hidden bg-gray-100"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.url}
                                alt="Photo"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-[4/3] rounded bg-gray-100 flex items-center justify-center">
                          <p className="text-gray-400 text-xs">
                            Select photos
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Footer: contact (left) | QR (right) */}
                    <div className="pt-2 mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-[7px] text-black">
                          team@examodels.com
                        </p>
                        {model.instagram_name && (
                          <p className="text-[7px] text-black">
                            @{model.instagram_name}
                          </p>
                        )}
                        {model.username && (
                          <p className="text-[7px] text-black">
                            examodels.com/{model.username}
                          </p>
                        )}
                      </div>
                      {qrCodePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrCodePreview} alt="QR" className="w-10 h-10 rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                          <span className="text-[5px] text-gray-400">QR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

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
