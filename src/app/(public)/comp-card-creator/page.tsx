"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Loader2,
  Image as ImageIcon,
  FileText,
  Upload,
  X,
  Move,
  ZoomIn,
  ImageDown,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cropToPosition,
  fileToBase64,
  isAcceptedImage,
  toBase64,
} from "@/lib/comp-card-utils";
import PrintOrderDialog from "@/components/comp-card/PrintOrderDialog";

interface UploadedPhoto {
  id: string;
  dataUrl: string;
}

const MAX_PHOTOS = 5;
const PHOTO_LABELS = [
  "Front",
  "Back Top Left",
  "Back Top Right",
  "Back Bottom Left",
  "Back Bottom Right",
];

export default function FreeCompCardPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [height, setHeight] = useState("");
  const [bust, setBust] = useState("");
  const [waist, setWaist] = useState("");
  const [hips, setHips] = useState("");
  const [eyeColor, setEyeColor] = useState("");
  const [hairColor, setHairColor] = useState("");
  const [dressSize, setDressSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [instagramName, setInstagramName] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Photo state
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Hero drag/zoom state
  const [heroPos, setHeroPos] = useState({ x: 50, y: 50 });
  const [heroZoom, setHeroZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 50, posY: 50 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportingJpeg, setExportingJpeg] = useState(false);

  // Track whether we've already silently captured the email this session
  const [emailCaptured, setEmailCaptured] = useState(false);

  // Print order state
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Build model data object from form
  const model = {
    first_name: firstName || null,
    last_name: lastName || null,
    username: null,
    height: height || null,
    bust: bust || null,
    waist: waist || null,
    hips: hips || null,
    eye_color: eyeColor || null,
    hair_color: hairColor || null,
    dress_size: dressSize || null,
    shoe_size: shoeSize || null,
    instagram_name: instagramName || null,
    city: null,
    state: null,
  };

  const fullName =
    firstName || lastName
      ? [firstName, lastName].filter(Boolean).join(" ")
      : "Your Name";

  const measurements = [
    { label: "Height", value: height },
    { label: "Bust", value: bust },
    { label: "Waist", value: waist },
    { label: "Hips", value: hips },
    { label: "Eyes", value: eyeColor },
    { label: "Hair", value: hairColor },
    { label: "Dress", value: dressSize },
    { label: "Shoes", value: shoeSize },
  ].filter((m) => m.value);

  // Photo selection
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

  // Hero positioning
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!heroRef.current) return;
    heroRef.current.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, posX: heroPos.x, posY: heroPos.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragStart.current.x) / rect.width) * 100;
    const dy = ((e.clientY - dragStart.current.y) / rect.height) * 100;
    setHeroPos({
      x: Math.max(0, Math.min(100, dragStart.current.posX - dx)),
      y: Math.max(0, Math.min(100, dragStart.current.posY - dy)),
    });
  };

  const handlePointerUp = () => setDragging(false);

  // File upload
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
      const id = `upload-${Date.now()}-${i}`;
      setUploadedPhotos((prev) => [...prev, { id, dataUrl }]);
      setSelectedIds((prev) => {
        if (prev.length >= MAX_PHOTOS) return prev;
        return [...prev, id];
      });
    }

    if (files.length > filesToProcess) {
      toast.error(
        `Only ${filesToProcess} photo${filesToProcess === 1 ? "" : "s"} added — ${MAX_PHOTOS} max`
      );
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeUploadedPhoto = (id: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== id));
    setSelectedIds((prev) => prev.filter((p) => p !== id));
  };

  // Start export — silently capture email from contact field, then export
  const startExport = (type: "pdf" | "jpeg") => {
    if (selectedIds.length === 0) {
      toast.error("Upload and select at least one photo");
      return;
    }
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    if (!contactEmail.trim()) {
      toast.error("Please enter your email in the Contact section");
      return;
    }

    if (!emailCaptured) {
      // Silently capture all model info in the background — don't block the download
      fetch("/api/comp-card-creator/capture-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail.trim(),
          first_name: firstName || "Model",
          last_name: lastName || undefined,
          phone: phoneNumber || undefined,
          instagram: instagramName || undefined,
          website: website || undefined,
          height: height || undefined,
          bust: bust || undefined,
          waist: waist || undefined,
          hips: hips || undefined,
          eye_color: eyeColor || undefined,
          hair_color: hairColor || undefined,
          dress_size: dressSize || undefined,
          shoe_size: shoeSize || undefined,
          export_type: type,
        }),
      }).catch(() => {});
      setEmailCaptured(true);
    }

    if (type === "pdf") doExportPDF();
    else doExportJPEG();
  };

  // Build photo base64 array from selected uploaded photos
  const buildPhotoBase64 = async (): Promise<string[]> => {
    const photoBase64: string[] = [];
    for (let idx = 0; idx < selectedIds.length; idx++) {
      const id = selectedIds[idx];
      const uploaded = uploadedPhotos.find((p) => p.id === id);
      let b64 = uploaded?.dataUrl || "";

      // Crop hero photo
      if (idx === 0 && b64) {
        b64 = await cropToPosition(b64, heroPos.x, heroPos.y, heroZoom);
      }

      if (b64) photoBase64.push(b64);
    }
    return photoBase64;
  };

  // Generate PDF and return as base64 string (for print order upload)
  const generatePdfBase64 = async (): Promise<string> => {
    const photoBase64 = await buildPhotoBase64();
    const { pdf } = await import("@react-pdf/renderer");
    const { default: CompCardPDF } = await import(
      "@/components/comp-card/CompCardPDF"
    );
    const frontLogoBase64 = await toBase64("/exa-models-logo-white.png");
    const contactInfo = {
      email: contactEmail || undefined,
      phone: phoneNumber || undefined,
      instagram: instagramName || undefined,
      website: website || undefined,
    };
    const blob = await pdf(
      CompCardPDF({ model, photos: photoBase64, frontLogoUrl: frontLogoBase64, contactInfo })
    ).toBlob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1]); // Strip data:application/pdf;base64, prefix
      };
      reader.onerror = () => reject(new Error("Failed to read PDF"));
      reader.readAsDataURL(blob);
    });
  };

  const startPrintOrder = () => {
    if (selectedIds.length === 0) {
      toast.error("Upload and select at least one photo");
      return;
    }
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }
    setPrintDialogOpen(true);
  };

  const doExportPDF = async () => {
    setExporting(true);
    try {
      const photoBase64 = await buildPhotoBase64();

      const { pdf } = await import("@react-pdf/renderer");
      const { default: CompCardPDF } = await import(
        "@/components/comp-card/CompCardPDF"
      );

      const frontLogoBase64 = await toBase64("/exa-models-logo-white.png");
      const contactInfo = {
        email: contactEmail || undefined,
        phone: phoneNumber || undefined,
        instagram: instagramName || undefined,
        website: website || undefined,
      };

      const blob = await pdf(
        CompCardPDF({ model, photos: photoBase64, frontLogoUrl: frontLogoBase64, contactInfo })
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const name = firstName || "Model";
      link.download = `${name}${lastName ? `-${lastName}` : ""}-CompCard.pdf`;
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

  const doExportJPEG = async () => {
    setExportingJpeg(true);
    try {
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

      const photoBase64 = await buildPhotoBase64();
      const name = firstName || "Model";
      const filePrefix = `${name}${lastName ? `-${lastName}` : ""}`;

      // ── FRONT CARD ── (1100 x 1700 = 5.5" x 8.5" at 200 DPI)
      const FW = 1100;
      const FH = 1700;
      const frontCanvas = document.createElement("canvas");
      frontCanvas.width = FW;
      frontCanvas.height = FH;
      const fCtx = frontCanvas.getContext("2d")!;

      fCtx.fillStyle = "#000000";
      fCtx.fillRect(0, 0, FW, FH);

      if (photoBase64[0]) {
        const heroImg = await loadImg(photoBase64[0]);
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
      const logoW = 510;
      const logoH = Math.round(logoW * (frontLogoImg.naturalHeight / frontLogoImg.naturalWidth));
      fCtx.drawImage(frontLogoImg, (FW - logoW) / 2, 155, logoW, logoH);

      // First name at bottom
      if (firstName) {
        fCtx.font = "bold 220px Helvetica, Arial, sans-serif";
        fCtx.fillStyle = "#ffffff";
        fCtx.textAlign = "center";
        fCtx.textBaseline = "bottom";
        fCtx.letterSpacing = "4px";
        fCtx.fillText(firstName.toUpperCase(), FW / 2, FH - 80);
      }

      downloadCanvas(frontCanvas, `${filePrefix}-CompCard-Front.jpg`);

      // ── BACK CARD ──
      const BW = 1100;
      const BH = 1700;
      const PAD = 55;
      const bCanvas = document.createElement("canvas");
      bCanvas.width = BW;
      bCanvas.height = BH;
      const bCtx = bCanvas.getContext("2d")!;

      bCtx.fillStyle = "#ffffff";
      bCtx.fillRect(0, 0, BW, BH);

      let curY = PAD;

      // Full name
      const fullNameStr = [firstName, lastName].filter(Boolean).join(" ") || "Model";
      bCtx.font = "bold 39px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#111111";
      bCtx.textAlign = "center";
      bCtx.textBaseline = "top";
      bCtx.letterSpacing = "5px";
      bCtx.fillText(fullNameStr.toUpperCase(), BW / 2, curY);
      curY += 48;

      // Measurements
      const meas: { label: string; value: string }[] = [];
      if (height) meas.push({ label: "HEIGHT", value: height });
      if (bust) meas.push({ label: "BUST", value: bust });
      if (waist) meas.push({ label: "WAIST", value: waist });
      if (hips) meas.push({ label: "HIPS", value: hips });
      if (eyeColor) meas.push({ label: "EYES", value: eyeColor });
      if (hairColor) meas.push({ label: "HAIR", value: hairColor });
      if (dressSize) meas.push({ label: "DRESS", value: dressSize });
      if (shoeSize) meas.push({ label: "SHOES", value: shoeSize });

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
        const photoH = 611;
        const rows = Math.ceil(backPhotos.length / 2);

        for (let i = 0; i < backPhotos.length; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const px = PAD + col * (photoW + gridGap);
          const py = curY + row * (photoH + gridGap);

          const pImg = await loadImg(backPhotos[i]);
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

          bCtx.save();
          bCtx.beginPath();
          bCtx.roundRect(px, py, photoW, photoH, 8);
          bCtx.clip();
          bCtx.drawImage(pImg, sx, sy, sw, sh, px, py, photoW, photoH);
          bCtx.restore();
        }
        curY += rows * (photoH + gridGap);
      }

      // Footer: contact info (no QR on public version)
      const footerY = BH - PAD - 150;
      bCtx.textAlign = "left";
      bCtx.textBaseline = "top";
      bCtx.font = "28px Helvetica, Arial, sans-serif";
      bCtx.fillStyle = "#000000";
      bCtx.letterSpacing = "0px";
      let fTextY = footerY;
      if (contactEmail) {
        bCtx.fillText(contactEmail, PAD, fTextY);
        fTextY += 36;
      }
      if (phoneNumber) {
        bCtx.fillText(phoneNumber, PAD, fTextY);
        fTextY += 36;
      }
      if (instagramName) {
        bCtx.fillText(`@${instagramName}`, PAD, fTextY);
        fTextY += 36;
      }
      if (website) {
        bCtx.fillText(website, PAD, fTextY);
      }

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

  // Get preview URL for a selected uploaded photo
  const getPreviewUrl = (id: string): string => {
    const uploaded = uploadedPhotos.find((p) => p.id === id);
    return uploaded?.dataUrl || "";
  };

  const previewUrls = selectedIds.map((id) => ({
    id,
    url: getPreviewUrl(id),
  }));

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8">
      {/* Page logo */}
      <div className="mb-6">
        <Image
          src="/exa-models-logo-white.png"
          alt="EXA Models"
          width={120}
          height={38}
          className="h-8 w-auto"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Comp Card Creator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Free to download · Print &amp; pick up in Miami
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button
            onClick={() => startExport("jpeg")}
            disabled={exportingJpeg || selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()}
            variant="outline"
          >
            {exportingJpeg ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><ImageDown className="mr-2 h-4 w-4" />Download JPEG</>
            )}
          </Button>
          <Button
            onClick={() => startExport("pdf")}
            disabled={exporting || selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()}
            className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            {exporting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</>
            ) : (
              <><Download className="mr-2 h-4 w-4" />Download PDF</>
            )}
          </Button>
          <Button
            onClick={startPrintOrder}
            disabled={selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()}
            variant="outline"
            className="border-violet-500/40 hover:border-violet-500/70 text-violet-300"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print &amp; Pick Up
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* ── LEFT: Photos + Form ── */}
        <div>
          {/* Photos — first, matching dashboard */}
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos
            <span className="text-sm font-normal text-muted-foreground">
              ({selectedIds.length}/{MAX_PHOTOS})
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            First is the front cover, next 4 go on the back
          </p>

          {uploadedPhotos.length > 0 && (
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
                      <div className={cn(
                        "absolute inset-0 transition-opacity",
                        isSelected ? "bg-black/30" : "bg-black/0 group-hover:bg-black/20"
                      )} />
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
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          {selectedIds.length < MAX_PHOTOS && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-border hover:border-pink-500/50 rounded-lg p-6 flex flex-col items-center gap-2 transition-colors group mb-6"
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

          {/* Your Info */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Your Info</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card className="mb-4">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Measurements</h3>
                <span className="text-xs text-muted-foreground">e.g. 5&apos;9&quot; · 34&quot; · 26&quot; · 36&quot;</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1"><Label htmlFor="height">Height</Label><Input id="height" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={`5'9"`} /></div>
                <div className="space-y-1"><Label htmlFor="bust">Bust</Label><Input id="bust" inputMode="numeric" value={bust} onChange={(e) => setBust(e.target.value)} placeholder={`34"`} /></div>
                <div className="space-y-1"><Label htmlFor="waist">Waist</Label><Input id="waist" inputMode="numeric" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder={`26"`} /></div>
                <div className="space-y-1"><Label htmlFor="hips">Hips</Label><Input id="hips" inputMode="numeric" value={hips} onChange={(e) => setHips(e.target.value)} placeholder={`36"`} /></div>
                <div className="space-y-1"><Label htmlFor="eyeColor">Eye Color</Label><Input id="eyeColor" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} placeholder="Brown" /></div>
                <div className="space-y-1"><Label htmlFor="hairColor">Hair Color</Label><Input id="hairColor" value={hairColor} onChange={(e) => setHairColor(e.target.value)} placeholder="Black" /></div>
                <div className="space-y-1"><Label htmlFor="dressSize">Dress Size</Label><Input id="dressSize" value={dressSize} onChange={(e) => setDressSize(e.target.value)} placeholder="4" /></div>
                <div className="space-y-1"><Label htmlFor="shoeSize">Shoe Size</Label><Input id="shoeSize" value={shoeSize} onChange={(e) => setShoeSize(e.target.value)} placeholder="8" /></div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Contact (shown on card)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label htmlFor="contactEmail">Email *</Label><Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="you@example.com" /></div>
                <div className="space-y-1"><Label htmlFor="phone">Phone</Label><Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567" /></div>
                <div className="space-y-1"><Label htmlFor="instagram">Instagram</Label><Input id="instagram" value={instagramName} onChange={(e) => setInstagramName(e.target.value.replace(/^@/, ""))} placeholder="yourhandle" /></div>
                <div className="space-y-1"><Label htmlFor="website">Website</Label><Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="yoursite.com" /></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT: Live Preview ── */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview
          </h2>

          <div className="space-y-4">
            {/* Front Preview — draggable */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Front</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div
                    ref={heroRef}
                    className="bg-black aspect-[5.5/8.5] relative select-none touch-none overflow-hidden"
                    style={{ cursor: previewUrls.length > 0 ? "grab" : undefined }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
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
                        {/* Logo at top center */}
                        <div className="absolute top-0 left-0 right-0 flex justify-center pt-10 z-10 pointer-events-none">
                          <Image
                            src="/exa-models-logo-white.png"
                            alt="EXA Models"
                            width={130}
                            height={42}
                            className="h-9 w-auto"
                          />
                        </div>
                        {/* Reposition hint */}
                        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 pointer-events-none">
                          <Move className="h-3 w-3 text-white/80" />
                          <span className="text-[10px] text-white/80">Drag to reposition</span>
                        </div>
                        {/* Name at bottom */}
                        {firstName && (
                          <div className="absolute bottom-0 left-0 right-0 px-3 pb-6 text-center pointer-events-none">
                            <p className="text-white text-6xl sm:text-7xl font-black uppercase tracking-[0.03em] leading-tight">
                              {firstName}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-500 text-xs">Select a photo for the front</p>
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

            {/* Back Preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Back</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-white p-5 aspect-[5.5/8.5] flex flex-col justify-between">
                    <div>
                      <p className="text-lg font-bold text-black uppercase tracking-[0.15em] text-center mb-2">
                        {fullName}
                      </p>
                      {measurements.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mb-2">
                          {measurements.map((m) => (
                            <div key={m.label} className="text-center">
                              <p className="text-[6px] text-gray-400 uppercase tracking-wider">{m.label}</p>
                              <p className="text-[9px] font-bold text-black">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {previewUrls.length > 1 ? (
                        <div className="grid grid-cols-2 gap-1 flex-1 min-h-0">
                          {previewUrls.slice(1, 5).map((p) => (
                            <div key={p.id} className="relative aspect-[3/4] rounded overflow-hidden bg-gray-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt="Back" className="absolute inset-0 w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="aspect-[4/3] rounded bg-gray-100 flex items-center justify-center">
                          <p className="text-gray-400 text-xs">Select photos</p>
                        </div>
                      )}
                    </div>
                    {/* Footer */}
                    <div className="pt-3 mt-2">
                      {contactEmail && <p className="text-[9px] text-black mb-0.5">{contactEmail}</p>}
                      {phoneNumber && <p className="text-[9px] text-black mb-0.5">{phoneNumber}</p>}
                      {instagramName && <p className="text-[9px] text-black mb-0.5">@{instagramName}</p>}
                      {website && <p className="text-[9px] text-black">{website}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Mobile buttons */}
          <div className="mt-4 sm:hidden flex flex-col gap-2">
            <Button onClick={() => startExport("jpeg")} disabled={exportingJpeg || selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()} variant="outline" className="w-full">
              {exportingJpeg ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><ImageDown className="mr-2 h-4 w-4" />Download JPEG</>}
            </Button>
            <Button onClick={() => startExport("pdf")} disabled={exporting || selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()} className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
              {exporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Download className="mr-2 h-4 w-4" />Download PDF</>}
            </Button>
            <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 p-4">
              <p className="font-semibold text-sm text-white flex items-center gap-1.5 mb-1">
                <Printer className="h-4 w-4 text-violet-400" />
                Print &amp; Pick Up — Miami Swim Week
              </p>
              <p className="text-xs text-zinc-400 mb-3">Professional cardstock · Pick up at EXA HQ · $3/card</p>
              <Button onClick={startPrintOrder} disabled={selectedIds.length === 0 || !firstName.trim() || !contactEmail.trim()} className="w-full bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600">
                Order Printed Cards
              </Button>
            </div>
          </div>
        </div>
      </div>


      {/* Print order dialog */}
      <PrintOrderDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        email={contactEmail}
        firstName={firstName}
        lastName={lastName}
        phone={phoneNumber}
        onGeneratePdf={generatePdfBase64}
      />
    </div>
  );
}
