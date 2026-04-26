"use client";

import Link from "next/link";
import Image from "next/image";
import { Coins, Gavel, ArrowRight } from "lucide-react";
import { formatCoins } from "@/lib/coin-config";
import { useState, useEffect, useCallback } from "react";

interface AuctionItem {
  id: string;
  title: string;
  category: string | null;
  cover_image_url: string | null;
  current_bid: number;
  starting_price: number;
  bid_count: number;
  ends_at: string;
  model: {
    username: string;
    first_name: string | null;
    last_name: string | null;
    profile_photo_url: string | null;
  };
  myBidStatus: string | null;
}

interface LiveBidsPanelProps {
  auctions: AuctionItem[];
}

function useCountdowns(auctions: AuctionItem[]) {
  const getTimeLeft = useCallback((endsAt: string): string => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return "Ended";
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m left`;
    if (hours < 24) return `${hours}h left`;
    return `${days}d left`;
  }, []);

  const build = useCallback(() =>
    Object.fromEntries(auctions.map((a) => [a.id, getTimeLeft(a.ends_at)])),
    [auctions, getTimeLeft]
  );

  const [countdowns, setCountdowns] = useState(build);
  useEffect(() => {
    setCountdowns(build());
    const t = setInterval(() => setCountdowns(build()), 30_000);
    return () => clearInterval(t);
  }, [build]);

  return countdowns;
}

export function LiveBidsPanel({ auctions }: LiveBidsPanelProps) {
  const countdowns = useCountdowns(auctions);

  if (auctions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent overflow-hidden">
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold text-white">Live Bids</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
            {auctions.length}
          </span>
        </div>
        <Link
          href="/bids"
          className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="p-3 space-y-2">
        {auctions.map((auction) => {
          const modelName = `${auction.model.first_name || ""} ${auction.model.last_name || ""}`.trim() || auction.model.username;
          const price = auction.current_bid || auction.starting_price;
          const timeLeft = countdowns[auction.id] || "…";
          const isWinning = auction.myBidStatus === "winning";
          const isOutbid = auction.myBidStatus === "outbid";

          return (
            <Link
              key={auction.id}
              href={`/bids/${auction.id}`}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-violet-500/15 hover:border-violet-500/40 bg-white/3 hover:bg-white/6 transition-all group"
            >
              {/* Cover / avatar */}
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-violet-500/10">
                {auction.cover_image_url ? (
                  <Image
                    src={auction.cover_image_url}
                    alt={auction.title}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : auction.model.profile_photo_url ? (
                  <Image
                    src={auction.model.profile_photo_url}
                    alt={modelName}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Gavel className="h-4 w-4 text-violet-400" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{auction.title}</p>
                <p className="text-[11px] text-white/50 truncate">{modelName} · {timeLeft}</p>
                {isOutbid && (
                  <p className="text-[10px] text-red-400 font-semibold">You&apos;ve been outbid</p>
                )}
                {isWinning && (
                  <p className="text-[10px] text-amber-400 font-semibold">Winning</p>
                )}
              </div>

              {/* Price */}
              <div className="flex items-center gap-1 text-amber-400 shrink-0">
                <Coins className="h-3 w-3" />
                <span className="text-xs font-bold">{formatCoins(price)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
