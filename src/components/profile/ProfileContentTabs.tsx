"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Camera, Video, Lock, X, Play } from "lucide-react";
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
  const [selectedItem, setSelectedItem] = useState<MediaAsset | null>(null);
  const [selectedType, setSelectedType] = useState<"photo" | "video">("photo");
  const [videoPlaying, setVideoPlaying] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStartY = useRef(0);

  const openLightbox = (item: MediaAsset, type: "photo" | "video") => {
    setSelectedItem(item);
    setSelectedType(type);
    setLightboxOpen(true);
    setVideoPlaying(false);
  };

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setSelectedItem(null);
    setVideoPlaying(false);
  }, []);

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

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

  // Keyboard - ESC to close
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox]);

  // Swipe down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diffY = touchStartY.current - touchEndY;

    // Swipe down to close
    if (diffY < -80) {
      closeLightbox();
    }
  };

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
                  onClick={() => openLightbox(photo, "photo")}
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
                  onClick={() => openLightbox(video, "video")}
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

      {/* Lightbox Modal - Single Item View */}
      {lightboxOpen && selectedItem && (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-black/90 backdrop-blur-xl",
            "animate-in fade-in duration-300"
          )}
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
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

          {/* Main content area */}
          <div
            className={cn(
              "relative max-w-[92vw] flex flex-col items-center justify-center",
              "pt-16 pb-20 md:pt-8 md:pb-8"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Media container */}
            <div className={cn(
              "relative rounded-2xl overflow-hidden",
              "shadow-2xl shadow-black/50",
              "ring-1 ring-white/10"
            )}>
              {selectedType === "photo" ? (
                <img
                  src={selectedItem.photo_url || selectedItem.url}
                  alt={selectedItem.title || ""}
                  className="max-w-[90vw] max-h-[70vh] md:max-h-[80vh] object-contain"
                  draggable={false}
                />
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    key={selectedItem.id}
                    src={selectedItem.url}
                    controls={videoPlaying}
                    playsInline
                    className="max-w-[90vw] max-h-[70vh] md:max-h-[80vh] object-contain"
                    onEnded={() => setVideoPlaying(false)}
                  />
                  {/* Play button overlay */}
                  {!videoPlaying && (
                    <button
                      onClick={handlePlayVideo}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        "bg-black/30 backdrop-blur-sm",
                        "transition-all duration-300",
                        "group"
                      )}
                    >
                      <div className={cn(
                        "w-20 h-20 md:w-24 md:h-24 rounded-full",
                        "bg-white/10 backdrop-blur-md",
                        "border border-white/30",
                        "flex items-center justify-center",
                        "transition-all duration-300",
                        "group-hover:scale-110 group-hover:bg-white/20",
                        "group-active:scale-95"
                      )}>
                        <Play className="h-8 w-8 md:h-10 md:w-10 text-white ml-1" fill="white" />
                      </div>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Title */}
            {selectedItem.title && (
              <div className={cn(
                "mt-6 text-center",
                "animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100"
              )}>
                <h3 className="text-white text-lg md:text-xl font-medium tracking-wide">
                  {selectedItem.title}
                </h3>
              </div>
            )}
          </div>

          {/* Swipe hint for mobile */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 md:hidden">
            <div className="flex flex-col items-center gap-1">
              <p className="text-white/40 text-xs tracking-wide">
                Swipe down to close
              </p>
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
