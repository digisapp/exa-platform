"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
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
  Move,
  ZoomIn,
  ImageDown,
  Printer,
} from "lucide-react";
import PrintOrderDialog from "@/components/comp-card/PrintOrderDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cropToPosition,
  toBase64,
  photoToBase64,
  fileToBase64,
  isAcceptedImage,
} from "@/lib/comp-card-utils";

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

export default function CompCardPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useState<ModelData | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingJpeg, setExportingJpeg] = useState(false);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Hero photo repositioning (object-position %) and zoom
  const [heroPos, setHeroPos] = useState({ x: 50, y: 50 });
  const [heroZoom, setHeroZoom] = useState(1);
  const heroRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 50, startY: 50 });
  const prevHeroId = useRef<string | null>(null);

  // Reset position and zoom when front photo changes
  const currentHeroId = selectedIds[0] ?? null;
  if (currentHeroId !== prevHeroId.current) {
    prevHeroId.current = currentHeroId;
    if (heroPos.x !== 50 || heroPos.y !== 50) {
      setHeroPos({ x: 50, y: 50 });
    }
    if (heroZoom !== 1) {
      setHeroZoom(1);
    }
  }

  // Drag handlers for hero photo repositioning
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      // Only on the photo area
      if ((e.target as HTMLElement).tagName === "IMG" || el.contains(e.target as Node)) {
        dragging.current = true;
        dragStart.current = { x: e.clientX, y: e.clientY, startX: heroPos.x, startY: heroPos.y };
        el.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const rect = el.getBoundingClientRect();
      // Map pixel delta to percentage of the container
      const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
      const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
      // Invert: dragging right moves the visible region left (decreases posX)
      const newX = Math.max(0, Math.min(100, dragStart.current.startX - dx));
      const newY = Math.max(0, Math.min(100, dragStart.current.startY - dy));
      setHeroPos({ x: newX, y: newY });
    };

    const onPointerUp = () => {
      dragging.current = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
    };
  });

  const fetchData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserEmail(user.email || "");

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

    const remainingSlots = MAX_PHOTOS - selectedIds.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed. Deselect a photo first.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];

      if (!isAcceptedImage(file)) {
        toast.error(`${file.name} is not a supported image`);
        continue;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }

      let dataUrl: string;
      try {
        dataUrl = await fileToBase64(file);
      } catch {
        toast.error(`Failed to load ${file.name}. Try exporting as JPEG first.`);
        continue;
      }
      const id = `${UPLOAD_PREFIX}${Date.now()}-${i}`;

      setUploadedPhotos((prev) => [...prev, { id, dataUrl }]);

      // Auto-select uploaded photos
      setSelectedIds((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, id];
      });
    }

    if (files.length > filesToProcess) {
      toast.error(`Only ${filesToProcess} photo${filesToProcess === 1 ? "" : "s"} added — ${MAX_PHOTOS} max`);
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

      for (let idx = 0; idx < selectedIds.length; idx++) {
        const id = selectedIds[idx];
        let b64: string;

        if (id.startsWith(UPLOAD_PREFIX)) {
          const uploaded = uploadedPhotos.find((p) => p.id === id);
          b64 = uploaded?.dataUrl || "";
        } else {
          const photo = photos.find((p) => p.id === id);
          b64 = await photoToBase64(photo?.photo_url || photo?.url || "");
        }

        // Pre-crop the hero photo (first) to match the user's repositioning + zoom
        if (idx === 0 && b64) {
          b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
        }

        if (b64) photoBase64.push(b64);
      }

      // Load logos + generate QR code
      const QRCode = (await import("qrcode")).default;
      const profileUrl = `https://www.examodels.com/${model.username || ""}`;
      const [frontLogoBase64, qrCodeBase64] = await Promise.all([
        toBase64("/exa-models-logo-white.png"),
        QRCode.toDataURL(profileUrl, { width: 200, margin: 1 }),
      ]);

      // Dynamic import to avoid SSR issues
      const { pdf } = await import("@react-pdf/renderer");
      const { default: CompCardPDF } = await import(
        "@/components/comp-card/CompCardPDF"
      );

      const blob = await pdf(
        CompCardPDF({ model, photos: photoBase64, frontLogoUrl: frontLogoBase64, qrCodeUrl: qrCodeBase64 })
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

  const generatePdfBase64 = async (): Promise<string> => {
    if (!model || selectedIds.length === 0) throw new Error("No photos selected");
    const photoBase64: string[] = [];
    for (let idx = 0; idx < selectedIds.length; idx++) {
      const id = selectedIds[idx];
      let b64: string;
      if (id.startsWith(UPLOAD_PREFIX)) {
        const uploaded = uploadedPhotos.find((p) => p.id === id);
        b64 = uploaded?.dataUrl || "";
      } else {
        const photo = photos.find((p) => p.id === id);
        b64 = await photoToBase64(photo?.photo_url || photo?.url || "");
      }
      if (idx === 0 && b64) b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
      if (b64) photoBase64.push(b64);
    }
    const QRCode = (await import("qrcode")).default;
    const profileUrl = `https://www.examodels.com/${model.username || ""}`;
    const [frontLogoBase64, qrCodeBase64] = await Promise.all([
      toBase64("/exa-models-logo-white.png"),
      QRCode.toDataURL(profileUrl, { width: 200, margin: 1 }),
    ]);
    const { pdf } = await import("@react-pdf/renderer");
    const { default: CompCardPDF } = await import("@/components/comp-card/CompCardPDF");
    const blob = await pdf(
      CompCardPDF({ model, photos: photoBase64, frontLogoUrl: frontLogoBase64, qrCodeUrl: qrCodeBase64 })
    ).toBlob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.onerror = () => reject(new Error("Failed to read PDF"));
      reader.readAsDataURL(blob);
    });
  };

  const handleExportJPEG = async () => {
    if (!model || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    setExportingJpeg(true);
    try {
      // Shared helpers
      const loadImg = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load image"));
          img.src = src;
        });

      const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
        const url = canvas.toDataURL("image/jpeg", 0.95);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      // Convert selected photos to base64 (same as PDF flow)
      const photoBase64: string[] = [];
      for (let idx = 0; idx < selectedIds.length; idx++) {
        const id = selectedIds[idx];
        let b64: string;
        if (id.startsWith(UPLOAD_PREFIX)) {
          const uploaded = uploadedPhotos.find((p) => p.id === id);
          b64 = uploaded?.dataUrl || "";
        } else {
          const photo = photos.find((p) => p.id === id);
          b64 = await photoToBase64(photo?.photo_url || photo?.url || "");
        }
        if (idx === 0 && b64) {
          b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
        }
        if (b64) photoBase64.push(b64);
      }

      const firstName = model.first_name || "Model";
      const lastName = model.last_name || "";
      const filePrefix = `${firstName}${lastName ? `-${lastName}` : ""}`;

      // ── FRONT CARD ──
      // 5.5 x 8.5 at 200 DPI = 1100 x 1700
      const FW = 1100;
      const FH = 1700;
      const frontCanvas = document.createElement("canvas");
      frontCanvas.width = FW;
      frontCanvas.height = FH;
      const fCtx = frontCanvas.getContext("2d")!;

      // Black background
      fCtx.fillStyle = "#000000";
      fCtx.fillRect(0, 0, FW, FH);

      // Hero photo full-bleed
      if (photoBase64[0]) {
        const heroImg = await loadImg(photoBase64[0]);
        // Cover fit
        const imgAspect = heroImg.naturalWidth / heroImg.naturalHeight;
        const canvasAspect = FW / FH;
        let drawW: number, drawH: number, drawX: number, drawY: number;
        if (imgAspect > canvasAspect) {
          drawH = FH;
          drawW = FH * imgAspect;
          drawX = (FW - drawW) / 2;
          drawY = 0;
        } else {
          drawW = FW;
          drawH = FW / imgAspect;
          drawX = 0;
          drawY = (FH - drawH) / 2;
        }
        fCtx.drawImage(heroImg, drawX, drawY, drawW, drawH);
      }

      // Logo at top center
      const frontLogoImg = await loadImg("/exa-models-logo-white.png");
      const logoW = 470;
      const logoH = Math.round(logoW * (frontLogoImg.naturalHeight / frontLogoImg.naturalWidth));
      fCtx.drawImage(frontLogoImg, (FW - logoW) / 2, 110, logoW, logoH);

      // First name at bottom
      if (model.first_name) {
        fCtx.font = "bold 220px Helvetica, Arial, sans-serif";
        fCtx.fillStyle = "#ffffff";
        fCtx.textAlign = "center";
        fCtx.textBaseline = "bottom";
        fCtx.letterSpacing = "4px";
        fCtx.fillText(model.first_name.toUpperCase(), FW / 2, FH - 80);
      }

      downloadCanvas(frontCanvas, `${filePrefix}-CompCard-Front.jpg`);

      // ── BACK CARD ──
      const BW = 1100;
      const BH = 1700;
      const PAD = 55; // ~20pt at 200dpi
      const bCanvas = document.createElement("canvas");
      bCanvas.width = BW;
      bCanvas.height = BH;
      const bCtx = bCanvas.getContext("2d")!;

      // White background
      bCtx.fillStyle = "#ffffff";
      bCtx.fillRect(0, 0, BW, BH);

      let curY = PAD;

      // Full name
      const fullNameStr = [model.first_name, model.last_name].filter(Boolean).join(" ") || "Model";
      bCtx.font = "bold 39px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#111111";
      bCtx.textAlign = "center";
      bCtx.textBaseline = "top";
      bCtx.letterSpacing = "5px";
      bCtx.fillText(fullNameStr.toUpperCase(), BW / 2, curY);
      curY += 48;

      // Measurements
      const meas: { label: string; value: string }[] = [];
      if (model.height) meas.push({ label: "HEIGHT", value: model.height });
      if (model.bust) meas.push({ label: "BUST", value: model.bust });
      if (model.waist) meas.push({ label: "WAIST", value: model.waist });
      if (model.hips) meas.push({ label: "HIPS", value: model.hips });
      if (model.eye_color) meas.push({ label: "EYES", value: model.eye_color });
      if (model.hair_color) meas.push({ label: "HAIR", value: model.hair_color });
      if (model.dress_size) meas.push({ label: "DRESS", value: model.dress_size });
      if (model.shoe_size) meas.push({ label: "SHOES", value: model.shoe_size });

      if (meas.length > 0) {
        const measItemW = BW / meas.length;
        bCtx.textAlign = "center";
        for (let i = 0; i < meas.length; i++) {
          const cx = measItemW * i + measItemW / 2;
          bCtx.font = "16px Helvetica, Arial, sans-serif";
          bCtx.fillStyle = "#999999";
          bCtx.letterSpacing = "0px";
          bCtx.fillText(meas[i].label, cx, curY);
          bCtx.font = "bold 25px Helvetica, Arial, sans-serif";
          bCtx.fillStyle = "#111111";
          bCtx.fillText(meas[i].value, cx, curY + 20);
        }
        curY += 55;
      }

      // Photo grid: 2x2
      const backPhotos = photoBase64.slice(1, 5);
      if (backPhotos.length > 0) {
        const gridGap = 11;
        const gridW = BW - PAD * 2;
        const photoW = Math.floor((gridW - gridGap) / 2);
        const photoH = 611; // ~222pt at 200dpi scale
        const rows = Math.ceil(backPhotos.length / 2);

        for (let i = 0; i < backPhotos.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const px = PAD + col * (photoW + gridGap);
          const py = curY + row * (photoH + gridGap);

          const pImg = await loadImg(backPhotos[i]);

          // Cover fit into photoW x photoH
          const pAspect = pImg.naturalWidth / pImg.naturalHeight;
          const slotAspect = photoW / photoH;
          let sx: number, sy: number, sw: number, sh: number;
          if (pAspect > slotAspect) {
            sh = pImg.naturalHeight;
            sw = sh * slotAspect;
            sx = (pImg.naturalWidth - sw) / 2;
            sy = 0;
          } else {
            sw = pImg.naturalWidth;
            sh = sw / slotAspect;
            sx = 0;
            sy = (pImg.naturalHeight - sh) / 2;
          }

          // Rounded corners via clip
          bCtx.save();
          const r = 8;
          bCtx.beginPath();
          bCtx.roundRect(px, py, photoW, photoH, r);
          bCtx.clip();
          bCtx.drawImage(pImg, sx, sy, sw, sh, px, py, photoW, photoH);
          bCtx.restore();
        }
        curY += rows * (photoH + gridGap);
      }

      // Footer: contact left, QR right
      const footerY = BH - PAD - 150;
      bCtx.textAlign = "left";
      bCtx.textBaseline = "top";
      bCtx.font = "28px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#000000";
      bCtx.letterSpacing = "0px";
      let fTextY = footerY;
      bCtx.fillText("team@examodels.com", PAD, fTextY);
      fTextY += 36;
      if (model.instagram_name) {
        bCtx.fillText(`@${model.instagram_name}`, PAD, fTextY);
        fTextY += 36;
      }
      if (model.username) {
        bCtx.fillText(`examodels.com/${model.username}`, PAD, fTextY);
      }

      // QR code
      const QRCode = (await import("qrcode")).default;
      const profileUrl = `https://www.examodels.com/${model.username || ""}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 300, margin: 1 });
      const qrImg = await loadImg(qrDataUrl);
      const qrSize = 150;
      bCtx.drawImage(qrImg, BW - PAD - qrSize, footerY, qrSize, qrSize);

      // Small delay so both downloads trigger
      await new Promise((r) => setTimeout(r, 500));
      downloadCanvas(bCanvas, `${filePrefix}-CompCard-Back.jpg`);

      toast.success("Comp card images downloaded!");
    } catch (error) {
      console.error("JPEG export error:", error);
      toast.error("Failed to generate images. Please try again.");
    } finally {
      setExportingJpeg(false);
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
        <div className="flex gap-2">
          <Button
            onClick={handleExportJPEG}
            disabled={exportingJpeg || selectedIds.length === 0}
            variant="outline"
          >
            {exportingJpeg ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ImageDown className="mr-2 h-4 w-4" />
                Download JPEG
              </>
            )}
          </Button>
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
          {process.env.NEXT_PUBLIC_PRINT_PICKUP_ENABLED === "true" && (
            <Button
              onClick={() => setPrintDialogOpen(true)}
              disabled={selectedIds.length === 0}
              variant="outline"
              className="border-violet-500/40 hover:border-violet-500/70 text-violet-300"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print &amp; Pick Up
            </Button>
          )}
        </div>
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
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          {selectedIds.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border hover:border-pink-500/50 rounded-lg p-6 flex flex-col items-center gap-2 transition-colors group"
            >
              <Upload className="h-6 w-6 text-muted-foreground group-hover:text-pink-500 transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-pink-500 transition-colors">
                Upload from device
              </span>
              <span className="text-xs text-muted-foreground">
                JPG, PNG, or WebP — {MAX_PHOTOS - selectedIds.length} slot{MAX_PHOTOS - selectedIds.length === 1 ? "" : "s"} remaining
              </span>
            </button>
          )}

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
                  <div
                    ref={heroRef}
                    className="bg-black aspect-[5.5/8.5] relative select-none touch-none overflow-hidden"
                    style={{ cursor: previewUrls.length > 0 ? "grab" : undefined }}
                  >
                    {/* Hero photo full-bleed */}
                    {previewUrls.length > 0 ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrls[0].url}
                          alt="Hero"
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{
                            objectPosition: `${heroPos.x}% ${heroPos.y}%`,
                            transform: heroZoom > 1 ? `scale(${heroZoom})` : undefined,
                            transformOrigin: `${heroPos.x}% ${heroPos.y}%`,
                          }}
                          draggable={false}
                        />
                        {/* Reposition hint */}
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 pointer-events-none">
                          <Move className="h-3 w-3 text-white/80" />
                          <span className="text-[10px] text-white/80">Drag to reposition</span>
                        </div>
                        {/* Logo at top center */}
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-7 z-10 pointer-events-none">
                          <Image
                            src="/exa-models-logo-white.png"
                            alt="EXA Models"
                            width={120}
                            height={40}
                            className="h-8 w-auto"
                          />
                        </div>
                        {/* Name at bottom */}
                        {model.first_name && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-6 text-center pointer-events-none">
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
              {/* Zoom slider */}
              {previewUrls.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <ZoomIn className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min={100}
                    max={200}
                    value={Math.round(heroZoom * 100)}
                    onChange={(e) => setHeroZoom(Number(e.target.value) / 100)}
                    className="w-full h-1.5 accent-pink-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right shrink-0">
                    {Math.round(heroZoom * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* ── BACK PREVIEW ── */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Back</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-white p-5 aspect-[5.5/8.5] flex flex-col justify-between">
                    {/* Top section: Logo + Name + Measurements + Photos */}
                    <div>
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
                    <div className="pt-3 mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] text-black mb-0.5">
                          team@examodels.com
                        </p>
                        {model.instagram_name && (
                          <div className="flex items-center gap-1 mb-0.5">
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5">
                              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                              <circle cx="12" cy="12" r="5" />
                              <circle cx="17.5" cy="6.5" r="1.5" fill="black" stroke="none" />
                            </svg>
                            <p className="text-[9px] text-black">
                              {model.instagram_name}
                            </p>
                          </div>
                        )}
                        {model.username && (
                          <p className="text-[9px] text-black">
                            examodels.com/{model.username}
                          </p>
                        )}
                      </div>
                      {qrCodePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrCodePreview} alt="QR" className="w-14 h-14 rounded" />
                      ) : (
                        <div className="w-14 h-14 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                          <span className="text-[5px] text-gray-400">QR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export buttons (mobile) */}
          <div className="mt-4 lg:hidden flex flex-col gap-2">
            <Button
              onClick={handleExportJPEG}
              disabled={exportingJpeg || selectedIds.length === 0}
              variant="outline"
              className="w-full"
            >
              {exportingJpeg ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <ImageDown className="mr-2 h-4 w-4" />
                  Download JPEG
                </>
              )}
            </Button>
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
            {process.env.NEXT_PUBLIC_PRINT_PICKUP_ENABLED === "true" && (
              <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 p-4">
                <p className="font-semibold text-sm text-white flex items-center gap-1.5 mb-1">
                  <Printer className="h-4 w-4 text-violet-400" />
                  Print &amp; Pick Up — Miami Swim Week
                </p>
                <p className="text-xs text-zinc-400 mb-3">Professional cardstock · Pick up at EXA HQ Miami · $3/card</p>
                <Button
                  onClick={() => setPrintDialogOpen(true)}
                  disabled={selectedIds.length === 0}
                  className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600"
                >
                  Order Printed Cards
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {process.env.NEXT_PUBLIC_PRINT_PICKUP_ENABLED === "true" && (
        <PrintOrderDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          email={userEmail}
          firstName={model?.first_name || ""}
          lastName={model?.last_name || ""}
          phone=""
          onGeneratePdf={generatePdfBase64}
        />
      )}
    </div>
  );
}
