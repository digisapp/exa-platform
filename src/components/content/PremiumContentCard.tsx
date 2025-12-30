"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock, Unlock, Coins, Play, Loader2 } from "lucide-react";
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
          "relative aspect-square rounded-lg overflow-hidden cursor-pointer group",
          "bg-gradient-to-br from-gray-900 to-gray-800"
        )}
        onClick={() => isUnlocked ? setShowFull(true) : setShowPreview(true)}
      >
        {/* Preview or Full Image */}
        {(isUnlocked && mediaUrl) || content.preview_url ? (
          <>
            <Image
              src={isUnlocked && mediaUrl ? mediaUrl : content.preview_url!}
              alt={content.title || "Premium content"}
              fill
              className={cn(
                "object-cover transition-all duration-300",
                !isUnlocked && "blur-xl scale-110 brightness-75",
                isUnlocked && "group-hover:scale-105"
              )}
            />
            {/* Gradient overlay for locked content */}
            {!isUnlocked && !isOwner && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/30 to-violet-500/30">
            {isVideo ? (
              <Play className="h-12 w-12 text-white/50" />
            ) : (
              <Lock className="h-12 w-12 text-white/50" />
            )}
          </div>
        )}

        {/* Lock Overlay - only for paid content */}
        {!isUnlocked && !isOwner && !isFree && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-black/40 backdrop-blur-sm">
              <Lock className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-pink-500 to-violet-500 px-4 py-1.5 rounded-full shadow-lg">
              <Coins className="h-4 w-4 text-white" />
              <span className="text-white font-bold">{content.coin_price}</span>
            </div>
            {isVideo && (
              <span className="text-xs text-white/80 font-medium">Video</span>
            )}
          </div>
        )}

        {/* Free badge for free content */}
        {!isUnlocked && !isOwner && isFree && (
          <div className="absolute bottom-2 left-2 bg-green-500 px-2 py-1 rounded-full">
            <span className="text-xs text-white font-semibold">FREE</span>
          </div>
        )}

        {/* Unlocked Badge */}
        {isUnlocked && !isOwner && (
          <div className="absolute top-2 right-2 bg-green-500 p-1 rounded-full">
            <Unlock className="h-3 w-3 text-white" />
          </div>
        )}

        {/* Video Badge */}
        {isVideo && isUnlocked && (
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded flex items-center gap-1">
            <Play className="h-3 w-3 text-white" />
            <span className="text-xs text-white">Video</span>
          </div>
        )}
      </div>

      {/* Preview/Unlock Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-pink-500" />
              {content.title || "Premium Content"}
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
                  className="object-cover blur-xl"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                  <Lock className="h-16 w-16 text-white/30" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Lock className="h-12 w-12 text-white mx-auto mb-2" />
                  <p className="text-white font-medium">Unlock to view</p>
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
                  <Unlock className="mr-2 h-4 w-4" />
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
