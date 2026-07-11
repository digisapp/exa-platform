"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, ChevronDown, Heart } from "lucide-react";
import { PremiumContentCard } from "@/components/content/PremiumContentCard";
import { useState, useEffect } from "react";

export type FeedItem = {
  type: "content";
  id: string;
  model: {
    username: string;
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
};

interface ForYouFeedProps {
  items: FeedItem[];
  coinBalance: number;
}

const PAGE_SIZE = 8;

export function ForYouFeed({ items, coinBalance }: ForYouFeedProps) {
  // Sync balance when prop changes (e.g. navigation back to page)
  const [balance, setBalance] = useState(coinBalance);
  useEffect(() => {
    setBalance(coinBalance);
  }, [coinBalance]);

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const handleUnlock = (_contentId: string, newBalance: number) => {
    setBalance(newBalance);
  };

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  if (items.length === 0) {
    return (
      <div className="text-center py-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-pink-500/10 mb-4">
          <Heart className="h-7 w-7 text-pink-500" />
        </div>
        <h3 className="text-lg font-semibold mb-1">Your feed is empty</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Follow models to see their latest content here
        </p>
        <Button asChild size="sm" className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
          <Link href="/models">Discover Models</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
        <Sparkles className="h-5 w-5 text-pink-500" />
        For You
      </h3>
      <div className="space-y-4">
        {visibleItems.map((item) => {
            const modelName = item.model.username;
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
                    {item.isFollowed && (
                      <p className="text-xs text-muted-foreground">Following</p>
                    )}
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
                </div>
              </div>
            );
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="gap-1.5"
          >
            <ChevronDown className="h-4 w-4" />
            Show More
          </Button>
        </div>
      )}
    </div>
  );
}
