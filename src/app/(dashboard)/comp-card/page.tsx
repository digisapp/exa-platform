"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Poppins } from "next/font/google";
import localFont from "next/font/local";

const poppinsBlack = Poppins({ weight: "900", subsets: ["latin"], display: "swap" });
const glacialIndifference = localFont({
  src: "../../../../public/fonts/GlacialIndifference-Regular.woff2",
  display: "swap",
});
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
  Move,
  ZoomIn,
  ImageDown,
  Printer,
  Share2,
} from "lucide-react";
import PrintOrderDialog from "@/components/comp-card/PrintOrderDialog";
import { MiamiDigitalsBanner } from "@/components/comp-card/MiamiDigitalsBanner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatInches } from "@/lib/measurements";
import {
  cropToPosition,
  photoToBase64,
  isAcceptedImage,
} from "@/lib/comp-card-utils";
import { PRINT_PICKUP_EVENT, isPrintPickupWindowOpen } from "@/lib/comp-card-event";

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

const MAX_PHOTOS = 5;

export default function CompCardPage() {
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [model, setModel] = useState<ModelData | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingJpeg, setExportingJpeg] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [logoVariant, setLogoVariant] = useState<"white" | "black" | "none">("white");
  const [nameFontScale, setNameFontScale] = useState(1.0);
  const [nameMode, setNameMode] = useState<"real" | "username">("real");

  const printWindowOpen = isPrintPickupWindowOpen();

  // Hero photo repositioning (object-position %) and zoom
  const [heroPos, setHeroPos] = useState({ x: 50, y: 50 });
  const [heroZoom, setHeroZoom] = useState(1);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [repositionActive, setRepositionActive] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, startX: 50, startY: 50 });
  const prevHeroId = useRef<string | null>(null);

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  // On touch devices the hero stays scroll-transparent until "Tap to adjust"
  const repositionEnabled = !isCoarsePointer || repositionActive;
  const heroPosRef = useRef(heroPos);
  heroPosRef.current = heroPos;
  const repositionEnabledRef = useRef(repositionEnabled);
  repositionEnabledRef.current = repositionEnabled;

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
      if (!repositionEnabledRef.current) return;
      if ((e.target as HTMLElement).closest("button")) return;
      dragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        startX: heroPosRef.current.x,
        startY: heroPosRef.current.y,
      };
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
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
  }, [loading]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) return;
      setUserEmail(user.email || "");

      const { data: modelData, error: modelError } = await supabase
        .from("models")
        .select(
          "id, first_name, last_name, username, height, bust, waist, hips, eye_color, hair_color, dress_size, shoe_size, instagram_name, city, state, profile_photo_url"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (modelError) throw modelError;
      if (!modelData) return;

      setModel(modelData);
      if (!modelData.first_name && modelData.username) {
        setNameMode("username");
      }

      // Generate QR code for preview
      try {
        const QRCode = (await import("qrcode")).default;
        const profileUrl = `https://www.examodels.com/${modelData.username || ""}`;
        const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 200, margin: 1 });
        setQrCodePreview(qrDataUrl);
      } catch {
        // QR code preview is non-critical
      }

      // Fetch portfolio photos via the library API — content_items.media_url
      // is no longer column-granted to client roles (Phase B1 lockdown); the
      // route resolves public URLs server-side for the caller's own library.
      const libraryRes = await fetch("/api/content/library");
      if (!libraryRes.ok) throw new Error(`library fetch failed: ${libraryRes.status}`);
      const { portfolio } = await libraryRes.json();

      const allPhotos = (portfolio || [])
        .filter((p: any) => p.mediaType === "image")
        .slice(0, 50)
        .map((p: any) => ({
          id: p.id, url: p.url, photo_url: p.url, is_primary: false, display_order: 0,
        }));
      setPhotos(allPhotos);

      // Pre-select the first MAX_PHOTOS portfolio photos
      if (allPhotos.length > 0) {
        const initial = allPhotos.slice(0, Math.min(MAX_PHOTOS, allPhotos.length));
        setSelectedIds(initial.map((p: any) => p.id));
      }
    } catch (error) {
      console.error("Comp card load error:", error);
      setLoadError(true);
      toast.error("Failed to load your comp card data");
    } finally {
      setLoading(false);
    }
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

  // Upload one file via signed URL → /api/upload/complete persists it as a portfolio
  // content_item, so it survives refresh and shows up alongside existing photos.
  // HEIC/HEIF is converted to JPEG server-side by /api/upload/complete.
  const uploadOne = async (file: File): Promise<PortfolioPhoto | null> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const fileType =
      file.type ||
      (ext === "heic" ? "image/heic" : ext === "heif" ? "image/heif" : "");

    const signedRes = await fetch("/api/upload/signed-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        fileType,
        fileSize: file.size,
        title: null,
      }),
    });
    const signed = await signedRes.json().catch(() => ({}));
    if (!signedRes.ok) throw new Error(signed?.error || "Failed to get upload URL");

    const putRes = await fetch(signed.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": fileType },
      body: file,
    });
    if (!putRes.ok) throw new Error("Direct upload to storage failed");

    const completeRes = await fetch("/api/upload/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signed.storagePath,
        bucket: signed.bucket,
        uploadMeta: signed.uploadMeta,
      }),
    });
    const complete = await completeRes.json().catch(() => ({}));
    if (!completeRes.ok) throw new Error(complete?.error || "Failed to complete upload");
    if (!complete.contentItemId || !complete.url) {
      throw new Error("Upload finished but the photo could not be added. Please refresh and try again.");
    }

    return {
      id: complete.contentItemId,
      url: complete.url,
      photo_url: complete.url,
      is_primary: false,
      display_order: 0,
    };
  };

  // Handle file upload from device
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - selectedIds.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed. Deselect a photo first.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    let added = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!isAcceptedImage(file)) {
          toast.error(`${file.name} is not a supported image`);
          continue;
        }

        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 20MB)`);
          continue;
        }

        try {
          const newPhoto = await uploadOne(file);
          if (!newPhoto) continue;
          setPhotos((prev) => [newPhoto, ...prev]);
          // Auto-select if there's still room
          setSelectedIds((prev) =>
            prev.length >= MAX_PHOTOS ? prev : [...prev, newPhoto.id]
          );
          added++;
        } catch (err) {
          toast.error(
            err instanceof Error ? err.message : `Failed to upload ${file.name}`
          );
        }
      }

      if (added > 0) {
        toast.success(`Uploaded ${added} photo${added === 1 ? "" : "s"}`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const logoColor = logoVariant === "black" ? "#000000" : logoVariant === "white" ? "#ffffff" : null;
  const nameColor = logoVariant === "black" ? "#000000" : "#ffffff";

  // What gets printed on the card: real name (default) or @username
  const displayModel: ModelData | null = model
    ? nameMode === "username" && model.username
      ? { ...model, first_name: `@${model.username}`, last_name: null }
      : model
    : null;
  const frontName = displayModel?.first_name || "";
  const filePrefix =
    nameMode === "username" && model?.username
      ? model.username
      : `${model?.first_name || "Model"}${model?.last_name ? `-${model.last_name}` : ""}`;

  const previewNameFontPx = frontName
    ? Math.round(Math.min(68, Math.round(360 / Math.max(frontName.length, 1) / 0.62)) * nameFontScale)
    : 68;

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Fire-and-forget: store a copy of the exported card in the private
  // comp-cards bucket so admins can view it on /admin/comp-card-leads.
  const saveCardCopy = (kind: "pdf" | "jpeg", blobs: Record<string, Blob>) => {
    (async () => {
      const res = await fetch("/api/comp-card-creator/save-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      if (!res.ok) return;
      const { uploads } = await res.json();
      await Promise.all(
        Object.entries(blobs).map(async ([key, blob]) => {
          const target = uploads?.[key];
          if (!target?.signedUrl) return;
          await fetch(target.signedUrl, {
            method: "PUT",
            headers: { "Content-Type": blob.type },
            body: blob,
          });
        })
      );
    })().catch(() => {});
  };

  const generatePdfBlob = async (): Promise<Blob> => {
    const dm = displayModel;
    if (!dm || selectedIds.length === 0) throw new Error("No photos selected");
    const photoBase64: string[] = [];
    for (let idx = 0; idx < selectedIds.length; idx++) {
      const id = selectedIds[idx];
      const photo = photos.find((p) => p.id === id);
      let b64 = await photoToBase64(photo?.photo_url || photo?.url || "");
      if (idx === 0 && b64) b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
      if (b64) photoBase64.push(b64);
    }
    const QRCode = (await import("qrcode")).default;
    const profileUrl = `https://www.examodels.com/${dm.username || ""}`;
    const qrCodeBase64 = await QRCode.toDataURL(profileUrl, { width: 200, margin: 1 });
    const { pdf } = await import("@react-pdf/renderer");
    const { default: CompCardPDF } = await import("@/components/comp-card/CompCardPDF");
    return pdf(
      CompCardPDF({ model: dm, photos: photoBase64, logoColor, nameColor, nameFontScale, qrCodeUrl: qrCodeBase64 })
    ).toBlob();
  };

  const handleExportPDF = async () => {
    if (!model || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    fetch("/api/comp-card-creator/track-export", { method: "POST" }).catch(() => {});
    setExporting(true);
    try {
      const blob = await generatePdfBlob();
      saveCardCopy("pdf", { pdf: blob });
      downloadBlob(blob, `${filePrefix}-CompCard.pdf`);
      toast.success("Comp card downloaded!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate comp card. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!model || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    fetch("/api/comp-card-creator/track-export", { method: "POST" }).catch(() => {});
    setSharing(true);
    try {
      const blob = await generatePdfBlob();
      saveCardCopy("pdf", { pdf: blob });
      const file = new File([blob], `${filePrefix}-CompCard.pdf`, {
        type: "application/pdf",
      });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `${filePrefix} — Comp Card` });
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }
      downloadBlob(blob, `${filePrefix}-CompCard.pdf`);
      toast.success("Comp card downloaded — attach it anywhere!");
    } catch (error) {
      console.error("Share error:", error);
      toast.error("Failed to generate comp card. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleExportJPEG = async () => {
    const dm = displayModel;
    if (!dm || selectedIds.length === 0) {
      toast.error("Select at least one photo");
      return;
    }

    fetch("/api/comp-card-creator/track-export", { method: "POST" }).catch(() => {});
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

      const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
        new Promise((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Failed to encode image"))),
            "image/jpeg",
            0.95
          );
        });

      // Convert selected photos to base64 (same as PDF flow)
      const photoBase64: string[] = [];
      for (let idx = 0; idx < selectedIds.length; idx++) {
        const id = selectedIds[idx];
        const photo = photos.find((p) => p.id === id);
        let b64 = await photoToBase64(photo?.photo_url || photo?.url || "");
        if (idx === 0 && b64) {
          b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
        }
        if (b64) photoBase64.push(b64);
      }

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

      // Logo text at top center
      if (logoColor) {
        if (!document.fonts.check("1em GlacialIndifference")) {
          const giFont = new FontFace("GlacialIndifference", `url(${window.location.origin}/fonts/GlacialIndifference-Regular.woff2)`);
          await Promise.race([
            giFont.load().then((f) => document.fonts.add(f)),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Font load timeout")), 8000)),
          ]);
        }
        fCtx.font = "99px 'GlacialIndifference', sans-serif";
        fCtx.fillStyle = logoColor;
        fCtx.textAlign = "center";
        fCtx.textBaseline = "top";
        fCtx.letterSpacing = "-1px";
        fCtx.fillText("exa models", FW / 2, 80);
      }

      // First name at bottom
      if (dm.first_name) {
        if (!document.fonts.check("900 1em PoppinsBlack")) {
          const poppinsFont = new FontFace("PoppinsBlack", `url(${window.location.origin}/fonts/Poppins-Black.ttf)`);
          await Promise.race([
            poppinsFont.load().then((f) => document.fonts.add(f)),
            new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Font load timeout")), 8000)),
          ]);
        }
        const nameLen = dm.first_name.length;
        const baseCanvasFontSize = nameLen <= 4 ? 230 : nameLen <= 5 ? 205 : nameLen <= 6 ? 184 : nameLen <= 7 ? 162 : nameLen <= 8 ? 143 : nameLen <= 9 ? 127 : nameLen <= 10 ? 113 : nameLen <= 11 ? 100 : nameLen <= 12 ? 89 : 78;
        const canvasFontSize = Math.round(baseCanvasFontSize * nameFontScale);
        const canvasLetterSpacing = nameLen <= 6 ? 6 : nameLen <= 9 ? 4 : 2;
        fCtx.font = `900 ${canvasFontSize}px 'PoppinsBlack', sans-serif`;
        fCtx.fillStyle = nameColor;
        fCtx.textAlign = "center";
        fCtx.textBaseline = "bottom";
        fCtx.letterSpacing = `${canvasLetterSpacing}px`;
        fCtx.fillText(dm.first_name.toUpperCase(), FW / 2, FH - 80);
      }

      const frontBlob = await canvasToBlob(frontCanvas);

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
      const fullNameStr = [dm.first_name, dm.last_name].filter(Boolean).join(" ") || "Model";
      bCtx.font = "bold 39px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#111111";
      bCtx.textAlign = "center";
      bCtx.textBaseline = "top";
      bCtx.letterSpacing = "2px";
      bCtx.fillText(fullNameStr.toUpperCase(), BW / 2, curY);
      curY += 48;

      // Measurements
      const meas: { label: string; value: string }[] = [];
      if (dm.height) meas.push({ label: "HEIGHT", value: dm.height });
      if (dm.bust) meas.push({ label: "BUST", value: formatInches(dm.bust)! });
      if (dm.waist) meas.push({ label: "WAIST", value: formatInches(dm.waist)! });
      if (dm.hips) meas.push({ label: "HIPS", value: formatInches(dm.hips)! });
      if (dm.eye_color) meas.push({ label: "EYES", value: dm.eye_color });
      if (dm.hair_color) meas.push({ label: "HAIR", value: dm.hair_color });
      if (dm.dress_size) meas.push({ label: "DRESS", value: dm.dress_size });
      if (dm.shoe_size) meas.push({ label: "SHOES", value: dm.shoe_size });

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

      // Footer: contact (left) | EXA logo (center) | QR (right)
      const footerY = BH - PAD - 150;
      bCtx.textAlign = "left";
      bCtx.textBaseline = "top";
      bCtx.font = "22px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#000000";
      bCtx.letterSpacing = "0px";
      let fTextY = footerY;
      if (dm.username) {
        bCtx.fillText(`examodels.com/${dm.username}`, PAD, fTextY);
        fTextY += 32;
      }
      if (dm.instagram_name) {
        bCtx.fillText(`@${dm.instagram_name}`, PAD, fTextY);
        fTextY += 32;
      }
      bCtx.fillText("team@examodels.com", PAD, fTextY);

      // Center: EXA Models text logo
      if (!document.fonts.check("1em GlacialIndifference")) {
        const giFont = new FontFace("GlacialIndifference", `url(${window.location.origin}/fonts/GlacialIndifference-Regular.woff2)`);
        await Promise.race([
          giFont.load().then((f) => document.fonts.add(f)),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Font load timeout")), 8000)),
        ]);
      }
      bCtx.font = "92px 'GlacialIndifference', sans-serif";
      bCtx.fillStyle = "#000000";
      bCtx.textAlign = "center";
      bCtx.textBaseline = "middle";
      bCtx.letterSpacing = "-1px";
      bCtx.fillText("exa models", BW / 2, footerY + 75);

      // Right: QR code
      const QRCode = (await import("qrcode")).default;
      const profileUrl = `https://www.examodels.com/${dm.username || ""}`;
      const qrDataUrl = await QRCode.toDataURL(profileUrl, { width: 300, margin: 1 });
      const qrImg = await loadImg(qrDataUrl);
      const qrSize = 150;
      bCtx.drawImage(qrImg, BW - PAD - qrSize, footerY, qrSize, qrSize);

      const backBlob = await canvasToBlob(bCanvas);
      saveCardCopy("jpeg", { front: frontBlob, back: backBlob });
      const files = [
        new File([frontBlob], `${filePrefix}-CompCard-Front.jpg`, { type: "image/jpeg" }),
        new File([backBlob], `${filePrefix}-CompCard-Back.jpg`, { type: "image/jpeg" }),
      ];

      // iOS Safari drops the second of two programmatic downloads — share both
      // files as one action when the browser supports it.
      if (navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: `${filePrefix} — Comp Card` });
          toast.success("Comp card shared!");
          return;
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
        }
      }

      downloadBlob(frontBlob, files[0].name);
      await new Promise((r) => setTimeout(r, 300));
      downloadBlob(backBlob, files[1].name);

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
        { label: "Bust", value: formatInches(model.bust) },
        { label: "Waist", value: formatInches(model.waist) },
        { label: "Hips", value: formatInches(model.hips) },
        { label: "Eyes", value: model.eye_color },
        { label: "Hair", value: model.hair_color },
        { label: "Dress", value: model.dress_size },
        { label: "Shoes", value: model.shoe_size },
      ].filter((m) => m.value)
    : [];

  const fullName =
    displayModel && (displayModel.first_name || displayModel.last_name)
      ? [displayModel.first_name, displayModel.last_name].filter(Boolean).join(" ")
      : "Model";

  // Get preview image URL for a selected ID
  const getPreviewUrl = (id: string): string => {
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

  if (loadError) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Comp Card</h1>
        <p className="text-muted-foreground mb-6">
          Something went wrong loading your comp card data.
        </p>
        <Button onClick={fetchData} variant="outline">
          Try Again
        </Button>
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
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* ───── Hero header ───── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-white/10 p-5 md:p-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,105,180,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(0,191,255,0.12) 100%)",
        }}
      >
        <div className="pointer-events-none absolute -top-24 -left-24 w-64 h-64 rounded-full bg-pink-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-64 h-64 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="relative">
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Model kit</p>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            <span className="exa-gradient-text">Comp Card</span>
          </h1>
          <p className="text-xs md:text-sm text-white/60 mt-1">
            Select {MAX_PHOTOS} photos — first is the front cover, next 4 go on the back.
          </p>
        </div>
      </section>

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
                          ? "border-pink-500 ring-2 ring-pink-500/40 shadow-[0_0_20px_rgba(236,72,153,0.5)]"
                          : "border-transparent hover:border-pink-500/40 hover:shadow-[0_0_12px_rgba(236,72,153,0.25)]"
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

          {/* Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          {selectedIds.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-border hover:border-pink-500/50 rounded-lg p-6 flex flex-col items-center gap-2 transition-colors group disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 text-pink-500 animate-spin" />
                  <span className="text-sm text-pink-500">Uploading…</span>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-pink-500 transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-pink-500 transition-colors">
                    Upload from device
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG, WebP, or HEIC — {MAX_PHOTOS - selectedIds.length} slot{MAX_PHOTOS - selectedIds.length === 1 ? "" : "s"} remaining
                  </span>
                </>
              )}
            </button>
          )}

          {photos.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground text-center mt-4">
              Upload photos or{" "}
              <Link
                href="/studio"
                className="text-pink-500 hover:text-pink-400"
              >
                add portfolio photos
              </Link>{" "}
              to create your comp card.
            </p>
          )}

          {/* Measurements */}
          {!hasMeasurements ? (
            <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">
                    Missing measurements
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your height, bust, waist, and hips so your comp card is complete.
                  </p>
                </div>
              </div>
              <Link
                href="/settings#measurements"
                className="block mt-3 text-center text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
              >
                Add Measurements
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">Measurements</p>
                <Link
                  href="/settings#measurements"
                  className="shrink-0 text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  Edit Measurements
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {measurements.map((m) => (
                  <div key={m.label} className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{m.label}</p>
                    <p className="text-sm font-semibold text-white">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Live Preview */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Preview
            </h2>
            {/* Logo variant toggle */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground mr-1">Logo</span>
              {(["white", "black", "none"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setLogoVariant(v)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    logoVariant === v
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {v === "none" ? "Off" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Name size slider */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Name Size</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={nameFontScale}
              onChange={(e) => setNameFontScale(Number(e.target.value))}
              className="flex-1 accent-pink-500"
            />
            <button
              onClick={() => setNameFontScale(1.0)}
              className="text-xs text-zinc-500 hover:text-zinc-300 whitespace-nowrap"
            >
              Reset
            </button>
          </div>

          {/* Display name toggle */}
          {model.username && (
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-xs text-muted-foreground mr-1">Display name</span>
              {(
                [
                  ["real", "Real name"],
                  ["username", `@${model.username}`],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setNameMode(v)}
                  className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                    nameMode === v
                      ? "bg-white text-black border-white"
                      : "bg-transparent text-zinc-400 border-zinc-600 hover:border-zinc-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Missing printed name notice */}
          {!frontName && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                No name will print on your card.{" "}
                <Link href="/settings" className="text-amber-500 hover:text-amber-400 underline">
                  Add your first name in Settings
                </Link>
                {model.username ? " or switch to @username above." : "."}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* ── FRONT PREVIEW ── */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Front</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    ref={heroRef}
                    className={cn(
                      "bg-black aspect-[5.5/8.5] relative select-none overflow-hidden",
                      repositionEnabled && previewUrls.length > 0 && "touch-none",
                      isCoarsePointer && repositionActive && "ring-2 ring-pink-500/60"
                    )}
                    style={{ cursor: previewUrls.length > 0 && repositionEnabled ? "grab" : undefined }}
                  >
                    {/* Hero photo full-bleed */}
                    {previewUrls.length > 0 ? (
                      <>
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
                        {/* Reposition hint / tap-to-adjust toggle */}
                        {isCoarsePointer ? (
                          repositionActive ? (
                            <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                              <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1 pointer-events-none">
                                <Move className="h-3 w-3 text-pink-400" />
                                <span className="text-[10px] text-white/90">Drag to move · slider to zoom</span>
                              </div>
                              <button
                                onClick={() => setRepositionActive(false)}
                                className="bg-pink-500 hover:bg-pink-600 text-white text-[10px] font-semibold rounded-full px-2.5 py-1 transition-colors"
                              >
                                Done
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRepositionActive(true)}
                              className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 hover:bg-black/70 transition-colors"
                            >
                              <Move className="h-3 w-3 text-white/80" />
                              <span className="text-[10px] text-white/80">Tap to adjust</span>
                            </button>
                          )
                        ) : (
                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 pointer-events-none">
                            <Move className="h-3 w-3 text-white/80" />
                            <span className="text-[10px] text-white/80">Drag to reposition</span>
                          </div>
                        )}
                        {/* Logo text at top center */}
                        {logoColor && (
                          <div className="absolute top-0 left-0 right-0 flex justify-center pt-6 z-10 pointer-events-none">
                            <span
                              className={`${glacialIndifference.className} text-4xl md:text-6xl leading-none tracking-[-0.02em] lowercase`}
                              style={{ color: logoColor }}
                            >
                              exa models
                            </span>
                          </div>
                        )}
                        {/* Name at bottom */}
                        {frontName && (
                          <div className="absolute bottom-0 left-0 right-0 px-2 pb-6 text-center pointer-events-none">
                            <p
                              className={`${poppinsBlack.className} uppercase leading-none whitespace-nowrap`}
                              style={{
                                color: nameColor,
                                fontSize: `${previewNameFontPx}px`,
                                letterSpacing: frontName.length > 9 ? "0.02em" : "0.04em",
                              }}
                            >
                              {frontName}
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
                      <p className="text-lg font-bold text-black uppercase tracking-[0.05em] text-center mb-2">
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

                    {/* Footer: contact (left) | EXA logo (center) | QR (right) */}
                    <div className="pt-2 mt-1 flex items-center gap-1">
                      {/* Left: url, instagram, email */}
                      <div className="flex-1 min-w-0">
                        {model.username && (
                          <p className="text-[7px] text-black truncate mb-0.5">examodels.com/{model.username}</p>
                        )}
                        {model.instagram_name && (
                          <div className="flex items-center gap-0.5 mb-0.5">
                            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.5" className="shrink-0">
                              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                              <circle cx="12" cy="12" r="5" />
                              <circle cx="17.5" cy="6.5" r="1.5" fill="black" stroke="none" />
                            </svg>
                            <p className="text-[7px] text-black truncate">{model.instagram_name}</p>
                          </div>
                        )}
                        <p className="text-[7px] text-black truncate">team@examodels.com</p>
                      </div>
                      {/* Center: EXA logo text */}
                      <div className="shrink-0 px-1">
                        <span className={`${glacialIndifference.className} text-sm leading-none tracking-[-0.02em] lowercase text-black`}>
                          exa models
                        </span>
                      </div>
                      {/* Right: QR */}
                      {qrCodePreview ? (
                        <img src={qrCodePreview} alt="QR" className="w-12 h-12 rounded shrink-0" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 border border-gray-200 rounded flex items-center justify-center shrink-0">
                          <span className="text-[5px] text-gray-400">QR</span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Export buttons */}
          <div className="mt-4 flex flex-col gap-2">
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
            <Button
              onClick={handleShare}
              disabled={sharing || selectedIds.length === 0}
              variant="outline"
              className="w-full"
            >
              {sharing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Comp Card
                </>
              )}
            </Button>
            {printWindowOpen && (
              <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 p-4">
                <p className="font-semibold text-sm text-white flex items-center gap-1.5 mb-1">
                  <Printer className="h-4 w-4 text-violet-400" />
                  Print &amp; Pick Up — {PRINT_PICKUP_EVENT.name}
                </p>
                <p className="text-xs text-zinc-400 mb-3">Professional cardstock · Pick up at {PRINT_PICKUP_EVENT.pickupLocation} · $3/card</p>
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

      {/* Digitals Promo (self-hides once the event window closes) */}
      {printWindowOpen && (
        <div className="mt-8">
          <MiamiDigitalsBanner />
        </div>
      )}

      <PrintOrderDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        email={userEmail}
        firstName={model?.first_name || ""}
        lastName={model?.last_name || ""}
        phone=""
        onGeneratePdf={generatePdfBlob}
        returnPath="/comp-card"
      />
    </div>
  );
}
