"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Image from "next/image";
import { Play, X, Search, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { type Video, TV_CATEGORIES, CATEGORY_LABELS } from "@/lib/tv-videos";

function VideoThumbnail({
  youtubeId,
  title,
  priority = false,
}: {
  youtubeId: string;
  title: string;
  priority?: boolean;
}) {
  // hqdefault (480x360) is ~7x lighter than maxresdefault and always exists.
  const [src, setSrc] = useState(`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`);
  return (
    <Image
      src={src}
      alt={title}
      fill
      priority={priority}
      className="object-cover transition-transform duration-300 group-hover:scale-105"
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      onError={() => setSrc(`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`)}
    />
  );
}

function VideoTile({
  video,
  onClick,
  priority = false,
  large = false,
}: {
  video: Video;
  onClick: () => void;
  priority?: boolean;
  large?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Play ${video.title}`}
      className={`group relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-pink-500/40 transition-all hover:shadow-xl hover:shadow-pink-500/10 hover:scale-[1.02] text-left ${
        large ? "ring-1 ring-pink-500/30" : ""
      }`}
    >
      <VideoThumbnail youtubeId={video.youtubeId} title={video.title} priority={priority} />
      {/* Play icon — dim at rest, bright on hover; visible on mobile */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center border border-white/20 opacity-70 group-hover:opacity-100 group-hover:bg-black/70 transition-all group-hover:scale-110">
          <Play className="h-6 w-6 md:h-7 md:w-7 text-white ml-0.5" fill="white" />
        </div>
      </div>
      {/* Title overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 md:p-4 pt-10">
        <p className="text-xs md:text-sm font-medium text-white line-clamp-2 drop-shadow-lg">
          {video.title}
        </p>
      </div>
    </button>
  );
}

export function TVGrid({ videos }: { videos: Video[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialCat = searchParams.get("cat") || "All";
  const initialQuery = searchParams.get("q") || "";
  const initialVideoId = searchParams.get("v");

  const [activeFilter, setActiveFilter] = useState<string>(initialCat);
  const [query, setQuery] = useState<string>(initialQuery);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(
    initialVideoId ? videos.find((v) => v.youtubeId === initialVideoId) || null : null
  );

  const updateUrl = useCallback(
    (next: { cat?: string; q?: string; v?: string | null }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.cat !== undefined) {
        if (next.cat === "All") params.delete("cat");
        else params.set("cat", next.cat);
      }
      if (next.q !== undefined) {
        if (!next.q) params.delete("q");
        else params.set("q", next.q);
      }
      if (next.v !== undefined) {
        if (!next.v) params.delete("v");
        else params.set("v", next.v);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const onFilterChange = useCallback(
    (cat: string) => {
      setActiveFilter(cat);
      updateUrl({ cat });
    },
    [updateUrl]
  );

  const onQueryChange = useCallback(
    (q: string) => {
      setQuery(q);
      updateUrl({ q });
    },
    [updateUrl]
  );

  const openVideo = useCallback(
    (video: Video) => {
      setSelectedVideo(video);
      updateUrl({ v: video.youtubeId });
    },
    [updateUrl]
  );

  const closeModal = useCallback(() => {
    setSelectedVideo(null);
    updateUrl({ v: null });
  }, [updateUrl]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredVideos = useMemo(() => {
    return videos.filter((v) => {
      if (activeFilter !== "All" && v.category !== activeFilter) return false;
      if (normalizedQuery && !v.title.toLowerCase().includes(normalizedQuery)) return false;
      return true;
    });
  }, [videos, activeFilter, normalizedQuery]);

  const featuredVideos = useMemo(() => videos.filter((v) => v.featured), [videos]);
  const showFeatured = activeFilter === "All" && !normalizedQuery && featuredVideos.length > 0;

  // Lightbox navigation
  const currentIndex = selectedVideo
    ? filteredVideos.findIndex((v) => v.youtubeId === selectedVideo.youtubeId)
    : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < filteredVideos.length - 1;

  const goPrev = useCallback(() => {
    if (hasPrev) openVideo(filteredVideos[currentIndex - 1]);
  }, [hasPrev, currentIndex, filteredVideos, openVideo]);

  const goNext = useCallback(() => {
    if (hasNext) openVideo(filteredVideos[currentIndex + 1]);
  }, [hasNext, currentIndex, filteredVideos, openVideo]);

  useEffect(() => {
    if (!selectedVideo) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [selectedVideo, closeModal, goPrev, goNext]);

  // Focus search with "/"
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (selectedVideo) return;
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [selectedVideo]);

  return (
    <>
      {/* Featured row — only shown on default view */}
      {showFeatured && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-pink-400" />
            <h2 className="text-xs uppercase tracking-[0.25em] text-white/60 font-semibold">
              Featured
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredVideos.slice(0, 3).map((video, i) => (
              <VideoTile
                key={`featured-${video.id}`}
                video={video}
                onClick={() => openVideo(video)}
                priority={i < 3}
                large
              />
            ))}
          </div>
        </div>
      )}

      {/* Sticky filter + search bar */}
      <div className="sticky top-0 z-30 -mx-4 md:-mx-8 px-4 md:px-8 py-4 bg-background/85 backdrop-blur-md border-b border-white/5 mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {TV_CATEGORIES.map((cat) => {
              const count =
                cat === "All"
                  ? videos.length
                  : videos.filter((v) => v.category === cat).length;
              const isActive = activeFilter === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onFilterChange(cat)}
                  className={`px-3 md:px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
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
          <div className="relative md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search videos…"
              aria-label="Search EXA TV videos"
              className="w-full pl-9 pr-9 py-2 text-sm rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/40 focus:outline-none focus:border-pink-500/50 focus:bg-white/10 transition-colors"
            />
            {query && (
              <button
                onClick={() => onQueryChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {normalizedQuery && (
          <p className="text-xs text-white/50 mt-2">
            {filteredVideos.length} result{filteredVideos.length === 1 ? "" : "s"} for "{query}"
          </p>
        )}
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.map((video, i) => (
          <VideoTile
            key={video.id}
            video={video}
            onClick={() => openVideo(video)}
            priority={!showFeatured && i < 6}
          />
        ))}
      </div>

      {filteredVideos.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          {normalizedQuery ? (
            <>
              <p className="text-white/60 mb-2">No videos match "{query}"</p>
              <button
                onClick={() => onQueryChange("")}
                className="text-sm text-pink-400 hover:text-pink-300 underline underline-offset-4"
              >
                Clear search
              </button>
            </>
          ) : (
            "No videos found for this category."
          )}
        </div>
      )}

      {/* Lightbox */}
      {selectedVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-label={selectedVideo.title}
        >
          <button
            onClick={closeModal}
            aria-label="Close video"
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>

          {hasPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label="Previous video"
              className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-white" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label="Next video"
              className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="h-6 w-6 text-white" />
            </button>
          )}

          <div
            className="w-full max-w-5xl mx-4 aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              key={selectedVideo.youtubeId}
              src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={selectedVideo.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full rounded-xl"
            />
          </div>
          <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-1 px-4 pointer-events-none">
            <p className="text-center text-white/80 text-sm font-medium line-clamp-1 max-w-2xl">
              {selectedVideo.title}
            </p>
            {currentIndex >= 0 && (
              <p className="text-xs text-white/40">
                {currentIndex + 1} of {filteredVideos.length}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
