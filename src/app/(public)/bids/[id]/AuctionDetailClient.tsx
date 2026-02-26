"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CountdownTimer, BidForm, BidHistory, WatchlistButton } from "@/components/auctions";
import { useAuctionRealtime } from "@/hooks/useAuctionRealtime";
import { coinsToUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import {
  Gavel,
  ArrowLeft,
  Coins,
  Eye,
  Clock,
  Zap,
  Shield,
  CheckCircle,
  Package,
} from "lucide-react";
import type { AuctionWithDetails, BidWithBidder } from "@/types/auctions";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface AuctionDetailClientProps {
  auction: AuctionWithDetails;
  bids: BidWithBidder[];
  isLoggedIn: boolean;
  isOwner: boolean;
  currentUserId?: string;
}

export function AuctionDetailClient({
  auction: initialAuction,
  bids: initialBids,
  isLoggedIn,
  isOwner,
  currentUserId,
}: AuctionDetailClientProps) {
  const router = useRouter();
  const [localEnded, setLocalEnded] = useState(false);

  const { auction, bids, isConnected } = useAuctionRealtime({
    auctionId: initialAuction.id,
    initialAuction,
    initialBids,
    currentUserId,
    onAuctionUpdate: (update) => {
      if (update.status && ["ended", "sold", "no_sale", "cancelled"].includes(update.status)) {
        setLocalEnded(true);
      }
    },
  });

  const hasEnded = localEnded || new Date(auction.ends_at) <= new Date() || auction.status !== "active";
  const currentPrice = auction.current_bid || auction.starting_price;

  return (
    <main className="container px-4 md:px-8 lg:px-16 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bids
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Image & Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Model Photo */}
          <div className="relative aspect-[3/4] max-w-sm rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
            {auction.model?.profile_image_url ? (
              <Image
                src={auction.model.profile_image_url}
                alt={auction.model.display_name || auction.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Gavel className="h-24 w-24 text-muted-foreground/30" />
              </div>
            )}

            {/* Status Badge */}
            {hasEnded && (
              <Badge className="absolute top-4 right-4 bg-zinc-800 text-white">
                {auction.status === "sold" ? "Sold" : auction.status === "no_sale" ? "No Sale" : "Ended"}
              </Badge>
            )}
          </div>

          {/* Title & Model */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">{auction.title}</h1>

            {auction.model && (
              <Link
                href={`/${auction.model.slug}`}
                className="inline-flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <Avatar className="h-12 w-12 border-2 border-pink-500">
                  <AvatarImage src={auction.model.profile_image_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                    {auction.model.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{auction.model.display_name}</p>
                  <p className="text-sm text-zinc-400">@{auction.model.slug}</p>
                </div>
              </Link>
            )}
          </div>

          {/* Description */}
          {auction.description && (
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-pink-400" />
                About This Listing
              </h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{auction.description}</p>
            </div>
          )}

          {/* Deliverables */}
          {auction.deliverables && (
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                What You&apos;ll Get
              </h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{auction.deliverables}</p>
            </div>
          )}

          {/* Bid History */}
          <div>
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Gavel className="h-5 w-5 text-violet-400" />
              Bid History
            </h2>
            <BidHistory bids={bids} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Right Column - Bidding */}
        <div className="space-y-6">
          <ErrorBoundary>
          {/* Sticky Bid Section */}
          <div className="lg:sticky lg:top-24 space-y-6">
            {/* Connection Status */}
            {isConnected && (
              <div className="flex items-center gap-2 text-xs text-green-400">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                Live updates enabled
              </div>
            )}

            {/* Countdown Timer */}
            {!hasEnded && (
              <div className="glass-card p-6 rounded-xl text-center">
                <p className="text-sm text-zinc-400 mb-2 flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Remaining
                </p>
                <CountdownTimer
                  endsAt={auction.ends_at}
                  onEnd={() => setLocalEnded(true)}
                />
              </div>
            )}

            {/* Price Display */}
            <div className="glass-card p-6 rounded-xl" aria-live="polite" aria-atomic="true">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-zinc-400">
                  {auction.current_bid ? "Current Bid" : "Starting Price"}
                </span>
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-zinc-500" />
                  <span className="text-sm text-zinc-500">
                    {auction.watchlist_count || 0} watching
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-3xl font-bold">{formatCoins(currentPrice)}</p>
                  <p className="text-sm text-zinc-500">{formatUsd(coinsToUsd(currentPrice))}</p>
                </div>
              </div>

              {auction.buy_now_price && !hasEnded && (
                <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-zinc-400">Buy Now:</span>
                  <span className="font-semibold">{formatCoins(auction.buy_now_price)} coins</span>
                </div>
              )}

              {auction.reserve_price && !hasEnded && (
                <div className="mt-2 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-violet-400" />
                  <span className="text-sm text-zinc-400">
                    {currentPrice >= auction.reserve_price
                      ? "Reserve met"
                      : "Reserve not met"}
                  </span>
                </div>
              )}
            </div>

            {/* Bid Form or Login Prompt */}
            {isLoggedIn ? (
              <div id="bid-form">
                <BidForm
                  auction={auction}
                  disabled={hasEnded}
                  isOwner={isOwner}
                />
              </div>
            ) : (
              <div className="glass-card p-6 rounded-xl text-center space-y-4">
                <p className="text-zinc-400">Sign in to place a bid</p>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                >
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            )}

            {/* Watchlist Button */}
            {isLoggedIn && !isOwner && (
              <WatchlistButton
                auctionId={auction.id}
                isWatching={auction.is_watching || false}
                className="w-full"
              />
            )}

            {/* Anti-sniping Notice */}
            {!hasEnded && auction.anti_snipe_minutes > 0 && (
              <p className="text-xs text-zinc-500 text-center">
                Bids in the final {auction.anti_snipe_minutes} minutes will extend the timer
              </p>
            )}
          </div>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}
