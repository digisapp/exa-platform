"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CountdownTimer, BidForm, BidHistory, WatchlistButton } from "@/components/auctions";
import { useAuctionRealtime } from "@/hooks/useAuctionRealtime";
import { coinsToFanUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Coins,
  Eye,
  Clock,
  Trophy,
  Loader2,
} from "lucide-react";
import type { AuctionWithDetails, BidWithBidder } from "@/types/auctions";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ShareButton } from "@/components/auctions/ShareButton";

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
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const supabase = createClient();

  const { auction, bids, refreshBids } = useAuctionRealtime({
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

  const myCurrentBid = currentUserId
    ? bids.find((b) => b.bidder?.id === currentUserId && ["winning", "active", "outbid"].includes(b.status))
    : undefined;
  const myEscrowAmount = myCurrentBid?.escrow_amount ?? 0;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigningIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (error) throw error;
      if (data.user) {
        setSignInOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err.message || "Invalid email or password");
    } finally {
      setSigningIn(false);
    }
  };

  const handleBidButtonClick = () => {
    if (isLoggedIn) {
      document.getElementById("bid-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setSignInOpen(true);
    }
  };

  return (
    <main className="container px-4 md:px-8 lg:px-16 py-8 pb-28 lg:pb-8">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => router.back()} className="mb-6 -ml-2">
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
              Final price: {formatCoins(currentPrice)} ({formatUsd(coinsToFanUsd(currentPrice))}) — the model will be in touch to arrange delivery.
            </p>
          </div>
          <Link
            href="/dashboard/messages"
            className="shrink-0 text-xs font-medium px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
          >
            Messages
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — shown 2nd on mobile, 1st on desktop */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          {/* Model + Title */}
          <div className="flex items-start gap-4">
            {auction.model && (
              <Link href={`/${auction.model.slug}`} className="shrink-0 mt-1">
                <Avatar className="h-12 w-12 border-2 border-pink-500">
                  <AvatarImage src={auction.model.profile_image_url || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                    {auction.model.display_name?.[0] || "?"}
                  </AvatarFallback>
                </Avatar>
              </Link>
            )}
            <div className="flex-1 min-w-0">
              {auction.model && (
                <Link
                  href={`/${auction.model.slug}`}
                  className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors mb-0.5 inline-block"
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
            <ShareButton title={auction.title} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:opacity-90 transition-opacity" />
          </div>

          {/* About */}
          {auction.description && (
            <div className="border-t border-zinc-800 pt-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Description</p>
              <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{auction.description}</p>
            </div>
          )}

          {/* Deliverables */}
          {auction.deliverables && (
            <div className="border-t border-zinc-800 pt-5">
              <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">What&apos;s Included</p>
              <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{auction.deliverables}</p>
            </div>
          )}

          {/* Bid History */}
          <div className="border-t border-zinc-800 pt-5">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Bid History</p>
            <BidHistory bids={bids} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Right Column — shown 1st on mobile, 2nd on desktop */}
        <div className="space-y-4 order-1 lg:order-2">
          <ErrorBoundary>
          <div className="lg:sticky lg:top-24 space-y-4">

            {/* Combined price + countdown card */}
            <div className="glass-card p-5 rounded-2xl space-y-4" aria-live="polite" aria-atomic="true">
              {/* Meta row */}
              <div className="flex items-center justify-between text-xs">
                {!hasEnded ? (
                  <div className="flex items-center gap-1.5 text-green-400">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-400" />
                    </span>
                    Live
                  </div>
                ) : <div />}
                {(auction.watchlist_count || 0) > 0 && (
                  <div className="flex items-center gap-1 text-zinc-500">
                    <Eye className="h-3.5 w-3.5" />
                    {auction.watchlist_count} watching
                  </div>
                )}
              </div>

              {/* Countdown */}
              {!hasEnded && (
                <div className="text-center pb-1">
                  <p className="text-xs text-zinc-500 mb-1.5 flex items-center justify-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Ends in
                  </p>
                  <CountdownTimer endsAt={auction.ends_at} onEnd={() => setLocalEnded(true)} />
                </div>
              )}

              {/* Price */}
              <div className="pt-1 border-t border-zinc-700/50">
                <p className="text-xs text-zinc-500 mb-1.5">
                  {auction.current_bid ? "Current Bid" : "Starting Price"}
                  {bids.length > 0 && (
                    <span className="ml-1.5">· {bids.length} {bids.length === 1 ? "bid" : "bids"}</span>
                  )}
                </p>
                <div className="flex items-center gap-2.5">
                  <Coins className="h-7 w-7 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-3xl font-bold leading-none">{formatCoins(currentPrice)}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">{formatUsd(coinsToFanUsd(currentPrice))}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* Bid Form / CTA */}
            {isLoggedIn ? (
              isOwner ? (
                <p className="text-center text-sm text-zinc-500 py-2">This is your listing</p>
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
            ) : !hasEnded ? (
              <div id="bid-section">
                <button
                  onClick={() => setSignInOpen(true)}
                  className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 transition-all shadow-lg shadow-pink-500/20 text-base"
                >
                  Place a Bid
                </button>
              </div>
            ) : null}

            {/* Watchlist */}
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

      {/* Sticky mobile bid bar */}
      {!hasEnded && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-500">{auction.current_bid ? "Current Bid" : "Starting"}</p>
              <div className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="font-bold text-white text-lg">{formatCoins(currentPrice)}</span>
                <span className="text-zinc-500 text-sm">{formatUsd(coinsToFanUsd(currentPrice))}</span>
              </div>
            </div>
            <button
              onClick={handleBidButtonClick}
              className="shrink-0 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 active:scale-95 transition-transform shadow-lg shadow-pink-500/25"
            >
              {isLoggedIn ? "Place a Bid" : "Sign In to Bid"}
            </button>
          </div>
        </div>
      )}

      {/* Sign-in dialog for logged-out users */}
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="max-w-sm bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Sign in to place a bid</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSignIn} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="bid-email">Email</Label>
              <Input
                id="bid-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={signingIn}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="bid-password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-zinc-300" onClick={() => setSignInOpen(false)}>
                  Forgot password?
                </Link>
              </div>
              <Input
                id="bid-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={signingIn}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={signingIn}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-11"
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In & Bid"}
            </Button>
            <p className="text-center text-xs text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link href={`/signup?redirect=/bids/${auction.id}`} className="text-pink-400 hover:underline" onClick={() => setSignInOpen(false)}>
                Sign Up
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
