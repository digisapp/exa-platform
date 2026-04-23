"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, Star, Loader2, ImageOff, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageCropper } from "@/components/upload/ImageCropper";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PortfolioPhoto {
  id: string;
  url: string;
  width: number | null;
  height: number | null;
  is_primary: boolean;
}

interface ProfilePhotoBannerProps {
  username: string;
  displayName: string;
  profilePhotoUrl: string | null;
  /** The resolved hero portrait URL (from getHeroPortrait) */
  heroPhotoUrl: string | null;
  portfolioPhotos: PortfolioPhoto[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfilePhotoBanner({
  username,
  displayName,
  profilePhotoUrl: initialProfilePhoto,
  heroPhotoUrl: initialHeroPhoto,
  portfolioPhotos: initialPortfolio,
}: ProfilePhotoBannerProps) {
  // Avatar state
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(initialProfilePhoto);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Hero/portrait state
  const [heroPhotoUrl, setHeroPhotoUrl] = useState(initialHeroPhoto);
  const [portfolioPhotos, setPortfolioPhotos] = useState(initialPortfolio);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState<string | null>(null);

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // ─── Avatar upload flow ──────────────────────────────────────────────

  const handleAvatarSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast.error("Please select a valid image (JPEG, PNG, or WebP)");
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        toast.error("Image must be less than 15MB");
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      setImageToCrop(imageUrl);
      setCropperOpen(true);
    },
    []
  );

  const handleCropComplete = useCallback(
    async (croppedBlob: Blob) => {
      setCropperOpen(false);
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
        setImageToCrop(null);
      }

      setUploadingAvatar(true);
      try {
        const file = new File([croppedBlob], "profile-photo.jpg", {
          type: "image/jpeg",
        });
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "avatar");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Upload failed");

        setProfilePhotoUrl(data.url);
        toast.success("Profile picture updated!");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploadingAvatar(false);
        if (avatarInputRef.current) avatarInputRef.current.value = "";
      }
    },
    [imageToCrop]
  );

  const handleCropperClose = useCallback(() => {
    setCropperOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  }, [imageToCrop]);

  // ─── Portrait picker flow ────────────────────────────────────────────

  const handleSetPrimary = useCallback(
    async (contentItemId: string) => {
      setSettingPrimary(contentItemId);
      try {
        const response = await fetch("/api/portfolio/set-primary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentItemId }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to set portrait");
        }

        // Update local state
        const selected = portfolioPhotos.find((p) => p.id === contentItemId);
        if (selected) {
          setHeroPhotoUrl(selected.url);
          setPortfolioPhotos((prev) =>
            prev.map((p) => ({
              ...p,
              is_primary: p.id === contentItemId,
            }))
          );
        }

        toast.success("Profile portrait updated!");
        setPickerOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      } finally {
        setSettingPrimary(null);
      }
    },
    [portfolioPhotos]
  );

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <>
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        <div className="p-5 sm:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
              Profile Pictures
            </h2>
            <Link
              href={`/${username}`}
              className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
            >
              View profile <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Portrait + Avatar side by side */}
          <div className="flex items-center gap-4">
            {/* ── Portrait (hero) preview ── */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => setPickerOpen(true)}
                className="relative group shrink-0 w-24 h-[120px] sm:w-32 sm:h-[160px] rounded-xl overflow-hidden bg-gradient-to-br from-[#1a0033] to-[#2d1b69] ring-1 ring-white/10 hover:ring-pink-500/50 transition-all"
              >
                {heroPhotoUrl ? (
                  <Image
                    src={heroPhotoUrl}
                    alt="Portrait"
                    fill
                    sizes="128px"
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-white/30">
                      {initials}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
              <span className="text-[10px] text-white/40 font-medium">
                Portrait
              </span>
            </div>

            {/* ── Circle avatar ── */}
            <div className="flex flex-col items-center gap-1.5">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="relative group shrink-0"
              >
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt="Avatar"
                    width={96}
                    height={96}
                    className="w-[96px] h-[96px] rounded-full object-cover ring-2 ring-pink-500/40 group-hover:ring-pink-500 transition-all"
                  />
                ) : (
                  <div className="w-[96px] h-[96px] rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-xl font-bold ring-2 ring-white/10">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 text-white animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </div>
              </button>
              <span className="text-[10px] text-white/40 font-medium">
                Avatar
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Avatar cropper (reuses existing ImageCropper) ── */}
      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onClose={handleCropperClose}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          circularCrop
        />
      )}

      {/* ── Portrait picker dialog ── */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose Profile Portrait</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pick a photo from your portfolio to feature as your profile
              portrait. This is the large image visitors see on your profile
              page.
            </p>
          </DialogHeader>

          {portfolioPhotos.length === 0 ? (
            <div className="text-center py-10">
              <ImageOff className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                No portfolio photos yet
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1 mb-4">
                Upload photos to your content portfolio first, then come back
                here to set your portrait.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href="/content">Go to Content</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {portfolioPhotos.map((photo) => {
                const isCurrent = photo.is_primary;
                return (
                  <button
                    key={photo.id}
                    onClick={() => !isCurrent && handleSetPrimary(photo.id)}
                    disabled={settingPrimary === photo.id}
                    className={cn(
                      "relative aspect-[4/5] rounded-xl overflow-hidden bg-muted group transition-all",
                      isCurrent
                        ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-background"
                        : "ring-1 ring-white/10 hover:ring-pink-500/50"
                    )}
                  >
                    <Image
                      src={photo.url}
                      alt="Portfolio photo"
                      fill
                      sizes="(max-width: 640px) 45vw, 150px"
                      className="object-cover object-top"
                    />

                    {/* Current badge */}
                    {isCurrent && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 bg-pink-500 text-white text-[10px] font-semibold rounded-full flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Current
                      </div>
                    )}

                    {/* Tap/hover overlay — always visible on mobile, hover on desktop */}
                    {!isCurrent && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-2 flex items-end justify-center sm:absolute sm:inset-0 sm:bg-black/40 sm:opacity-0 sm:group-hover:opacity-100 sm:pt-0 sm:pb-0 sm:items-center transition-opacity">
                        {settingPrimary === photo.id ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                            <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            <span className="text-[10px] text-white font-medium">
                              Set as Portrait
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
