import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelCardProps {
  model: any;
  variant?: "default" | "compact";
}

export function ModelCard({ model, variant = "default" }: ModelCardProps) {
  // Create display name from first_name and last_name
  const displayName = model.first_name
    ? `${model.first_name} ${model.last_name || ''}`.trim()
    : model.username;

  // Get level badge
  const getLevel = () => {
    if (model.is_verified) return { icon: "✓", label: "Verified", class: "level-verified" };
    if (model.is_featured) return { icon: "⭐", label: "Featured", class: "level-pro" };
    return null;
  };
  const level = getLevel();

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
                  unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
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

  return (
    <Link href={`/${model.username}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
        {/* Image */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-[#FF69B4]/20 to-[#9400D3]/20 overflow-hidden">
          {model.profile_photo_url ? (
            <Image
              src={model.profile_photo_url}
              alt={displayName}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              unoptimized={model.profile_photo_url.includes('cdninstagram.com')}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl">👤</span>
            </div>
          )}
          {/* Level Badge */}
          {level && (
            <div className="absolute top-3 right-3">
              <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", level.class)}>
                {level.icon} {level.label}
              </span>
            </div>
          )}
          {/* Availability indicator */}
          {model.availability_status === 'available' && (
            <div className="absolute top-3 left-3">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                <div className="online-indicator !w-2 !h-2" />
                <span className="text-xs text-white">Online</span>
              </div>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="space-y-2">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold truncate">{displayName}</h3>
                <p className="text-sm text-[#00BFFF]">@{model.username}</p>
              </div>
              {model.instagram_followers && model.instagram_followers > 0 && (
                <div className="text-right">
                  <p className="text-sm font-medium text-[#FF69B4]">
                    {model.instagram_followers >= 1000
                      ? `${(model.instagram_followers / 1000).toFixed(1)}k`
                      : model.instagram_followers}
                  </p>
                  <p className="text-xs text-muted-foreground">followers</p>
                </div>
              )}
            </div>

            {model.show_location && (model.city || model.state) && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-[#FF69B4]" />
                {model.city && model.state ? `${model.city}, ${model.state}` : model.city || model.state}
              </div>
            )}

            {model.show_social_media && model.instagram_name && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Instagram className="h-3.5 w-3.5" />
                @{model.instagram_name}
              </div>
            )}

            {model.height && model.show_measurements && (
              <p className="text-sm text-muted-foreground">
                {model.height}
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
