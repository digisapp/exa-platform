import Link from "next/link";
import { AuctionCard } from "./AuctionCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Coins } from "lucide-react";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
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
      <div className="text-center py-20 space-y-4">
        <p className="text-muted-foreground text-lg">No active bids right now.</p>
        <p className="text-zinc-600 text-sm">Check back soon — new listings go live daily.</p>
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
                  className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors"
                >
                  <Avatar className="h-10 w-10 shrink-0 border border-zinc-700">
                    <AvatarImage src={auction.model?.profile_image_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-sm">
                      {auction.model?.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{auction.title}</p>
                    <p className="text-xs text-zinc-400 truncate">
                      @{auction.model?.slug || auction.model?.display_name}
                      {auction.bid_count > 0 && (
                        <span className="text-zinc-600"> · {auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-amber-400 justify-end">
                      <Coins className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">{formatCoins(price)}</span>
                    </div>
                    <p className="text-xs text-zinc-500">({formatUsd(coinsToFanUsd(price))})</p>
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
