"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, memo } from "react";
import { toast } from "sonner";
import { AddToCampaignButton } from "@/components/ui/add-to-campaign-button";
import { ModelNotesDialog } from "@/components/brands/ModelNotesDialog";

interface ModelCardProps {
  model: any;
  variant?: "default" | "compact";
  showFavorite?: boolean;
  showListButton?: boolean;
  isLoggedIn?: boolean;
  isFavorited?: boolean;
  onAuthRequired?: () => void;
}

export const ModelCard = memo(function ModelCard({
  model,
  variant = "default",
  showFavorite = false,
  showListButton = false,
  isLoggedIn = false,
  isFavorited: initialFavorited = false,
  onAuthRequired,
}: ModelCardProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  // Display first name only (not full name for privacy)
  const displayName = model.first_name || model.username;

  // Get level badge
  const getLevel = () => {
    if (model.is_verified) return { icon: "✓", label: "Verified", class: "level-verified" };
    if (model.is_featured) return { icon: "⭐", label: "Featured", class: "level-pro" };
    return null;
  };
  const level = getLevel();

  const handleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isLoggedIn) {
      onAuthRequired?.();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: isFavorited ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: model.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update favorite");
      }

      setIsFavorited(!isFavorited);
      toast.success(
        isFavorited
          ? `Unfollowed`
          : `Following`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "compact") {
    return (
      <Link href={`/${model.username}`}>
        <div className="glass-card rounded-xl p-4 hover:scale-105 transition-transform group">
          <div className="flex items-center gap-3">
            <div className="profile-image-container !p-[2px]">
              {model.profile_photo_url ? (
                <Image
                  src={model.profile_photo_url}
                  alt={displayName}
                  width={48}
                  height={48}
                  className="w-12 h-12 object-cover rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1a0033] to-[#2d1b69] flex items-center justify-center">
                  <span className="text-lg">{displayName.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground">@{model.username}</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Focus tag labels
  const focusLabels: Record<string, string> = {
    fashion: "Fashion", commercial: "Commercial", fitness: "Fitness", athlete: "Athlete",
    swimwear: "Swimwear", beauty: "Beauty", editorial: "Editorial",
    ecommerce: "E-Comm", promo: "Promo", luxury: "Luxury", lifestyle: "Lifestyle"
  };

  return (
    <Link href={`/${model.username}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
        {/* Image with Hover Overlay */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-[#FF69B4]/20 to-[#9400D3]/20 overflow-hidden">
          {model.profile_photo_url ? (
            <Image
              src={model.profile_photo_url}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">👤</span>
            </div>
          )}

          {/* Favorite Button */}
          {showFavorite && (
            <button
              onClick={handleFavorite}
              disabled={loading}
              className={cn(
                "absolute top-3 right-3 z-10 p-2 rounded-full transition-all",
                isFavorited
                  ? "bg-red-500 text-white"
                  : "bg-black/50 backdrop-blur-sm text-white hover:bg-black/70",
                loading && "opacity-50 cursor-not-allowed"
              )}
              aria-label={isFavorited ? "Unfollow" : "Follow"}
            >
              <Heart className={cn("h-5 w-5", isFavorited && "fill-current")} />
            </button>
          )}

          {/* Brand Actions (Campaign + Notes) */}
          {showListButton && (
            <div
              className="absolute top-3 right-3 z-10 flex items-center gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              <ModelNotesDialog
                modelId={model.id}
                modelName={displayName}
              />
              <AddToCampaignButton
                modelId={model.id}
                modelName={displayName}
                size="sm"
              />
            </div>
          )}

          {/* Level Badge */}
          {level && !showFavorite && (
            <div className="absolute top-3 right-3">
              <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", level.class)}>
                {level.icon} {level.label}
              </span>
            </div>
          )}

          {/* Availability indicator - online if active within last 5 minutes */}
          {model.last_active_at && (Date.now() - new Date(model.last_active_at).getTime()) < 5 * 60 * 1000 && (
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                <div className="online-indicator !w-2 !h-2" />
                <span className="text-xs text-white">Online</span>
              </div>
            </div>
          )}

          {/* Bottom Name Bar - Always Visible */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8">
            <h3 className="font-semibold text-white truncate">{displayName}</h3>
            <p className="text-sm text-[#00BFFF]">@{model.username}</p>
          </div>

          {/* Hover Overlay with Details */}
          <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{displayName}</h3>
                {model.reliability_score !== null && model.reliability_score !== undefined && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium",
                      model.reliability_score >= 90
                        ? "bg-green-500/20 text-green-400"
                        : model.reliability_score >= 70
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-red-500/20 text-red-400"
                    )}
                    title="Reliability score based on show-up rate"
                  >
                    <Star className="h-3 w-3" />
                    {model.reliability_score}%
                  </span>
                )}
              </div>
              <p className="text-sm text-[#00BFFF]">@{model.username}</p>

              {model.show_location && (model.city || model.state) && (
                <div className="flex items-center gap-1 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5 text-[#FF69B4]" />
                  {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
                </div>
              )}

              {/* Instagram shown on profile page, not on cards */}

              {model.height && model.show_measurements && (
                <p className="text-sm text-white/80">{model.height}</p>
              )}

              {/* Focus Tags */}
              {model.focus_tags && model.focus_tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {model.focus_tags.slice(0, 3).map((tag: string) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-pink-500/30 to-violet-500/30 text-white border border-white/20"
                    >
                      {focusLabels[tag] || tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
