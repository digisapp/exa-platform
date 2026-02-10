"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Play, X } from "lucide-react";
import { type Video, TV_CATEGORIES, CATEGORY_LABELS } from "@/lib/tv-videos";

export function TVGrid({ videos }: { videos: Video[] }) {
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const filteredVideos =
    activeFilter === "All"
      ? videos
      : videos.filter((v) => v.category === activeFilter);

  const closeModal = useCallback(() => setSelectedVideo(null), []);

  useEffect(() => {
    if (!selectedVideo) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [selectedVideo, closeModal]);

  return (
    <>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {TV_CATEGORIES.map((cat) => {
          const count =
            cat === "All"
              ? videos.length
              : videos.filter((v) => v.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat
                  ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg shadow-pink-500/25"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {CATEGORY_LABELS[cat] || cat}
              <span className="ml-1.5 opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video) => (
          <button
            key={video.id}
            onClick={() => setSelectedVideo(video)}
            className="group relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-pink-500/40 transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:scale-[1.02] text-left"
          >
            <Image
              src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
              alt={video.title}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20">
                <Play className="h-7 w-7 text-white ml-1" fill="white" />
              </div>
            </div>
            {/* Title Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-10">
              <p className="text-sm font-medium text-white line-clamp-2 drop-shadow-lg">
                {video.title}
              </p>
            </div>
          </button>
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          No videos found for this category.
        </div>
      )}

      {/* Lightbox Modal */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeModal}
        >
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <div
            className="w-full max-w-5xl mx-4 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={selectedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-xl"
            />
          </div>
          <p className="absolute bottom-6 left-0 right-0 text-center text-white/70 text-sm px-4">
            {selectedVideo.title}
          </p>
        </div>
      )}
    </>
  );
}
