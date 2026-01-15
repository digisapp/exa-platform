"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Camera, Video, Lock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { PremiumContentGrid } from "@/components/content/PremiumContentGrid";

interface MediaAsset {
  id: string;
  photo_url?: string;
  url?: string;
  asset_type: string;
  title?: string | null;
}

interface ProfileContentTabsProps {
  photos: MediaAsset[];
  videos: MediaAsset[];
  premiumContentCount: number;
  modelId: string;
  coinBalance: number;
  isOwner: boolean;
}

export function ProfileContentTabs({
  photos,
  videos,
  premiumContentCount,
  modelId,
  coinBalance,
  isOwner,
}: ProfileContentTabsProps) {
  const [activeTab, setActiveTab] = useState<"photos" | "videos" | "ppv">("photos");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxType, setLightboxType] = useState<"photos" | "videos">("photos");
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  // Touch handling refs
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const lightboxRef = useRef<HTMLDivElement>(null);

  const currentItems = lightboxType === "photos" ? photos : videos;

  const openLightbox = (index: number, type: "photos" | "videos") => {
    setLightboxIndex(index);
    setLightboxType(type);
    setLightboxOpen(true);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  // Handle body scroll lock when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [lightboxOpen]);

  const goToPrevious = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection("right");
    setTimeout(() => {
      setLightboxIndex((prev) => (prev > 0 ? prev - 1 : currentItems.length - 1));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating, currentItems.length]);

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection("left");
    setTimeout(() => {
      setLightboxIndex((prev) => (prev < currentItems.length - 1 ? prev + 1 : 0));
      setSlideDirection(null);
      setIsAnimating(false);
    }, 200);
  }, [isAnimating, currentItems.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeLightbox();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrevious, goToNext]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        // Swiped left - go next
        goToNext();
      } else {
        // Swiped right - go previous
        goToPrevious();
      }
    }
  };

  // Preload adjacent images
  useEffect(() => {
    if (!lightboxOpen || lightboxType !== "photos") return;

    const preloadImage = (index: number) => {
      if (index >= 0 && index < currentItems.length) {
        const img = new Image();
        img.src = currentItems[index]?.photo_url || currentItems[index]?.url || "";
      }
    };

    preloadImage(lightboxIndex - 1);
    preloadImage(lightboxIndex + 1);
  }, [lightboxOpen, lightboxIndex, lightboxType, currentItems]);

  const hasPhotos = photos && photos.length > 0;
  const hasVideos = videos && videos.length > 0;

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div className="flex justify-center gap-1 mb-4">
        <button
          onClick={() => setActiveTab("photos")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "photos"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80"
          )}
        >
          <Camera className="h-4 w-4" />
          Photos
          {hasPhotos && (
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
              {photos.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("videos")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
            activeTab === "videos"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/80"
          )}
        >
          <Video className="h-4 w-4" />
          Videos
          {hasVideos && (
            <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
              {videos.length}
            </span>
          )}
        </button>
        {premiumContentCount > 0 && (
          <button
            onClick={() => setActiveTab("ppv")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
              activeTab === "ppv"
                ? "bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-pink-400"
                : "text-pink-400/70 hover:text-pink-400"
            )}
          >
            <Lock className="h-4 w-4" />
            PPV
            <span className="text-xs bg-pink-500/20 px-1.5 py-0.5 rounded-full">
              {premiumContentCount}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      {activeTab === "photos" && (
        <div>
          {hasPhotos ? (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className={cn(
                    "aspect-square relative group rounded-xl overflow-hidden cursor-pointer",
                    "ring-1 ring-white/5 hover:ring-white/20",
                    "transition-all duration-300 ease-out",
                    "hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/10"
                  )}
                  onClick={() => openLightbox(index, "photos")}
                >
                  <img
                    src={photo.photo_url || photo.url}
                    alt={photo.title || ""}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Title overlay on hover */}
                  {photo.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <p className="text-white text-xs font-medium truncate drop-shadow-lg">{photo.title}</p>
                    </div>
                  )}
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No photos yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "videos" && (
        <div>
          {hasVideos ? (
            <div className="grid grid-cols-2 gap-3">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className={cn(
                    "aspect-video relative group rounded-xl overflow-hidden cursor-pointer",
                    "ring-1 ring-white/5 hover:ring-white/20",
                    "transition-all duration-300 ease-out",
                    "hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10"
                  )}
                  onClick={() => openLightbox(index, "videos")}
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center",
                      "bg-white/10 backdrop-blur-sm",
                      "border border-white/20",
                      "opacity-0 group-hover:opacity-100",
                      "scale-75 group-hover:scale-100",
                      "transition-all duration-300 ease-out"
                    )}>
                      <Video className="h-6 w-6 text-white ml-0.5" />
                    </div>
                  </div>
                  {/* Title overlay on hover */}
                  {video.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      <p className="text-white text-sm font-medium truncate drop-shadow-lg">{video.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No videos yet</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "ppv" && premiumContentCount > 0 && (
        <div>
          <PremiumContentGrid
            modelId={modelId}
            initialCoinBalance={coinBalance}
            isOwner={isOwner}
          />
        </div>
      )}

      {/* Luxury Lightbox Modal */}
      {lightboxOpen && currentItems.length > 0 && (
        <div
          ref={lightboxRef}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-black/90 backdrop-blur-xl",
            "animate-in fade-in duration-300"
          )}
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ambient glow effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-full blur-[120px] opacity-50" />
          </div>

          {/* Close button */}
          <button
            onClick={closeLightbox}
            className={cn(
              "absolute top-6 right-6 p-3 rounded-full z-20",
              "bg-white/5 hover:bg-white/15 backdrop-blur-md",
              "border border-white/10 hover:border-white/20",
              "transition-all duration-300 ease-out",
              "group"
            )}
          >
            <X className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" />
          </button>

          {/* Navigation arrows */}
          {currentItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className={cn(
                  "absolute left-4 md:left-8 p-3 md:p-4 rounded-full z-20",
                  "bg-white/5 hover:bg-white/15 backdrop-blur-md",
                  "border border-white/10 hover:border-white/20",
                  "transition-all duration-300 ease-out",
                  "hover:scale-110 active:scale-95",
                  "group"
                )}
              >
                <ChevronLeft className="h-6 w-6 md:h-8 md:w-8 text-white/70 group-hover:text-white transition-colors" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className={cn(
                  "absolute right-4 md:right-8 p-3 md:p-4 rounded-full z-20",
                  "bg-white/5 hover:bg-white/15 backdrop-blur-md",
                  "border border-white/10 hover:border-white/20",
                  "transition-all duration-300 ease-out",
                  "hover:scale-110 active:scale-95",
                  "group"
                )}
              >
                <ChevronRight className="h-6 w-6 md:h-8 md:w-8 text-white/70 group-hover:text-white transition-colors" />
              </button>
            </>
          )}

          {/* Main content area */}
          <div
            className={cn(
              "relative max-w-[92vw] flex flex-col items-center justify-center",
              "pt-16 pb-20 md:pt-8 md:pb-8", // Add padding for close button and swipe hint
              "transition-all duration-200 ease-out",
              slideDirection === "left" && "opacity-0 translate-x-8",
              slideDirection === "right" && "opacity-0 -translate-x-8",
              !slideDirection && "opacity-100 translate-x-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media container with subtle border glow */}
            <div className={cn(
              "relative rounded-2xl overflow-hidden",
              "shadow-2xl shadow-black/50",
              "ring-1 ring-white/10"
            )}>
              {lightboxType === "photos" ? (
                <img
                  src={currentItems[lightboxIndex]?.photo_url || currentItems[lightboxIndex]?.url}
                  alt={currentItems[lightboxIndex]?.title || ""}
                  className="max-w-[90vw] max-h-[70vh] md:max-h-[75vh] object-contain"
                  draggable={false}
                />
              ) : (
                <video
                  key={currentItems[lightboxIndex]?.id}
                  src={currentItems[lightboxIndex]?.url}
                  controls
                  autoPlay
                  playsInline
                  className="max-w-[90vw] max-h-[70vh] md:max-h-[75vh] object-contain"
                />
              )}
            </div>

            {/* Title and counter */}
            <div className={cn(
              "mt-6 text-center",
              "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100"
            )}>
              {currentItems[lightboxIndex]?.title && (
                <h3 className="text-white text-lg md:text-xl font-medium mb-2 tracking-wide">
                  {currentItems[lightboxIndex].title}
                </h3>
              )}

              {/* Elegant counter with dots */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5">
                  {currentItems.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isAnimating) {
                          setLightboxIndex(idx);
                        }
                      }}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all duration-300",
                        idx === lightboxIndex
                          ? "bg-white w-6"
                          : "bg-white/30 hover:bg-white/50"
                      )}
                    />
                  ))}
                </div>
                <span className="text-white/40 text-sm font-light ml-2">
                  {lightboxIndex + 1} of {currentItems.length}
                </span>
              </div>
            </div>
          </div>

          {/* Swipe hint for mobile - shows briefly */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:hidden animate-pulse">
            <p className="text-white/30 text-xs tracking-widest uppercase">
              Swipe to navigate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
