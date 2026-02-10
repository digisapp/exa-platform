"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar, Users, Star, Plane, Camera, PartyPopper, Sparkles } from "lucide-react";
import { format } from "date-fns";

interface Event {
  id: string;
  slug: string;
  title: string;
  type: string;
  location_city: string | null;
  location_state: string | null;
  start_at: string | null;
  end_at: string | null;
  cover_image_url: string | null;
  spots: number | null;
  spots_filled: number | null;
}

interface UpcomingEventsCarouselProps {
  events: Event[];
}

const typeIcons: Record<string, any> = {
  show: Star,
  photoshoot: Camera,
  travel: Plane,
  campaign: Camera,
  content: Camera,
  hosting: Users,
  fun: PartyPopper,
  other: Sparkles,
};

const typeGradients: Record<string, string> = {
  show: "from-pink-500 to-violet-500",
  photoshoot: "from-purple-500 to-indigo-500",
  travel: "from-violet-500 to-purple-500",
  campaign: "from-blue-500 to-cyan-500",
  content: "from-green-500 to-emerald-500",
  hosting: "from-amber-500 to-orange-500",
  fun: "from-cyan-500 to-blue-500",
  other: "from-gray-500 to-slate-500",
};

export function UpcomingEventsCarousel({ events }: UpcomingEventsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 320;
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (events.length === 0) {
    return (
      <div className="container px-8 md:px-16 text-center py-12 text-muted-foreground">
        No upcoming events at the moment. Check back soon!
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}

        {/* Scrolling Container */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-8 md:px-16 pb-4"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {events.map((event) => {
            const Icon = typeIcons[event.type] || Sparkles;
            const gradient = typeGradients[event.type] || "from-pink-500 to-violet-500";
            const spotsLeft = event.spots && event.spots_filled !== null
              ? event.spots - event.spots_filled
              : null;

            return (
              <Link
                key={event.id}
                href={`/shows/${event.slug}`}
                className="flex-shrink-0 w-[280px] group/card"
              >
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-white/10 hover:border-pink-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/20">
                  {/* Type Badge */}
                  <div className={`absolute top-3 left-3 z-10 px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white text-xs font-semibold flex items-center gap-1`}>
                    <Icon className="h-3 w-3" />
                    {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                  </div>

                  {/* Image */}
                  <div className="aspect-[3/4] relative">
                    {event.cover_image_url ? (
                      <Image
                        src={event.cover_image_url}
                        alt={event.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br ${gradient} opacity-30 flex items-center justify-center`}>
                        <Icon className="h-16 w-16 text-white/50" />
                      </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-lg font-semibold text-white line-clamp-2 mb-2">
                        {event.title}
                      </h3>

                      {event.start_at && (
                        <p className="text-sm text-white/70 flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.start_at), "MMM d, yyyy")}
                        </p>
                      )}

                      {spotsLeft !== null && (
                        <p className="text-sm text-pink-400 flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {spotsLeft > 0 ? `${spotsLeft} spots left` : "Fully booked"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
