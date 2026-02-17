"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download,
  Loader2,
  Image as ImageIcon,
  Upload,
  X,
  Move,
  ZoomIn,
  ImageDown,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  cropToPosition,
  fileToBase64,
} from "@/lib/comp-card-utils";
import EmailCaptureDialog from "@/components/comp-card/EmailCaptureDialog";

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

  // Email capture state
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [pendingExportType, setPendingExportType] = useState<"pdf" | "jpeg" | null>(null);
  const [emailCaptured, setEmailCaptured] = useState(false);

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
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 20MB)`);
        continue;
      }

      const dataUrl = await fileToBase64(file);
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

  // Start export flow (email capture first, then actual export)
  const startExport = (type: "pdf" | "jpeg") => {
    if (selectedIds.length === 0) {
      toast.error("Upload and select at least one photo");
      return;
    }
    if (!firstName.trim()) {
      toast.error("Please enter your first name");
      return;
    }

    if (emailCaptured) {
      // Already captured email in this session — skip dialog
      if (type === "pdf") doExportPDF();
      else doExportJPEG();
    } else {
      setPendingExportType(type);
      setEmailDialogOpen(true);
    }
  };

  const handleEmailSuccess = () => {
    setEmailCaptured(true);
    if (pendingExportType === "pdf") doExportPDF();
    else if (pendingExportType === "jpeg") doExportJPEG();
    setPendingExportType(null);
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

  const doExportPDF = async () => {
    setExporting(true);
    try {
      const photoBase64 = await buildPhotoBase64();

      const { pdf } = await import("@react-pdf/renderer");
      const { default: CompCardPDF } = await import(
        "@/components/comp-card/CompCardPDF"
      );

      const contactInfo = {
        email: contactEmail || undefined,
        phone: phoneNumber || undefined,
        instagram: instagramName || undefined,
        website: website || undefined,
      };

      const blob = await pdf(
        CompCardPDF({ model, photos: photoBase64, contactInfo })
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

      // No logo on public version — just the name
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
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">Free Comp Card Maker</h1>
        <p className="text-muted-foreground">
          Create a professional model comp card in minutes. Upload your photos,
          enter your details, and download a print-ready PDF or JPEG.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
        {/* ── LEFT: Form + Photos ── */}
        <div className="space-y-6">
          {/* Name */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Your Info
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Measurements */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Measurements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="height">Height</Label>
                  <Input id="height" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={`5'9"`} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="bust">Bust</Label>
                  <Input id="bust" value={bust} onChange={(e) => setBust(e.target.value)} placeholder={`34"`} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="waist">Waist</Label>
                  <Input id="waist" value={waist} onChange={(e) => setWaist(e.target.value)} placeholder={`24"`} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hips">Hips</Label>
                  <Input id="hips" value={hips} onChange={(e) => setHips(e.target.value)} placeholder={`35"`} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="eyeColor">Eye Color</Label>
                  <Input id="eyeColor" value={eyeColor} onChange={(e) => setEyeColor(e.target.value)} placeholder="Brown" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="hairColor">Hair Color</Label>
                  <Input id="hairColor" value={hairColor} onChange={(e) => setHairColor(e.target.value)} placeholder="Black" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dressSize">Dress Size</Label>
                  <Input id="dressSize" value={dressSize} onChange={(e) => setDressSize(e.target.value)} placeholder="4" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="shoeSize">Shoe Size</Label>
                  <Input id="shoeSize" value={shoeSize} onChange={(e) => setShoeSize(e.target.value)} placeholder="8" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                Contact (shown on card)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="contactEmail">Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="instagram">Instagram</Label>
                  <Input
                    id="instagram"
                    value={instagramName}
                    onChange={(e) => setInstagramName(e.target.value.replace(/^@/, ""))}
                    placeholder="yourhandle"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yoursite.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  Photos ({selectedIds.length}/{MAX_PHOTOS})
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={selectedIds.length >= MAX_PHOTOS}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Photos
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {uploadedPhotos.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-pink-500/50 transition-colors cursor-pointer"
                >
                  <ImageIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload photos (up to 5)
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    First photo = front cover, next 4 = back grid
                  </p>
                </button>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {uploadedPhotos.map((photo) => {
                    const selIdx = getSelectionIndex(photo.id);
                    const isSelected = selIdx >= 0;
                    return (
                      <div
                        key={photo.id}
                        className={cn(
                          "relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all",
                          isSelected
                            ? "border-pink-500 ring-2 ring-pink-500/30"
                            : "border-transparent hover:border-muted-foreground/30"
                        )}
                        onClick={() => togglePhoto(photo.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.dataUrl}
                          alt="Uploaded"
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute top-1 left-1 bg-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {selIdx + 1}
                          </div>
                        )}
                        {isSelected && selIdx < PHOTO_LABELS.length && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                            {PHOTO_LABELS[selIdx]}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeUploadedPhoto(photo.id);
                          }}
                          className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    );
                  })}
                  {uploadedPhotos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-[3/4] rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center hover:border-pink-500/50 transition-colors cursor-pointer"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Hero reposition (if first photo selected) */}
          {selectedIds.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Move className="h-4 w-4" />
                  Position Front Photo
                </h3>
                <div
                  ref={heroRef}
                  className="relative aspect-[5.5/8.5] rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border border-muted-foreground/20"
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  {previewUrls[0]?.url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrls[0].url}
                        alt="Hero preview"
                        className="w-full h-full pointer-events-none select-none"
                        style={{
                          objectFit: "cover",
                          objectPosition: `${heroPos.x}% ${heroPos.y}%`,
                          transform: `scale(${heroZoom})`,
                          transformOrigin: `${heroPos.x}% ${heroPos.y}%`,
                        }}
                        draggable={false}
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="bg-black/50 text-white text-xs px-2 py-1 rounded opacity-60">
                          Drag to reposition
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="range"
                    min={100}
                    max={200}
                    value={heroZoom * 100}
                    onChange={(e) => setHeroZoom(Number(e.target.value) / 100)}
                    className="w-full accent-pink-500"
                  />
                  <span className="text-xs text-muted-foreground w-10 text-right">
                    {Math.round(heroZoom * 100)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Download buttons (desktop) */}
          <div className="hidden lg:flex gap-2">
            <Button
              onClick={() => startExport("jpeg")}
              disabled={exportingJpeg || selectedIds.length === 0 || !firstName.trim()}
              variant="outline"
              className="flex-1"
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
              onClick={() => startExport("pdf")}
              disabled={exporting || selectedIds.length === 0 || !firstName.trim()}
              className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
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

        {/* ── RIGHT: Live Preview ── */}
        <div className="w-full lg:w-[320px]">
          <p className="text-xs text-muted-foreground mb-2 hidden lg:block">
            Preview
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
            {/* Front Preview */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Front</p>
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-black aspect-[5.5/8.5] relative flex flex-col justify-between">
                    {previewUrls[0]?.url && (
                      <div className="absolute inset-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrls[0].url}
                          alt="Front"
                          className="w-full h-full object-cover"
                          style={{
                            objectPosition: `${heroPos.x}% ${heroPos.y}%`,
                            transform: `scale(${heroZoom})`,
                            transformOrigin: `${heroPos.x}% ${heroPos.y}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="relative z-10 flex flex-col justify-end h-full p-4">
                      {firstName && (
                        <p className="text-white font-bold text-2xl uppercase tracking-wider text-center drop-shadow-lg">
                          {firstName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                              <p className="text-[7px] text-gray-400 uppercase">
                                {m.label}
                              </p>
                              <p className="text-[10px] font-bold text-gray-900">
                                {m.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {previewUrls.length > 1 && (
                        <div className="grid grid-cols-2 gap-1">
                          {previewUrls.slice(1, 5).map((p) => (
                            <div
                              key={p.id}
                              className="aspect-[3/4] rounded-sm overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={p.url}
                                alt="Back"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="pt-1">
                      {contactEmail && (
                        <p className="text-[9px] text-black">{contactEmail}</p>
                      )}
                      {phoneNumber && (
                        <p className="text-[9px] text-black">{phoneNumber}</p>
                      )}
                      {instagramName && (
                        <p className="text-[9px] text-black">
                          @{instagramName}
                        </p>
                      )}
                      {website && (
                        <p className="text-[9px] text-black">{website}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Download buttons (mobile) */}
          <div className="mt-4 lg:hidden flex flex-col gap-2">
            <Button
              onClick={() => startExport("jpeg")}
              disabled={exportingJpeg || selectedIds.length === 0 || !firstName.trim()}
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
              onClick={() => startExport("pdf")}
              disabled={exporting || selectedIds.length === 0 || !firstName.trim()}
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

      {/* Join EXA CTA */}
      <div className="mt-12 text-center">
        <Card className="inline-block max-w-lg mx-auto">
          <CardContent className="p-6">
            <Sparkles className="h-8 w-8 text-pink-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">Want more visibility?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join EXA Models to get discovered by brands, apply for runway
              shows, travel trips, and campaigns.
            </p>
            <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
              <Link href="/signup">Join EXA Models — Free</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Email capture dialog */}
      <EmailCaptureDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        onSuccess={handleEmailSuccess}
        firstName={firstName}
      />
    </div>
  );
}
