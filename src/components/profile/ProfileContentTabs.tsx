"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Camera, Video, Lock, X, Play, ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { PremiumContentGrid } from "@/components/content/PremiumContentGrid";

interface MediaAsset {
  id: string;
  photo_url?: string;
  url?: string;
  asset_type: string;
  title?: string | null;
}

// Component for handling broken images
function ImageWithFallback({
  src,
  alt,
  className,
  onClick
}: {
  src?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-white/5", className)}>
        <ImageOff className="h-8 w-8 text-white/30" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
          <Camera className="h-8 w-8 text-white/20" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={cn(className, !loaded && "opacity-0")}
        onError={() => setError(true)}
        onLoad={() => setLoaded(true)}
        onClick={onClick}
      />
    </>
  );
}

// Format seconds into MM:SS or H:MM:SS
function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Component for handling broken videos
function VideoWithFallback({
  src,
  className,
  onClick,
  onDurationLoaded,
}: {
  src?: string;
  className?: string;
  onClick?: () => void;
  onDurationLoaded?: (duration: number) => void;
}) {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || error) {
    return (
      <div
        className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500/20 to-pink-500/20", className)}
        onClick={onClick}
      >
        <Video className="h-10 w-10 text-white/40" />
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/5 animate-pulse">
          <Video className="h-8 w-8 text-white/20" />
        </div>
      )}
      <video
        src={src}
        className={cn(className, !loaded && "opacity-0")}
        muted
        playsInline
        preload="metadata"
        onError={() => setError(true)}
        onLoadedMetadata={(e) => {
          setLoaded(true);
          const vid = e.currentTarget;
          if (vid.duration && onDurationLoaded) {
            onDurationLoaded(vid.duration);
          }
        }}
        onLoadedData={() => setLoaded(true)}
        onClick={onClick}
      />
    </>
  );
}

const INITIAL_PHOTOS = 12;
const INITIAL_VIDEOS = 6;
const LOAD_MORE_PHOTOS = 12;
const LOAD_MORE_VIDEOS = 6;

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
  const [photosShown, setPhotosShown] = useState(INITIAL_PHOTOS);
  const [videosShown, setVideosShown] = useState(INITIAL_VIDEOS);
  const [videoDurations, setVideoDurations] = useState<Record<string, number>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const [swipeOffset, setSwipeOffset] = useState({ x: 0, y: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const handleDurationLoaded = useCallback((videoId: string, duration: number) => {
    setVideoDurations(prev => ({ ...prev, [videoId]: duration }));
  }, []);

  // Get the current list based on selected type
  const currentList = selectedType === "photo" ? photos : videos;

  const openLightbox = (item: MediaAsset, type: "photo" | "video") => {
    const list = type === "photo" ? photos : videos;
    const index = list.findIndex(i => i.id === item.id);
    setSelectedItem(item);
    setSelectedType(type);
    setSelectedIndex(index >= 0 ? index : 0);
    setLightboxOpen(true);
    setVideoPlaying(false);
    setSwipeOffset({ x: 0, y: 0 });
    setIsClosing(false);
  };

  const closeLightbox = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setLightboxOpen(false);
      setSelectedItem(null);
      setVideoPlaying(false);
      setSwipeOffset({ x: 0, y: 0 });
      setIsClosing(false);
    }, 200);
  }, []);

  // Navigate to previous/next image
  const goToPrevious = useCallback(() => {
    if (selectedIndex > 0) {
      const newIndex = selectedIndex - 1;
      setSelectedIndex(newIndex);
      setSelectedItem(currentList[newIndex]);
      setVideoPlaying(false);
    }
  }, [selectedIndex, currentList]);

  const goToNext = useCallback(() => {
    if (selectedIndex < currentList.length - 1) {
      const newIndex = selectedIndex + 1;
      setSelectedIndex(newIndex);
      setSelectedItem(currentList[newIndex]);
      setVideoPlaying(false);
    }
  }, [selectedIndex, currentList]);

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

  // Keyboard - ESC to close, arrows to navigate
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (e.key === "ArrowLeft") {
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxOpen, closeLightbox, goToPrevious, goToNext]);

  // Touch handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    setSwipeOffset({ x: 0, y: 0 });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStart.current.x;
    const deltaY = e.touches[0].clientY - touchStart.current.y;
    setSwipeOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    const { x, y } = swipeOffset;
    const absX = Math.abs(x);
    const absY = Math.abs(y);
    const swipeThreshold = 80;

    // Check if swipe was significant enough
    if (absX > swipeThreshold || absY > swipeThreshold) {
      // Determine primary direction
      if (absX > absY) {
        // Horizontal swipe
        if (x > swipeThreshold && selectedIndex > 0) {
          // Swipe right - go to previous
          goToPrevious();
        } else if (x < -swipeThreshold && selectedIndex < currentList.length - 1) {
          // Swipe left - go to next
          goToNext();
        } else if (absX > swipeThreshold * 1.5) {
          // Strong horizontal swipe at edge - close
          closeLightbox();
        }
      } else {
        // Vertical swipe - close in any direction
        closeLightbox();
      }
    }

    setSwipeOffset({ x: 0, y: 0 });
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
            <>
              <div className="grid grid-cols-3 auto-rows-[minmax(0,1fr)] gap-2" style={{ gridAutoFlow: "dense" }}>
                {photos.slice(0, photosShown).map((photo, index) => {
                  // Every 7th photo (0, 7, 14...) is featured - spans 2 cols + 2 rows
                  const isFeatured = index % 7 === 0 && photos.length > 3;
                  return (
                    <div
                      key={photo.id}
                      className={cn(
                        "relative group rounded-xl overflow-hidden cursor-pointer",
                        "ring-1 ring-white/5 hover:ring-white/20",
                        "transition-all duration-300 ease-out",
                        "hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/10",
                        isFeatured ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
                      )}
                      onClick={() => openLightbox(photo, "photo")}
                    >
                      <ImageWithFallback
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
                  );
                })}
              </div>
              {photos.length > photosShown && (
                <button
                  onClick={() => setPhotosShown(prev => prev + LOAD_MORE_PHOTOS)}
                  className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all active:scale-[0.98]"
                >
                  Load more photos ({photos.length - photosShown} remaining)
                </button>
              )}
            </>
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
            <>
              <div className="grid grid-cols-2 gap-3">
                {videos.slice(0, videosShown).map((video) => (
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
                    <VideoWithFallback
                      src={video.url}
                      className="w-full h-full object-cover"
                      onDurationLoaded={(dur) => handleDurationLoaded(video.id, dur)}
                    />
                    {/* Gradient overlay - always show on bottom for duration badge */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center",
                        "bg-white/10 backdrop-blur-sm",
                        "border border-white/20",
                        "opacity-70 group-hover:opacity-100",
                        "scale-90 group-hover:scale-100",
                        "transition-all duration-300 ease-out"
                      )}>
                        <Play className="h-6 w-6 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    {videoDurations[video.id] && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-medium tabular-nums">
                        {formatDuration(videoDurations[video.id])}
                      </div>
                    )}
                    {/* Title overlay on hover */}
                    {video.title && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                        <p className="text-white text-sm font-medium truncate drop-shadow-lg">{video.title}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {videos.length > videosShown && (
                <button
                  onClick={() => setVideosShown(prev => prev + LOAD_MORE_VIDEOS)}
                  className="w-full mt-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium transition-all active:scale-[0.98]"
                >
                  Load more videos ({videos.length - videosShown} remaining)
                </button>
              )}
            </>
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
            "transition-opacity duration-200",
            isClosing ? "opacity-0" : "opacity-100"
          )}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Backdrop - tap to close */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={closeLightbox}
          >
            {/* Blurred background image */}
            {selectedType === "photo" && (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={selectedItem.photo_url || selectedItem.url}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover scale-110 blur-3xl opacity-40"
                />
                <div className="absolute inset-0 bg-black/80" />
              </div>
            )}
            {selectedType === "video" && (
              <div className="absolute inset-0 bg-black/95" />
            )}
          </div>

          {/* Close button - positioned near image on mobile, corner on desktop */}
          <button
            onClick={closeLightbox}
            className={cn(
              "absolute z-30 p-2.5 rounded-full",
              "bg-black/60 hover:bg-black/80 backdrop-blur-md",
              "border border-white/20 hover:border-white/40",
              "transition-all duration-200 ease-out",
              "active:scale-90",
              // Mobile: top right, closer to content
              "top-4 right-4",
              // Desktop: slightly more padding
              "md:top-6 md:right-6 md:p-3"
            )}
          >
            <X className="h-5 w-5 md:h-6 md:w-6 text-white" />
          </button>

          {/* Navigation arrows - desktop only */}
          {currentList.length > 1 && (
            <>
              {selectedIndex > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                  className={cn(
                    "hidden md:flex absolute left-4 z-30",
                    "p-3 rounded-full",
                    "bg-black/40 hover:bg-black/60 backdrop-blur-md",
                    "border border-white/10 hover:border-white/30",
                    "transition-all duration-200",
                    "hover:scale-110 active:scale-95"
                  )}
                >
                  <ChevronLeft className="h-6 w-6 text-white" />
                </button>
              )}
              {selectedIndex < currentList.length - 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); goToNext(); }}
                  className={cn(
                    "hidden md:flex absolute right-4 z-30",
                    "p-3 rounded-full",
                    "bg-black/40 hover:bg-black/60 backdrop-blur-md",
                    "border border-white/10 hover:border-white/30",
                    "transition-all duration-200",
                    "hover:scale-110 active:scale-95"
                  )}
                >
                  <ChevronRight className="h-6 w-6 text-white" />
                </button>
              )}
            </>
          )}

          {/* Main content area - doesn't close on tap */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center",
              "pointer-events-none", // Allow clicks to pass through to backdrop
              "transition-transform duration-200 ease-out"
            )}
            style={{
              transform: `translate(${swipeOffset.x * 0.5}px, ${swipeOffset.y * 0.5}px) scale(${1 - Math.abs(swipeOffset.y) / 1000})`,
              opacity: 1 - Math.abs(swipeOffset.y) / 400,
            }}
          >
            {/* Media container */}
            <div
              className="relative pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedType === "photo" ? (
                <img
                  src={selectedItem.photo_url || selectedItem.url}
                  alt={selectedItem.title || ""}
                  className={cn(
                    "max-w-[92vw] max-h-[80vh] md:max-w-[85vw] md:max-h-[85vh]",
                    "object-contain rounded-xl shadow-2xl",
                    "select-none"
                  )}
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
                    className={cn(
                      "max-w-[92vw] max-h-[80vh] md:max-w-[85vw] md:max-h-[85vh]",
                      "object-contain rounded-xl shadow-2xl"
                    )}
                    onEnded={() => setVideoPlaying(false)}
                  />
                  {/* Play button overlay */}
                  {!videoPlaying && (
                    <button
                      onClick={handlePlayVideo}
                      className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        "bg-black/30 backdrop-blur-sm rounded-xl",
                        "transition-all duration-300",
                        "group"
                      )}
                    >
                      <div className={cn(
                        "w-18 h-18 md:w-24 md:h-24 rounded-full",
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

              {/* Title - below image */}
              {selectedItem.title && (
                <div className="mt-4 text-center px-4">
                  <h3 className="text-white text-base md:text-lg font-medium drop-shadow-lg">
                    {selectedItem.title}
                  </h3>
                </div>
              )}
            </div>
          </div>

          {/* Counter and hints */}
          <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-3 pointer-events-none">
            {/* Image counter */}
            {currentList.length > 1 && (
              <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
                <span className="text-white/90 text-sm font-medium tabular-nums">
                  {selectedIndex + 1} / {currentList.length}
                </span>
              </div>
            )}

            {/* Hints */}
            <div className="flex items-center gap-4 text-white/40 text-xs">
              <span className="hidden md:inline">← → navigate</span>
              <span className="hidden md:inline">ESC close</span>
              <span className="md:hidden">Swipe to navigate or close</span>
            </div>

            {/* Swipe indicator line for mobile */}
            <div className="w-12 h-1 bg-white/30 rounded-full md:hidden" />
          </div>
        </div>
      )}
    </div>
  );
}
