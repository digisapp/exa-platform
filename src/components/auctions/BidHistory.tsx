"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCoins, coinsToFanUsd, formatUsd } from "@/lib/coin-config";
import { formatDistanceToNow } from "date-fns";
import { Coins, Crown, Zap } from "lucide-react";
import type { BidWithBidder } from "@/types/auctions";

interface BidHistoryProps {
  bids: BidWithBidder[];
  currentUserId?: string;
  showLeader?: boolean;
}

export function BidHistory({ bids, currentUserId, showLeader = true }: BidHistoryProps) {
  if (bids.length === 0) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <p className="text-zinc-400">No bids yet. Be the first to bid!</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-zinc-700">
        <p className="text-sm text-zinc-500">{bids.length} bid{bids.length !== 1 && "s"}</p>
      </div>

      <div className="divide-y divide-zinc-800">
        {bids.map((bid, index) => {
          const isLeader = index === 0 && showLeader;
          const isCurrentUser = currentUserId && bid.bidder?.id === currentUserId;

          return (
            <div
              key={bid.id}
              className={`p-4 flex items-center gap-3 ${
                isLeader ? "bg-gradient-to-r from-amber-500/10 to-transparent" : ""
              } ${isCurrentUser ? "bg-pink-500/5" : ""}`}
            >
              {/* Avatar */}
              <Avatar className="h-10 w-10 border border-zinc-700">
                <AvatarImage src={bid.bidder?.profile_image_url || undefined} />
                <AvatarFallback className="bg-zinc-800 text-zinc-400">
                  {bid.bidder?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>

              {/* Bidder Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${isCurrentUser ? "text-pink-400" : "text-white"}`}>
                    {isCurrentUser ? "You" : (bid.bidder?.display_name || "Anonymous")}
                  </span>
                  {isLeader && (
                    <Crown className="h-4 w-4 text-amber-400 flex-shrink-0" />
                  )}
                  {bid.is_buy_now && (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                      <Zap className="h-3 w-3 mr-1" />
                      Buy Now
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                </p>
              </div>

              {/* Bid Amount */}
              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-1.5 justify-end">
                  <Coins className="h-4 w-4 text-amber-400" />
                  <span className={`font-semibold ${isLeader ? "text-amber-400" : "text-white"}`}>
                    {formatCoins(bid.amount)}
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  {formatUsd(coinsToFanUsd(bid.amount))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BidHistory;
