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
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-6 -ml-2 text-white/60 hover:text-white hover:bg-white/5"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bids
      </Button>

      {/* Winner Banner */}
      {isWinner && (
        <div className="mb-6 relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-amber-500/25 border border-amber-500/50 p-5 flex items-center gap-4 shadow-[0_0_32px_rgba(245,158,11,0.3)]">
          <div className="pointer-events-none absolute -top-12 -left-12 w-32 h-32 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 w-32 h-32 rounded-full bg-yellow-400/30 blur-3xl" />
          <div className="relative p-3 rounded-xl bg-amber-500/30 ring-1 ring-amber-400/60 shrink-0 shadow-[0_0_18px_rgba(245,158,11,0.5)]">
            <Trophy className="h-7 w-7 text-amber-200" />
          </div>
          <div className="relative flex-1">
            <p className="font-bold text-amber-200 text-lg">You won this auction! 🎉</p>
            <p className="text-sm text-amber-100/80 mt-0.5">
              Final price: <span className="font-semibold">{formatCoins(currentPrice)}</span> ({formatUsd(coinsToFanUsd(currentPrice))}) — the model will reach out to arrange delivery.
            </p>
          </div>
          <Link
            href="/chats"
            className="relative shrink-0 text-xs font-bold px-4 py-2 rounded-full bg-amber-500/30 hover:bg-amber-500/40 text-amber-100 border border-amber-400/50 transition-all hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]"
          >
            Messages →
          </Link>
        </div>
      )}

      {/* Model + Title — always at top on all screen sizes */}
      <div className="flex items-start gap-4 mb-6">
        {auction.model && (
          <Link href={`/${auction.model.slug}`} className="shrink-0 mt-1 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-md opacity-60 group-hover:opacity-100 transition-opacity" />
              <Avatar className="relative h-12 w-12 border-2 border-pink-500 group-hover:border-pink-400 transition-colors">
                <AvatarImage src={auction.model.profile_image_url || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                  {auction.model.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
            </div>
          </Link>
        )}
        <div className="flex-1 min-w-0">
          {auction.model && (
            <Link
              href={`/${auction.model.slug}`}
              className="text-xs text-pink-400 hover:text-pink-300 transition-colors mb-0.5 inline-block font-semibold"
            >
              @{auction.model.slug}
            </Link>
          )}
          <h1 className="text-2xl md:text-3xl font-bold leading-tight text-white">{auction.title}</h1>
          {hasEnded && (
            <span className={`mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full border ${
              auction.status === "sold"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                : auction.status === "cancelled"
                ? "bg-rose-500/15 text-rose-300 border-rose-500/40"
                : "bg-white/10 text-white/60 border-white/20"
            }`}>
              {auction.status === "sold" ? "Sold" : auction.status === "no_sale" ? "No Sale" : auction.status === "cancelled" ? "Cancelled" : "Ended"}
            </span>
          )}
        </div>
        <ShareButton title={auction.title} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 transition-all shadow-[0_0_14px_rgba(236,72,153,0.4)]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column — shown 2nd on mobile, 1st on desktop */}
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">

          {/* About */}
          {auction.description && (
            <div className="border-t border-white/10 pt-5">
              <p className="text-[10px] text-pink-300 uppercase tracking-[0.2em] font-semibold mb-3">Description</p>
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{auction.description}</p>
            </div>
          )}

          {/* Deliverables */}
          {auction.deliverables && (
            <div className="border-t border-white/10 pt-5">
              <p className="text-[10px] text-violet-300 uppercase tracking-[0.2em] font-semibold mb-3">What&apos;s Included</p>
              <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{auction.deliverables}</p>
            </div>
          )}

          {/* Bid History */}
          <div className="border-t border-white/10 pt-5">
            <p className="text-[10px] text-cyan-300 uppercase tracking-[0.2em] font-semibold mb-3">Bid History</p>
            <BidHistory bids={bids} currentUserId={currentUserId} />
          </div>
        </div>

        {/* Right Column — shown 1st on mobile, 2nd on desktop */}
        <div className="space-y-4 order-1 lg:order-2">
          <ErrorBoundary>
          <div className="lg:sticky lg:top-24 space-y-4">

            {/* Single merged card: price + countdown + bid input + button */}
            <div className="glass-card p-5 rounded-2xl space-y-5 shadow-[0_0_24px_rgba(236,72,153,0.15)]" aria-live="polite" aria-atomic="true">

              {/* Top row: Live + watching */}
              <div className="flex items-center justify-between text-xs">
                {!hasEnded ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    </span>
                    <span className="font-semibold uppercase tracking-wider text-emerald-300">Live</span>
                  </div>
                ) : <div />}
                {(auction.watchlist_count || 0) > 0 && (
                  <div className="flex items-center gap-1 text-white/40">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="font-medium">{auction.watchlist_count} watching</span>
                  </div>
                )}
              </div>

              {/* Current price + countdown side by side */}
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1">
                    {auction.current_bid ? "Current Bid" : "Starting Price"}
                    {bids.length > 0 && <span className="ml-1 text-white/40 normal-case tracking-normal">· {bids.length} {bids.length === 1 ? "bid" : "bids"}</span>}
                  </p>
                  <div className="flex items-baseline gap-2">
                    <Coins className="h-5 w-5 text-amber-400 shrink-0 self-center" />
                    <span className="text-3xl font-bold leading-none bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">
                      {formatCoins(currentPrice)}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 mt-1">{formatUsd(coinsToFanUsd(currentPrice))}</p>
                </div>
                {!hasEnded && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50 mb-1 flex items-center justify-end gap-1">
                      <Clock className="h-3 w-3 text-pink-400" />
                      Ends in
                    </p>
                    <CountdownTimer endsAt={auction.ends_at} onEnd={() => setLocalEnded(true)} compact />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

              {/* Bid input + button */}
              {isLoggedIn ? (
                isOwner ? (
                  <p className="text-center text-sm text-white/50 py-1">This is your listing</p>
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
                    className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 transition-all text-base shadow-[0_0_24px_rgba(236,72,153,0.4)] hover:shadow-[0_0_32px_rgba(236,72,153,0.6)] active:scale-[0.98]"
                  >
                    Place a Bid
                  </button>
                </div>
              ) : null}

            </div>

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
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-4 py-3 bg-[#0a0014]/95 backdrop-blur-xl border-t border-violet-500/20 shadow-[0_-8px_24px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/50">
                {auction.current_bid ? "Current Bid" : "Starting"}
              </p>
              <div className="flex items-baseline gap-1.5">
                <Coins className="h-4 w-4 text-amber-400 shrink-0 self-center" />
                <span className="font-bold text-white text-lg bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">
                  {formatCoins(currentPrice)}
                </span>
                <span className="text-white/50 text-xs">{formatUsd(coinsToFanUsd(currentPrice))}</span>
              </div>
            </div>
            <button
              onClick={handleBidButtonClick}
              className="shrink-0 px-6 py-3 rounded-full font-bold text-white bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 active:scale-[0.97] transition-all shadow-[0_0_20px_rgba(236,72,153,0.5)]"
            >
              {isLoggedIn ? "Place a Bid" : "Sign In to Bid"}
            </button>
          </div>
        </div>
      )}

      {/* Sign-in dialog for logged-out users */}
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Coins className="h-5 w-5 text-amber-400" />
              Sign in to place a bid
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSignIn} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="bid-email" className="text-white/80">Email</Label>
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
                <Label htmlFor="bid-password" className="text-white/80">Password</Label>
                <Link href="/forgot-password" className="text-xs text-pink-400 hover:text-pink-300 transition-colors" onClick={() => setSignInOpen(false)}>
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
              className="w-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 h-11 font-bold shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_28px_rgba(236,72,153,0.6)] border-0 transition-all"
            >
              {signingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In & Bid"}
            </Button>
            <p className="text-center text-xs text-white/50">
              Don&apos;t have an account?{" "}
              <Link href={`/signup?redirect=/bids/${auction.id}`} className="text-pink-400 hover:text-pink-300 font-semibold transition-colors" onClick={() => setSignInOpen(false)}>
                Sign Up
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
