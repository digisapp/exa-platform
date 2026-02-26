"use client";

import { useState } from "react";
import { AuctionCard } from "./AuctionCard";
import { AUCTION_CATEGORIES } from "@/types/auctions";
import type { AuctionWithModel, AuctionCategory } from "@/types/auctions";

const CATEGORY_EMOJIS: Record<AuctionCategory, string> = {
  video_call: "📞",
  custom_content: "🎬",
  meet_greet: "🤝",
  shoutout: "📲",
  experience: "✨",
  other: "💫",
};

interface BidsCategoryFilterProps {
  auctions: AuctionWithModel[];
  watchedIds: string[];
}

export function BidsCategoryFilter({ auctions, watchedIds }: BidsCategoryFilterProps) {
  const [activeCategory, setActiveCategory] = useState<AuctionCategory | "all">("all");

  const filtered = activeCategory === "all"
    ? auctions
    : auctions.filter((a) => a.category === activeCategory);

  // Only show categories that actually have bids
  const availableCategories = AUCTION_CATEGORIES.filter((cat) =>
    auctions.some((a) => a.category === cat.value)
  );

  if (auctions.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-16">No active bids right now. Check back soon!</p>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeCategory === "all"
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/20"
              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          🔥 All <span className="opacity-70">({auctions.length})</span>
        </button>
        {availableCategories.map((cat) => {
          const count = auctions.filter((a) => a.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat.value
                  ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/20"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {CATEGORY_EMOJIS[cat.value]} {cat.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No bids in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((auction) => (
            <AuctionCard
              key={auction.id}
              auction={auction}
              isWatching={watchedIds.includes(auction.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
