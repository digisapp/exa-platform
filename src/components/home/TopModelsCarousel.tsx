"use client";

import { useState, useRef, useEffect } from "react";
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
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";

interface Model {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  profile_photo_url: string | null;
  city: string | null;
  state: string | null;
  profile_views: number;
  // Rate fields for categories
  photoshoot_hourly_rate?: number;
  photoshoot_half_day_rate?: number;
  photoshoot_full_day_rate?: number;
  promo_hourly_rate?: number;
  brand_ambassador_daily_rate?: number;
  private_event_hourly_rate?: number;
  social_companion_hourly_rate?: number;
  meet_greet_rate?: number;
}

interface TopModelsCarouselProps {
  models: Model[];
  showRank?: boolean;
  showCategories?: boolean;
}

// Get booking categories for a model based on their rates
function getModelCategories(model: Model): string[] {
  const categories: string[] = [];

  // Photo - any photoshoot rate
  if (model.photoshoot_hourly_rate || model.photoshoot_half_day_rate || model.photoshoot_full_day_rate) {
    categories.push("Photo");
  }

  // Events - private events, promo, meet & greet
  if (model.private_event_hourly_rate || model.promo_hourly_rate || model.meet_greet_rate) {
    categories.push("Events");
  }

  // Brand - brand ambassador
  if (model.brand_ambassador_daily_rate) {
    categories.push("Brand");
  }

  // Social - social companion
  if (model.social_companion_hourly_rate) {
    categories.push("Social");
  }

  return categories;
}

export function TopModelsCarousel({ models, showRank = true, showCategories = false }: TopModelsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  // Auto-scroll effect
  useEffect(() => {
    if (!isAutoScrolling || !scrollContainerRef.current) return;

    const container = scrollContainerRef.current;
    let animationId: number;
    const scrollSpeed = 0.5; // pixels per frame

    const scroll = () => {
      if (container) {
        container.scrollLeft += scrollSpeed;

        // Reset to beginning when reaching end
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
          container.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(scroll);
    };

    animationId = requestAnimationFrame(scroll);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isAutoScrolling]);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;
    setIsAutoScrolling(false);
    const scrollAmount = 320; // card width + gap
    scrollContainerRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (models.length === 0) {
    return (
      <div className="container px-8 md:px-16 text-center py-12 text-muted-foreground">
        No models to display yet.
      </div>
    );
  }

  return (
    <>
      <div
        className="relative group"
        onMouseEnter={() => setIsAutoScrolling(false)}
        onMouseLeave={() => setIsAutoScrolling(true)}
      >
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
          {models.map((model, index) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model)}
              className="flex-shrink-0 w-[280px] cursor-pointer group/card"
            >
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-white/10 hover:border-pink-500/50 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/20">
                {/* Rank Badge */}
                {showRank && (
                  <div className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                )}

                {/* Image */}
                <div className="aspect-[3/4] relative">
                  {model.profile_photo_url ? (
                    <Image
                      src={model.profile_photo_url}
                      alt={model.first_name || model.username}
                      fill
                      className="object-cover"
                      unoptimized={model.profile_photo_url.includes("cdninstagram.com")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white/30">
                      {model.first_name?.charAt(0) || model.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Info Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {model.first_name || model.username}
                    </h3>
                    {model.state && (
                      <p className="text-sm text-white/70 flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {model.state}
                      </p>
                    )}
                    {/* Category Pills */}
                    {showCategories && (() => {
                      const categories = getModelCategories(model);
                      if (categories.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {categories.map((cat) => (
                            <span
                              key={cat}
                              className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/20 backdrop-blur-sm text-white border border-white/30"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Signup Modal */}
      <Dialog open={!!selectedModel} onOpenChange={() => setSelectedModel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              View {selectedModel?.first_name || selectedModel?.username}&apos;s Profile
            </DialogTitle>
            <DialogDescription className="text-center">
              Create a free account to view full profiles, follow models, and get exclusive content.
            </DialogDescription>
          </DialogHeader>

          {selectedModel && (
            <div className="flex flex-col items-center py-4">
              <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-2 ring-pink-500/50">
                {selectedModel.profile_photo_url ? (
                  <Image
                    src={selectedModel.profile_photo_url}
                    alt={selectedModel.first_name || selectedModel.username}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                    unoptimized={selectedModel.profile_photo_url.includes("cdninstagram.com")}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex items-center justify-center text-2xl font-bold">
                    {selectedModel.first_name?.charAt(0) || selectedModel.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold mb-1">
                {selectedModel.first_name || selectedModel.username}
              </h3>
              {selectedModel.state && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
                  <MapPin className="h-3 w-3" />
                  {selectedModel.state}
                </p>
              )}

              <FanSignupDialog>
                <Button className="exa-gradient-button w-full">
                  Sign Up to View Profile
                </Button>
              </FanSignupDialog>

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
