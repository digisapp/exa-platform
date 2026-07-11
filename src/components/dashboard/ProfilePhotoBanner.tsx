"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { Camera, Star, Loader2, ImageOff, Check, ExternalLink, Heart, Eye } from "lucide-react";
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
  followerCount: number;
  views30d: number;
}

const compactNumber = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProfilePhotoBanner({
  username,
  displayName,
  profilePhotoUrl: initialProfilePhoto,
  heroPhotoUrl: initialHeroPhoto,
  portfolioPhotos: initialPortfolio,
  followerCount,
  views30d,
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
      <section
        className={cn(
          "rounded-2xl border backdrop-blur-sm overflow-hidden",
          profilePhotoUrl
            ? "border-white/10 bg-gradient-to-br from-pink-500/[0.08] via-white/[0.03] to-violet-500/[0.08]"
            : "border-amber-500/40 bg-gradient-to-br from-amber-500/[0.10] via-white/[0.03] to-pink-500/[0.06]"
        )}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-5 sm:gap-7">
            {/* ── Photo cluster: portrait with avatar overlapping its corner ── */}
            <div className="relative shrink-0 mb-2 mr-4">
              {/* Portrait (hero) — opens portfolio picker */}
              <button
                onClick={() => setPickerOpen(true)}
                className="relative group block w-28 h-[144px] sm:w-32 sm:h-[164px] rounded-xl overflow-hidden bg-gradient-to-br from-[#1a0033] to-[#2d1b69] ring-1 ring-white/10 hover:ring-pink-500/50 transition-all"
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
                {/* Always-visible edit chip (no hover on mobile) */}
                <span className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white">
                  <Camera className="h-3 w-3" /> Edit
                </span>
                <div className="absolute inset-0 bg-black/50 hidden sm:flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>

              {/* Avatar — overlaps the portrait's bottom-right corner */}
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
                className="absolute -bottom-3 -right-6 group rounded-full shadow-[0_0_20px_rgba(236,72,153,0.35)]"
              >
                {profilePhotoUrl ? (
                  <Image
                    src={profilePhotoUrl}
                    alt="Avatar"
                    width={80}
                    height={80}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover ring-2 ring-pink-500/60 group-hover:ring-pink-500 transition-all"
                  />
                ) : (
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white text-lg font-bold ring-2 ring-amber-400/70">
                    {initials}
                  </div>
                )}
                {/* Always-visible camera badge */}
                <span
                  className={cn(
                    "absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-[#120a24]",
                    profilePhotoUrl ? "bg-pink-500" : "bg-amber-500 animate-pulse"
                  )}
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3 w-3 text-white animate-spin" />
                  ) : (
                    <Camera className="h-3 w-3 text-white" />
                  )}
                </span>
              </button>
            </div>

            {/* ── Identity + stats (or the invisible-on-EXA blocking state) ── */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                  {displayName}
                </h2>
                {!profilePhotoUrl && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 uppercase tracking-wide">
                    Invisible on EXA
                  </span>
                )}
              </div>

              <Link
                href={`/${username}`}
                className="inline-flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition-colors truncate max-w-full"
              >
                examodels.com/{username}
                <ExternalLink className="h-3 w-3 shrink-0" />
              </Link>

              {profilePhotoUrl ? (
                <>
                  {/* Live stats */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5">
                    <span className="flex items-center gap-1.5 text-sm text-white/80">
                      <Heart className="h-3.5 w-3.5 text-pink-400 fill-pink-400/60" />
                      <span className="font-semibold text-white">
                        {compactNumber.format(followerCount)}
                      </span>
                      <span className="text-white/50">followers</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-white/80">
                      <Eye className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="font-semibold text-white">
                        {compactNumber.format(views30d)}
                      </span>
                      <span className="text-white/50">views · 30d</span>
                    </span>
                  </div>

                  {/* What each photo is for */}
                  <div className="mt-2.5 space-y-0.5 text-[11px] leading-relaxed text-white/45">
                    <p>
                      <span className="font-medium text-white/70">Portrait</span> — the
                      large photo on your public profile
                    </p>
                    <p>
                      <span className="font-medium text-white/70">Avatar</span> — shown
                      in chats, search &amp; model cards
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p className="mt-2.5 text-sm text-white/70 leading-relaxed">
                    Fans and brands can&apos;t find you yet — models appear on
                    Explore, in gigs, and in search only after adding a profile
                    photo.
                  </p>
                  <Button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="mt-3 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold shadow-[0_0_16px_rgba(245,158,11,0.35)]"
                  >
                    {uploadingAvatar ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="mr-2 h-4 w-4" />
                    )}
                    Add profile photo — takes 30 seconds
                  </Button>
                </>
              )}
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
                <Link href="/studio">Go to Studio</Link>
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
