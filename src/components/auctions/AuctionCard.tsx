"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CountdownTimer } from "./CountdownTimer";
import { Gavel, Eye, Coins, Zap, Video, Pen, Users, Megaphone, Star, MoreHorizontal } from "lucide-react";
import { coinsToFanUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import type { AuctionWithModel, AuctionCategory } from "@/types/auctions";

const CATEGORY_CONFIG: Record<AuctionCategory, { label: string; icon: typeof Video; color: string }> = {
  video_call: { label: "Video Call", icon: Video, color: "bg-blue-500/80 text-white" },
  custom_content: { label: "Custom Content", icon: Pen, color: "bg-purple-500/80 text-white" },
  meet_greet: { label: "Meet & Greet", icon: Users, color: "bg-emerald-500/80 text-white" },
  shoutout: { label: "Shoutout", icon: Megaphone, color: "bg-orange-500/80 text-white" },
  experience: { label: "Experience", icon: Star, color: "bg-pink-500/80 text-white" },
  other: { label: "Other", icon: MoreHorizontal, color: "bg-zinc-500/80 text-white" },
};

interface AuctionCardProps {
  auction: AuctionWithModel;
  isWatching?: boolean;
  onAuctionEnd?: () => void;
}

export function AuctionCard({ auction, isWatching, onAuctionEnd }: AuctionCardProps) {
  const currentPrice = auction.current_bid || auction.starting_price;
  const usdPrice = coinsToFanUsd(currentPrice);
  const hasEnded = new Date(auction.ends_at) <= new Date() || auction.status !== "active";

  return (
    <Link href={`/bids/${auction.id}`}>
      <div className="glass-card rounded-2xl overflow-hidden hover:scale-[1.02] transition-all h-full group">
        {/* Portrait Image with Overlay */}
        <div className="aspect-[3/4] relative bg-gradient-to-br from-pink-500/20 to-violet-500/20 overflow-hidden">
          {auction.model?.profile_image_url ? (
            <Image
              src={auction.model.profile_image_url}
              alt={auction.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Gavel className="h-20 w-20 text-muted-foreground/30" />
            </div>
          )}

          {/* Model Avatar */}
          {auction.model && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-white shadow-lg">
                <AvatarImage src={auction.model.profile_image_url || undefined} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                  {auction.model.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-white drop-shadow-lg">
                {auction.model.display_name}
              </span>
            </div>
          )}

          {/* Top-right badges */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {/* Buy Now Badge */}
            {auction.buy_now_price && !hasEnded && (
              <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                <Zap className="h-3 w-3 mr-1" />
                Buy Now
              </Badge>
            )}

            {/* Ended Badge */}
            {hasEnded && (
              <Badge className="bg-zinc-700 text-white border-0">
                {auction.status === "sold" ? "Sold" : auction.status === "no_sale" ? "No Sale" : "Ended"}
              </Badge>
            )}

            {/* Category Badge */}
            {auction.category && auction.category !== "other" && (() => {
              const cat = CATEGORY_CONFIG[auction.category];
              const CatIcon = cat.icon;
              return (
                <Badge className={`${cat.color} border-0 text-[11px]`}>
                  <CatIcon className="h-3 w-3 mr-1" />
                  {cat.label}
                </Badge>
              );
            })()}

            {/* Watching indicator */}
            {isWatching && (
              <Eye className="h-5 w-5 text-pink-400 drop-shadow-lg" />
            )}
          </div>

          {/* Bottom Title Bar - Always Visible */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12">
            <h3 className="font-semibold text-white text-lg line-clamp-2">{auction.title}</h3>

            {/* Countdown or Price */}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="font-bold text-white">{formatCoins(currentPrice)}</span>
                <span className="text-white/60 text-sm">{formatUsd(usdPrice)}</span>
              </div>
              {!hasEnded && (
                <CountdownTimer endsAt={auction.ends_at} compact onEnd={onAuctionEnd} />
              )}
            </div>
          </div>

          {/* Hover Overlay with Full Details */}
          <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-4">
            <div className="space-y-3">
              <h3 className="font-bold text-white text-xl">{auction.title}</h3>

              {auction.description && (
                <p className="text-sm text-white/80 line-clamp-3">
                  {auction.description}
                </p>
              )}

              <div className="space-y-2 text-sm">
                {/* Current Bid */}
                <div className="flex items-center gap-2 text-white/90">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className="font-semibold">{auction.current_bid ? "Current Bid:" : "Starting Price:"}</span>
                  <span>{formatCoins(currentPrice)} coins ({formatUsd(usdPrice)})</span>
                </div>

                {/* Bid Count */}
                <div className="flex items-center gap-2 text-white/90">
                  <Gavel className="h-4 w-4 text-pink-400" />
                  {auction.bid_count === 0
                    ? "No bids yet"
                    : `${auction.bid_count} bid${auction.bid_count === 1 ? "" : "s"}`}
                </div>

                {/* Buy Now Price */}
                {auction.buy_now_price && !hasEnded && (
                  <div className="flex items-center gap-2 text-white/90">
                    <Zap className="h-4 w-4 text-amber-400" />
                    <span>Buy Now: {formatCoins(auction.buy_now_price)} coins</span>
                  </div>
                )}

                {/* Time Left */}
                {!hasEnded && (
                  <div className="pt-2">
                    <CountdownTimer endsAt={auction.ends_at} onEnd={onAuctionEnd} />
                  </div>
                )}
              </div>

              {/* Deliverables Preview */}
              {auction.deliverables && (
                <div className="pt-2 border-t border-white/20">
                  <p className="text-xs text-white/60 mb-1">What you&apos;ll get:</p>
                  <p className="text-sm text-white/90 line-clamp-2">{auction.deliverables}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default AuctionCard;
