import Link from "next/link";
import { AuctionCard } from "./AuctionCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import type { AuctionWithModel } from "@/types/auctions";

interface BidsCategoryFilterProps {
  auctions: AuctionWithModel[];
  watchedIds: string[];
}

export function BidsCategoryFilter({ auctions, watchedIds }: BidsCategoryFilterProps) {
  // Sort by ending soonest
  const sorted = [...auctions].sort(
    (a, b) => new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime()
  );

  if (auctions.length === 0) {
    return (
      <div className="text-center py-24 space-y-4">
        <p className="text-5xl">🔨</p>
        <p className="text-white font-semibold text-lg">No active listings yet</p>
        <p className="text-zinc-500 text-sm max-w-xs mx-auto leading-relaxed">
          Be the first — models can create an auction for custom content, video calls, and more.
        </p>
        <Link
          href="/dashboard/bids/new"
          className="inline-block mt-2 text-sm font-semibold bg-gradient-to-r from-pink-500 to-violet-500 text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          Create a Listing →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Grid / List */}
      {sorted.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No bids in this category yet.</p>
      ) : (
        <>
          {/* Mobile: compact rows */}
          <div className="sm:hidden space-y-2">
            {sorted.map((auction) => {
              const price = auction.current_bid || auction.starting_price;
              return (
                <Link
                  key={auction.id}
                  href={`/bids/${auction.id}`}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
                >
                  <Avatar className="h-16 w-16 shrink-0 border border-zinc-700">
                    <AvatarImage src={auction.model?.profile_image_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-base">
                      {auction.model?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white truncate">{auction.title}</p>
                    <p className="text-sm text-zinc-400 truncate mt-0.5">
                      @{auction.model?.slug || auction.model?.display_name}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-bold text-white">{formatUsd(coinsToFanUsd(price))}</p>
                    {auction.bid_count > 0 && (
                      <p className="text-xs text-zinc-500 mt-0.5">{auction.bid_count} {auction.bid_count === 1 ? "bid" : "bids"}</p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Desktop: portrait grid */}
          <div className="hidden sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sorted.map((auction) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                isWatching={watchedIds.includes(auction.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
