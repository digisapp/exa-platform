"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Coins, Play, Loader2, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PremiumContentCardProps {
  content: {
    id: string;
    title?: string | null;
    description?: string | null;
    media_type: string;
    preview_url?: string | null;
    coin_price: number;
    isUnlocked: boolean;
    mediaUrl?: string | null;
  };
  coinBalance: number;
  onUnlock?: (contentId: string, newBalance: number) => void;
  isOwner?: boolean;
}

export function PremiumContentCard({
  content,
  coinBalance,
  onUnlock,
  isOwner = false,
}: PremiumContentCardProps) {
  const [isUnlocked, setIsUnlocked] = useState(content.isUnlocked);
  const [mediaUrl, setMediaUrl] = useState(content.mediaUrl);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showFull, setShowFull] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isFree = content.coin_price === 0;
  const canAfford = isFree || coinBalance >= content.coin_price;
  const isVideo = content.media_type === "video";

  const handleUnlock = async () => {
    if (!canAfford) {
      toast.error(`Need ${content.coin_price} coins, you have ${coinBalance}`);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/content/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId: content.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        } else {
          toast.error(data.error || "Failed to unlock content");
        }
        return;
      }

      setIsUnlocked(true);
      setMediaUrl(data.mediaUrl);
      setShowPreview(false);
      setShowFull(true);

      if (!data.alreadyUnlocked) {
        toast.success(`Unlocked for ${data.amountPaid} coins!`);
      }

      if (onUnlock) {
        onUnlock(content.id, data.newBalance);
      }
    } catch {
      toast.error("Failed to unlock content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Card */}
      <div
        className={cn(
          "relative rounded-xl overflow-hidden cursor-pointer group",
          "bg-gradient-to-br from-gray-900 to-gray-800",
          isVideo ? "aspect-video" : "aspect-[3/4]"
        )}
        onClick={() => isUnlocked ? setShowFull(true) : setShowPreview(true)}
      >
        {/* Preview or Full Image/Video */}
        {((isUnlocked && mediaUrl) || content.preview_url) && !imageError ? (
          <>
            {isVideo ? (
              <video
                src={isUnlocked && mediaUrl ? mediaUrl : content.preview_url!}
                muted
                playsInline
                preload="metadata"
                className={cn(
                  "absolute inset-0 w-full h-full object-cover transition-all duration-300",
                  !isUnlocked && !isFree && !isOwner && "blur-md scale-105 brightness-75",
                  isUnlocked && "group-hover:scale-105"
                )}
                onError={() => setImageError(true)}
              />
            ) : (
              <Image
                src={isUnlocked && mediaUrl ? mediaUrl : content.preview_url!}
                alt={content.title || "PPV content"}
                fill
                className={cn(
                  "object-cover transition-all duration-300",
                  !isUnlocked && !isFree && !isOwner && "blur-md scale-105 brightness-75",
                  isUnlocked && "group-hover:scale-105"
                )}
                onError={() => setImageError(true)}
              />
            )}
            {/* Subtle gradient overlay for locked content */}
            {!isUnlocked && !isFree && !isOwner && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/30 to-violet-500/30">
            {imageError ? (
              <ImageOff className="h-12 w-12 text-white/40" />
            ) : isVideo ? (
              <Play className="h-12 w-12 text-white/50" />
            ) : (
              <Coins className="h-12 w-12 text-white/30" />
            )}
          </div>
        )}

        {/* Elegant floating price - only for paid locked content */}
        {!isUnlocked && !isOwner && !isFree && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Floating coin price with glass effect */}
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5",
              "bg-black/30 backdrop-blur-sm",
              "border border-white/20 rounded-full",
              "shadow-2xl shadow-black/50",
              "transition-all duration-300 group-hover:scale-105 group-hover:bg-black/40"
            )}>
              <Coins className="h-5 w-5 text-amber-400 drop-shadow-lg" />
              <span className="text-white font-semibold text-lg tracking-wide drop-shadow-lg">
                {content.coin_price}
              </span>
            </div>
            {/* Video indicator below */}
            {isVideo && (
              <div className="mt-2 flex items-center gap-1.5 text-white/80">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                <span className="text-xs font-medium tracking-wide uppercase">Video</span>
              </div>
            )}
          </div>
        )}

        {/* Video Badge for unlocked */}
        {isVideo && isUnlocked && (
          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md flex items-center gap-1">
            <Play className="h-3 w-3 text-white" fill="white" />
            <span className="text-xs text-white font-medium">Video</span>
          </div>
        )}
      </div>

      {/* Preview/Unlock Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {content.title || "PPV Content"}
            </DialogTitle>
            {content.description && (
              <DialogDescription>{content.description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Blurred Preview */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-900">
              {content.preview_url ? (
                <Image
                  src={content.preview_url}
                  alt="Preview"
                  fill
                  className="object-cover blur-lg brightness-90"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                  <Coins className="h-16 w-16 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 rounded-full shadow-lg">
                  <Coins className="h-5 w-5 text-white" />
                  <span className="text-white font-bold text-xl">{content.coin_price}</span>
                </div>
              </div>
            </div>

            {/* Price and Balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Price:</span>
              <span className="flex items-center gap-1 font-semibold">
                <Coins className="h-4 w-4 text-pink-500" />
                {content.coin_price} coins
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your balance:</span>
              <span className={cn(
                "flex items-center gap-1 font-semibold",
                canAfford ? "text-green-500" : "text-red-500"
              )}>
                <Coins className="h-4 w-4" />
                {coinBalance} coins
              </span>
            </div>

            {/* Unlock Button */}
            <Button
              onClick={handleUnlock}
              disabled={!canAfford || loading}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unlocking...
                </>
              ) : canAfford ? (
                <>
                  Unlock for {content.coin_price} Coins
                </>
              ) : (
                "Not enough coins"
              )}
            </Button>

            {!canAfford && (
              <p className="text-center text-sm text-muted-foreground">
                Need {content.coin_price - coinBalance} more coins.{" "}
                <Link href="/coins" className="text-pink-500 hover:underline">
                  Buy coins
                </Link>
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Full Content Dialog */}
      <Dialog open={showFull} onOpenChange={setShowFull}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {content.title && (
            <DialogHeader className="p-4 pb-0">
              <DialogTitle>{content.title}</DialogTitle>
            </DialogHeader>
          )}
          <div className="relative w-full">
            {isVideo && mediaUrl ? (
              <video
                src={mediaUrl}
                controls
                className="w-full max-h-[80vh]"
                autoPlay
              />
            ) : mediaUrl ? (
              <Image
                src={mediaUrl}
                alt={content.title || "Premium content"}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[80vh] object-contain"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-900">
                <p className="text-muted-foreground">Content unavailable</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
