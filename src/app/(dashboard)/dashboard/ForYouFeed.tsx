"use client";

import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins, Gavel, Sparkles } from "lucide-react";
import { formatCoins } from "@/lib/coin-config";
import { PremiumContentCard } from "@/components/content/PremiumContentCard";
import { useState } from "react";

export type FeedItem =
  | {
      type: "content";
      id: string;
      model: {
        username: string;
        first_name: string | null;
        last_name: string | null;
        profile_photo_url: string | null;
        is_verified: boolean;
      };
      title: string | null;
      description: string | null;
      media_type: string;
      preview_url: string | null;
      coin_price: number;
      unlock_count: number;
      created_at: string;
      isUnlocked: boolean;
      mediaUrl: string | null;
      isFollowed: boolean;
    }
  | {
      type: "auction";
      id: string;
      model: {
        username: string;
        first_name: string | null;
        last_name: string | null;
        profile_photo_url: string | null;
        is_verified: boolean;
      };
      title: string;
      category: string | null;
      cover_image_url: string | null;
      current_bid: number;
      starting_price: number;
      bid_count: number;
      ends_at: string;
      myBidStatus: string | null;
    };

interface ForYouFeedProps {
  items: FeedItem[];
  coinBalance: number;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function getTimeLeft(endsAt: string): string {
  const end = new Date(endsAt);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  if (diffMs <= 0) return "Ended";
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m left`;
  if (diffHours < 24) return `${diffHours}h left`;
  return `${diffDays}d left`;
}

export function ForYouFeed({ items, coinBalance }: ForYouFeedProps) {
  const [balance, setBalance] = useState(coinBalance);

  const handleUnlock = (_contentId: string, newBalance: number) => {
    setBalance(newBalance);
  };

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Sparkles className="h-5 w-5 text-pink-500" />
        For You
      </h3>
      <div className="space-y-4">
        {items.map((item) => {
          if (item.type === "content") {
            const modelName = `${item.model.first_name || ""} ${item.model.last_name || ""}`.trim() || item.model.username;
            return (
              <div key={`content-${item.id}`} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                {/* Model header */}
                <Link
                  href={`/${item.model.username}`}
                  className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-9 w-9 border border-pink-500/30">
                    <AvatarImage src={item.model.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-sm">
                      {modelName[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm truncate">{modelName}</p>
                      {item.model.is_verified && (
                        <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {getTimeAgo(item.created_at)}
                      {item.isFollowed && " · Following"}
                    </p>
                  </div>
                  {item.coin_price > 0 && !item.isUnlocked && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                      <Coins className="h-3 w-3 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">{item.coin_price}</span>
                    </div>
                  )}
                </Link>
                {/* Content */}
                <div className="px-3 pb-3">
                  {item.title && (
                    <p className="text-sm font-medium mb-2 px-0.5">{item.title}</p>
                  )}
                  <PremiumContentCard
                    content={{
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      media_type: item.media_type,
                      preview_url: item.preview_url,
                      coin_price: item.coin_price,
                      isUnlocked: item.isUnlocked,
                      mediaUrl: item.mediaUrl,
                    }}
                    coinBalance={balance}
                    onUnlock={handleUnlock}
                  />
                  {item.unlock_count > 0 && (
                    <p className="text-xs text-muted-foreground mt-2 px-0.5">
                      {item.unlock_count} {item.unlock_count === 1 ? "unlock" : "unlocks"}
                    </p>
                  )}
                </div>
              </div>
            );
          }

          if (item.type === "auction") {
            const modelName = `${item.model.first_name || ""} ${item.model.last_name || ""}`.trim() || item.model.username;
            const price = item.current_bid || item.starting_price;
            const isWinning = item.myBidStatus === "winning";
            const isOutbid = item.myBidStatus === "outbid";
            return (
              <Link
                key={`auction-${item.id}`}
                href={`/bids/${item.id}`}
                className="block rounded-xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-pink-500/5 overflow-hidden hover:border-violet-500/40 transition-colors"
              >
                {item.cover_image_url && (
                  <div className="relative aspect-[3/1] bg-zinc-900">
                    <Image
                      src={item.cover_image_url}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 flex items-center gap-1 text-white/90">
                      <Gavel className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Live Bid</span>
                    </div>
                  </div>
                )}
                <div className="p-3 flex items-center gap-3">
                  <Avatar className="h-9 w-9 shrink-0 border border-violet-500/30">
                    <AvatarImage src={item.model.profile_photo_url || undefined} />
                    <AvatarFallback className="bg-zinc-700 text-zinc-300 text-sm">
                      {modelName[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {modelName} · {item.bid_count} {item.bid_count === 1 ? "bid" : "bids"} · {getTimeLeft(item.ends_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">{formatCoins(price)}</span>
                    </div>
                    {isWinning && <p className="text-xs text-amber-400 font-medium">Winning</p>}
                    {isOutbid && <p className="text-xs text-red-400 font-medium">Outbid</p>}
                  </div>
                </div>
              </Link>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
