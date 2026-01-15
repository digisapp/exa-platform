"use client";

import { useState } from "react";
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

  const openLightbox = (index: number, type: "photos" | "videos") => {
    setLightboxIndex(index);
    setLightboxType(type);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const currentItems = lightboxType === "photos" ? photos : videos;

  const goToPrevious = () => {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : currentItems.length - 1));
  };

  const goToNext = () => {
    setLightboxIndex((prev) => (prev < currentItems.length - 1 ? prev + 1 : 0));
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
                  className="aspect-square relative group rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(index, "photos")}
                >
                  <img
                    src={photo.photo_url || photo.url}
                    alt={photo.title || ""}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
                  {/* Title overlay on hover */}
                  {photo.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium truncate">{photo.title}</p>
                    </div>
                  )}
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
            <div className="grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
              {videos.map((video, index) => (
                <div
                  key={video.id}
                  className="aspect-video relative group rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(index, "videos")}
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Video className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  {/* Title overlay on hover */}
                  {video.title && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white text-xs font-medium truncate">{video.title}</p>
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

      {/* Lightbox Modal */}
      {lightboxOpen && currentItems.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Navigation arrows */}
          {currentItems.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <ChevronLeft className="h-8 w-8 text-white" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
              >
                <ChevronRight className="h-8 w-8 text-white" />
              </button>
            </>
          )}

          {/* Content */}
          <div
            className="max-w-[90vw] max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {lightboxType === "photos" ? (
              <img
                src={currentItems[lightboxIndex]?.photo_url || currentItems[lightboxIndex]?.url}
                alt={currentItems[lightboxIndex]?.title || ""}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            ) : (
              <video
                src={currentItems[lightboxIndex]?.url}
                controls
                autoPlay
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
            )}

            {/* Title */}
            {currentItems[lightboxIndex]?.title && (
              <p className="mt-4 text-white text-lg font-medium text-center">
                {currentItems[lightboxIndex].title}
              </p>
            )}

            {/* Counter */}
            <p className="mt-2 text-white/50 text-sm">
              {lightboxIndex + 1} / {currentItems.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
