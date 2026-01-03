"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, MapPin, Calendar, Users, Star, Plane, Camera, PartyPopper, Sparkles } from "lucide-react";
import { ModelSignupDialog } from "@/components/auth/ModelSignupDialog";
import { format } from "date-fns";

interface Event {
  id: string;
  slug: string;
  title: string;
  type: string;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  spots_total: number | null;
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
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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
            const spotsLeft = event.spots_total && event.spots_filled
              ? event.spots_total - event.spots_filled
              : null;

            return (
              <div
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="flex-shrink-0 w-[280px] cursor-pointer group/card"
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

                      {event.start_date && (
                        <p className="text-sm text-white/70 flex items-center gap-1 mb-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(event.start_date), "MMM d, yyyy")}
                        </p>
                      )}

                      {event.location && (
                        <p className="text-sm text-white/70 flex items-center gap-1 mb-1">
                          <MapPin className="h-3 w-3" />
                          {event.location}
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
              </div>
            );
          })}
        </div>
      </div>

      {/* Signup Modal */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              Join {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription className="text-center">
              Sign up as a model to apply for this opportunity and more exclusive gigs.
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="flex flex-col items-center py-4">
              <div className="w-full aspect-video rounded-xl overflow-hidden mb-4 relative">
                {selectedEvent.cover_image_url ? (
                  <Image
                    src={selectedEvent.cover_image_url}
                    alt={selectedEvent.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${typeGradients[selectedEvent.type] || "from-pink-500 to-violet-500"} opacity-50 flex items-center justify-center`}>
                    {(() => {
                      const Icon = typeIcons[selectedEvent.type] || Sparkles;
                      return <Icon className="h-12 w-12 text-white/70" />;
                    })()}
                  </div>
                )}
              </div>

              <h3 className="text-lg font-semibold mb-2 text-center">{selectedEvent.title}</h3>

              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-4">
                {selectedEvent.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedEvent.start_date), "MMM d, yyyy")}
                  </span>
                )}
                {selectedEvent.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {selectedEvent.location}
                  </span>
                )}
              </div>

              <ModelSignupDialog>
                <Button className="exa-gradient-button w-full">
                  Sign Up to Apply
                </Button>
              </ModelSignupDialog>

              <p className="text-xs text-muted-foreground mt-4 text-center">
                Already have an account?{" "}
                <Link href="/signin" className="text-pink-500 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
