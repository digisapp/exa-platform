"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CountdownTimer, BidForm } from "@/components/auctions";
import { useAuctionRealtime } from "@/hooks/useAuctionRealtime";
import { AUCTION_DEFAULTS } from "@/types/auctions";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { coinsToFanUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  X,
  Coins,
  Eye,
  Share2,
  Wallet,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { AuctionWithDetails, BidWithBidder } from "@/types/auctions";

interface Props {
  auction: AuctionWithDetails;
  bids: BidWithBidder[];
  isLoggedIn: boolean;
  isOwner: boolean;
  currentUserId?: string;
}

export function LiveAuctionShell({
  auction: initialAuction,
  bids: initialBids,
  isLoggedIn,
  isOwner,
  currentUserId,
}: Props) {
  const router = useRouter();
  const coinBalance = useCoinBalanceOptional();
  const [bidSheetOpen, setBidSheetOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [localEnded, setLocalEnded] = useState(false);
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
  const minNextBid = auction.current_bid
    ? auction.current_bid + AUCTION_DEFAULTS.minBidIncrement
    : auction.starting_price;
  const topBidder = bids[0];
  const isMyTopBid = topBidder?.bidder?.id === currentUserId;

  const myCurrentBid = currentUserId
    ? bids.find((b) => b.bidder?.id === currentUserId && ["winning", "active", "outbid"].includes(b.status))
    : undefined;
  const myEscrowAmount = myCurrentBid?.escrow_amount ?? 0;

  const modelName = auction.model?.display_name || auction.model?.slug || "Model";

  const handleBidClick = () => {
    if (isLoggedIn) {
      setBidSheetOpen(true);
    } else {
      setSignInOpen(true);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: auction.title, text: `Live bid on EXA: ${auction.title}`, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Invalid email or password";
      toast.error(message);
    } finally {
      setSigningIn(false);
    }
  };

  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push(`/bids/${auction.id}`);
  };

  // Fall back to the model's profile photo when the auction has no dedicated cover.
  // Keeps the live view visual even for auctions created before the cover field existed.
  const stageImage = auction.cover_image_url || auction.model?.profile_image_url || null;

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-hidden text-white">
      {/* Backdrop: blurred image fills full viewport for letterbox margins on desktop */}
      {stageImage && (
        <div className="absolute inset-0 pointer-events-none">
          <Image
            src={stageImage}
            alt=""
            fill
            aria-hidden
            className="object-cover scale-110 blur-3xl opacity-50"
            sizes="100vw"
          />
        </div>
      )}

      {/* 9:16 stage centered on desktop, full-bleed on mobile */}
      <div className="relative h-[100dvh] w-full flex items-center justify-center">
        <div className="relative h-full w-full md:h-[100dvh] md:aspect-[9/16] md:max-w-[min(56.25dvh,520px)] md:rounded-3xl md:overflow-hidden md:shadow-[0_0_80px_rgba(236,72,153,0.25)] md:border md:border-white/10">

          {/* Stage media (cover image with Ken Burns) */}
          {stageImage ? (
            <motion.div
              className="absolute inset-0"
              initial={{ scale: 1.0 }}
              animate={{ scale: 1.12 }}
              transition={{ duration: 18, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
            >
              <Image
                src={stageImage}
                alt={auction.title}
                fill
                priority
                className="object-cover"
                sizes="(min-width: 768px) 520px, 100vw"
              />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-fuchsia-900 to-pink-900" />
          )}

          {/* Top + bottom legibility gradients */}
          <div className="absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black/85 via-black/50 to-transparent pointer-events-none" />

          {/* ─── TOP BAR ─── */}
          <div
            className="absolute top-0 inset-x-0 flex items-start justify-between gap-3 px-4 pt-3"
            style={{ paddingTop: "max(env(safe-area-inset-top), 0.75rem)" }}
          >
            {/* Seller block + LIVE badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-center gap-2.5 max-w-[70%]"
            >
              {auction.model && (
                <Link href={`/${auction.model.slug}`} className="shrink-0 group">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-pink-500/60 blur-md opacity-70" />
                    <Avatar className="relative h-10 w-10 border-2 border-pink-500">
                      <AvatarImage src={auction.model.profile_image_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-sm">
                        {modelName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </Link>
              )}
              <div className="min-w-0 flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm truncate">{modelName}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {!hasEnded ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/90 text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                      </span>
                      Live
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/15 text-[9px] font-bold uppercase tracking-wider">
                      Ended
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] text-white/70">
                    <Eye className="h-3 w-3" />
                    {auction.watchlist_count || 0}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Close */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={close}
              aria-label="Close"
              className="shrink-0 h-9 w-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-black/60 active:scale-95 transition-all"
            >
              <X className="h-4 w-4" />
            </motion.button>
          </div>

          {/* ─── RIGHT ACTION RAIL ─── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, staggerChildren: 0.05 }}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3"
          >
            <RailButton icon={<Share2 className="h-4 w-4" />} label="Share" onClick={handleShare} />
            {isLoggedIn && coinBalance && (
              <RailButton
                icon={<Wallet className="h-4 w-4" />}
                label={formatCoins(coinBalance.balance)}
                onClick={() => router.push("/wallet")}
              />
            )}
            <RailButton
              icon={<Info className="h-4 w-4" />}
              label="Info"
              onClick={() => setInfoSheetOpen(true)}
            />
          </motion.div>

          {/* ─── BOTTOM AUCTION CARD ─── */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="absolute bottom-0 inset-x-0 px-4 pb-4 space-y-3"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1rem)" }}
          >
            {/* Top bidder ticker */}
            {topBidder?.bidder && !hasEnded && (
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={topBidder.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-xs"
                >
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={topBidder.bidder.profile_image_url || undefined} />
                    <AvatarFallback className="text-[10px] bg-violet-500">
                      {topBidder.bidder.display_name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white/80">
                    {isMyTopBid ? "You're winning" : `@${topBidder.bidder.display_name || "anon"} leads`}
                  </span>
                  <span className="text-amber-300 font-semibold">{formatCoins(topBidder.amount)}</span>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Auction card */}
            <div className="rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 p-4 shadow-[0_0_32px_rgba(0,0,0,0.5)]">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h1 className="text-base font-bold leading-tight line-clamp-2 flex-1">{auction.title}</h1>
                {!hasEnded && (
                  <div className="shrink-0 text-right">
                    <p className="text-[9px] uppercase tracking-wider text-white/50 font-semibold">Ends in</p>
                    <CountdownTimer
                      endsAt={auction.ends_at}
                      onEnd={() => setLocalEnded(true)}
                      compact
                      className="text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-white/50 font-semibold mb-0.5">
                    {auction.current_bid ? "Current Bid" : "Starting Price"}
                    {bids.length > 0 && <span className="ml-1 text-white/40 normal-case tracking-normal">· {bids.length}</span>}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <Coins className="h-5 w-5 text-amber-400 shrink-0 self-center" />
                    <span className="text-2xl font-bold leading-none bg-gradient-to-r from-amber-300 to-yellow-300 bg-clip-text text-transparent">
                      {formatCoins(currentPrice)}
                    </span>
                    <span className="text-xs text-white/50 ml-1">{formatUsd(coinsToFanUsd(currentPrice))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Big CTA pill */}
            {!hasEnded && !isOwner && (
              <motion.button
                onClick={handleBidClick}
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 rounded-full font-bold text-base text-black bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-300 shadow-[0_0_32px_rgba(251,191,36,0.55)] hover:shadow-[0_0_48px_rgba(251,191,36,0.8)] active:shadow-[0_0_20px_rgba(251,191,36,0.5)] transition-all"
              >
                {isLoggedIn ? `Place Bid · ${formatCoins(minNextBid)}+` : "Sign in to Bid"}
              </motion.button>
            )}
            {hasEnded && (
              <div className="w-full h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm text-white/60 font-semibold">
                {auction.status === "sold" ? "Sold" : "Ended"}
              </div>
            )}
            {isOwner && !hasEnded && (
              <div className="w-full h-14 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-sm text-white/60 font-semibold">
                Your listing
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ─── BID SHEET ─── */}
      <Sheet open={bidSheetOpen} onOpenChange={setBidSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0a0014] border-violet-500/30 max-h-[90dvh] overflow-y-auto mx-auto md:max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Place your bid
            </SheetTitle>
          </SheetHeader>
          <div className="pt-2">
            <BidForm
              auction={auction}
              disabled={hasEnded}
              isOwner={isOwner}
              myEscrowAmount={myEscrowAmount}
              onBidPlaced={() => {
                refreshBids();
                setBidSheetOpen(false);
              }}
              onBuyNow={() => {
                refreshBids();
                setBidSheetOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── INFO SHEET ─── */}
      <Sheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-[#0a0014] border-violet-500/30 max-h-[80dvh] overflow-y-auto mx-auto md:max-w-md">
          <SheetHeader className="text-left">
            <SheetTitle className="text-white">{auction.title}</SheetTitle>
          </SheetHeader>
          <div className="pt-3 space-y-5 text-sm">
            {auction.description && (
              <div>
                <p className="text-[10px] text-pink-300 uppercase tracking-[0.2em] font-semibold mb-2">Description</p>
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{auction.description}</p>
              </div>
            )}
            {auction.deliverables && (
              <div>
                <p className="text-[10px] text-violet-300 uppercase tracking-[0.2em] font-semibold mb-2">What&apos;s Included</p>
                <p className="text-white/80 whitespace-pre-wrap leading-relaxed">{auction.deliverables}</p>
              </div>
            )}
            <Link
              href={`/bids/${auction.id}`}
              className="block w-full text-center py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-semibold transition-colors"
            >
              View full listing
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── SIGN-IN DIALOG ─── */}
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
              <Label htmlFor="live-bid-email" className="text-white/80">Email</Label>
              <Input
                id="live-bid-email"
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
                <Label htmlFor="live-bid-password" className="text-white/80">Password</Label>
                <Link href="/forgot-password" className="text-xs text-pink-400 hover:text-pink-300 transition-colors" onClick={() => setSignInOpen(false)}>
                  Forgot password?
                </Link>
              </div>
              <Input
                id="live-bid-password"
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
              <Link href={`/signup?redirect=/bids/${auction.id}/live`} className="text-pink-400 hover:text-pink-300 font-semibold transition-colors" onClick={() => setSignInOpen(false)}>
                Sign Up
              </Link>
            </p>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RailButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center gap-1"
      aria-label={label}
    >
      <span className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:bg-black/60 group-active:scale-95 transition-all">
        {icon}
      </span>
      <span className="text-[10px] text-white/70 font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] max-w-[60px] truncate">
        {label}
      </span>
    </button>
  );
}
