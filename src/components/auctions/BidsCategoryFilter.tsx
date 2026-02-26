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

type FilterMode = AuctionCategory | "all" | "buy_now" | "watching";
type SortOption = "ending_soon" | "newest" | "most_bids" | "price_high" | "price_low";

interface BidsCategoryFilterProps {
  auctions: AuctionWithModel[];
  watchedIds: string[];
}

export function BidsCategoryFilter({ auctions, watchedIds }: BidsCategoryFilterProps) {
  const [activeFilter, setActiveFilter] = useState<FilterMode>("all");
  const [sort, setSort] = useState<SortOption>("ending_soon");

  // Apply filter
  let filtered = auctions;
  if (activeFilter === "buy_now") {
    filtered = auctions.filter((a) => a.buy_now_price);
  } else if (activeFilter === "watching") {
    filtered = auctions.filter((a) => watchedIds.includes(a.id));
  } else if (activeFilter !== "all") {
    filtered = auctions.filter((a) => a.category === activeFilter);
  }

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "ending_soon":
        return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "most_bids":
        return (b.bid_count || 0) - (a.bid_count || 0);
      case "price_high":
        return (b.current_bid || b.starting_price) - (a.current_bid || a.starting_price);
      case "price_low":
        return (a.current_bid || a.starting_price) - (b.current_bid || b.starting_price);
      default:
        return 0;
    }
  });

  // Only show categories that have active bids
  const availableCategories = AUCTION_CATEGORIES.filter((cat) =>
    auctions.some((a) => a.category === cat.value)
  );

  const hasBuyNow = auctions.some((a) => a.buy_now_price);
  const hasWatching = watchedIds.length > 0;

  if (auctions.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground text-lg">No active bids right now.</p>
        <p className="text-zinc-600 text-sm">Check back soon — new listings go live daily.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter pills + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* All */}
        <button
          onClick={() => setActiveFilter("all")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
            activeFilter === "all"
              ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/20"
              : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
          }`}
        >
          🔥 All <span className="opacity-70">({auctions.length})</span>
        </button>

        {/* Category pills */}
        {availableCategories.map((cat) => {
          const count = auctions.filter((a) => a.category === cat.value).length;
          return (
            <button
              key={cat.value}
              onClick={() => setActiveFilter(cat.value)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeFilter === cat.value
                  ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-md shadow-pink-500/20"
                  : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
              }`}
            >
              {CATEGORY_EMOJIS[cat.value]} {cat.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}

        {/* Buy Now pill */}
        {hasBuyNow && (
          <button
            onClick={() => setActiveFilter("buy_now")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === "buy_now"
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/20"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            ⚡ Buy Now <span className="opacity-70">({auctions.filter((a) => a.buy_now_price).length})</span>
          </button>
        )}

        {/* Watching pill */}
        {hasWatching && (
          <button
            onClick={() => setActiveFilter("watching")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === "watching"
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md shadow-blue-500/20"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            👁 Watching <span className="opacity-70">({watchedIds.length})</span>
          </button>
        )}

        {/* Sort dropdown — pushed to right */}
        <div className="ml-auto">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 border border-zinc-700 focus:border-pink-500 focus:outline-none cursor-pointer"
          >
            <option value="ending_soon">⏰ Ending Soon</option>
            <option value="newest">✨ Newest</option>
            <option value="most_bids">🔥 Most Bids</option>
            <option value="price_high">💰 Price: High</option>
            <option value="price_low">💸 Price: Low</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No bids in this category yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sorted.map((auction) => (
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
