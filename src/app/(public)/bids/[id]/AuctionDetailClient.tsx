"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CountdownTimer, BidForm, BidHistory, WatchlistButton } from "@/components/auctions";
import { useAuctionRealtime } from "@/hooks/useAuctionRealtime";
import { coinsToFanUsd, formatUsd, formatCoins } from "@/lib/coin-config";
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
  Trophy,
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

  const { auction, bids, isConnected, refreshBids } = useAuctionRealtime({
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
  const isWinner = hasEnded && auction.status === "sold" && auction.winner_id && currentUserId && auction.winner_id === currentUserId;

  // Find the current user's existing bid escrow so BidForm can show the true additional cost
  const myCurrentBid = currentUserId
    ? bids.find((b) => b.bidder?.id === currentUserId && ["winning", "active", "outbid"].includes(b.status))
    : undefined;
  const myEscrowAmount = myCurrentBid?.escrow_amount ?? 0;

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

      {/* Winner Banner */}
      {isWinner && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 border border-amber-500/40 p-5 flex items-center gap-4">
          <div className="p-3 rounded-full bg-amber-500/20 shrink-0">
            <Trophy className="h-7 w-7 text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-amber-300 text-lg">You won this auction!</p>
            <p className="text-sm text-amber-400/80">
              Final price: {formatCoins(currentPrice)} coins ({formatUsd(coinsToFanUsd(currentPrice))}) — the model will be in touch to arrange delivery.
            </p>
          </div>
          <Link
            href="/dashboard/messages"
            className="shrink-0 text-xs font-medium px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
          >
            View Messages
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title & Model */}
          <div>
            <div className="flex items-start gap-4 mb-4">
              {auction.model && (
                <Link href={`/${auction.model.slug}`} className="shrink-0 mt-1">
                  <Avatar className="h-14 w-14 border-2 border-pink-500">
                    <AvatarImage src={auction.model.profile_image_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-lg">
                      {auction.model.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                </Link>
              )}
              <div>
                {auction.model && (
                  <Link
                    href={`/${auction.model.slug}`}
                    className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-1 inline-block"
                  >
                    @{auction.model.slug}
                  </Link>
                )}
                <h1 className="text-2xl md:text-3xl font-bold leading-tight">{auction.title}</h1>
                {hasEnded && (
                  <span className={`mt-2 inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${
                    auction.status === "sold"
                      ? "bg-green-500/15 text-green-400 border border-green-500/30"
                      : auction.status === "cancelled"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "bg-zinc-700/60 text-zinc-300 border border-zinc-600/40"
                  }`}>
                    {auction.status === "sold" ? "Sold" : auction.status === "no_sale" ? "No Sale" : auction.status === "cancelled" ? "Cancelled" : "Ended"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {auction.description && (
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5 text-pink-400" />
                About
              </h2>
              <p className="text-zinc-300 whitespace-pre-wrap">{auction.description}</p>
            </div>
          )}

          {/* Deliverables */}
          {auction.deliverables && (
            <div className="glass-card p-6 rounded-xl">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Deliverables
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
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">
                    {auction.current_bid ? "Current Bid" : "Starting Price"}
                  </span>
                  {bids.length > 0 && (
                    <span className="text-xs text-zinc-500">
                      · {bids.length} {bids.length === 1 ? "bid" : "bids"}
                    </span>
                  )}
                </div>
                {(auction.watchlist_count || 0) > 0 && (
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-zinc-500" />
                    <span className="text-sm text-zinc-500">
                      {auction.watchlist_count} watching
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Coins className="h-8 w-8 text-amber-400" />
                <div>
                  <p className="text-3xl font-bold">{formatCoins(currentPrice)}</p>
                  <p className="text-sm text-zinc-500">{formatUsd(coinsToFanUsd(currentPrice))}</p>
                </div>
              </div>

              {auction.buy_now_price && !hasEnded && (
                <div className="mt-4 pt-4 border-t border-zinc-700 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span className="text-sm text-zinc-400">Buy Now:</span>
                  <span className="font-semibold">{formatCoins(auction.buy_now_price)} coins</span>
                  <span className="text-zinc-500 text-sm">({formatUsd(coinsToFanUsd(auction.buy_now_price))})</span>
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

              {!hasEnded && auction.anti_snipe_minutes > 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  Bids in the final {auction.anti_snipe_minutes} minutes will extend the timer
                </p>
              )}
            </div>

            {/* Bid Form or Login Prompt */}
            {isLoggedIn ? (
              isOwner ? (
                <div className="glass-card p-5 rounded-xl text-center space-y-1">
                  <p className="text-sm font-medium text-zinc-300">This is your auction</p>
                  <p className="text-xs text-zinc-500">You cannot bid on your own listing</p>
                </div>
              ) : (
                <div id="bid-form">
                  <BidForm
                    auction={auction}
                    disabled={hasEnded}
                    isOwner={isOwner}
                    myEscrowAmount={myEscrowAmount}
                    onBidPlaced={() => refreshBids()}
                    onBuyNow={() => refreshBids()}
                  />
                </div>
              )
            ) : (
              <div className="glass-card p-6 rounded-xl text-center space-y-4">
                <p className="text-zinc-400">Sign in to place a bid</p>
                <Button
                  asChild
                  className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                >
                  <Link href={`/signin?redirect=/bids/${auction.id}`}>Sign In</Link>
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

          </div>
          </ErrorBoundary>
        </div>
      </div>
    </main>
  );
}
