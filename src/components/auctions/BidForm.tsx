"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { coinsToFanUsd, formatUsd, formatCoins } from "@/lib/coin-config";
import { Coins, Zap, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AUCTION_DEFAULTS } from "@/types/auctions";
import type { Auction, PlaceBidResponse, BuyNowResponse } from "@/types/auctions";

interface BidFormProps {
  auction: Auction;
  onBidPlaced?: (response: PlaceBidResponse) => void;
  onBuyNow?: (response: BuyNowResponse) => void;
  disabled?: boolean;
  isOwner?: boolean;
}

export function BidForm({
  auction,
  onBidPlaced,
  onBuyNow,
  disabled = false,
  isOwner = false,
}: BidFormProps) {
  const coinBalance = useCoinBalanceOptional();
  const balance = coinBalance?.balance ?? 0;

  const minBid = auction.current_bid
    ? auction.current_bid + AUCTION_DEFAULTS.minBidIncrement
    : auction.starting_price;

  const [bidAmount, setBidAmount] = useState<string>(minBid.toString());
  const [enableAutoBid, setEnableAutoBid] = useState(false);
  const [maxAutoBid, setMaxAutoBid] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);

  const parsedBid = parseInt(bidAmount) || 0;
  const parsedMaxAutoBid = parseInt(maxAutoBid) || 0;
  const hasEnded = new Date(auction.ends_at) <= new Date() || auction.status !== "active";

  const canBid = !disabled && !isOwner && !hasEnded && parsedBid >= minBid && parsedBid <= balance;
  const canBuyNow = !disabled && !isOwner && !hasEnded && auction.buy_now_price && balance >= auction.buy_now_price;

  const handlePlaceBid = async () => {
    if (!canBid) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/auctions/${auction.id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parsedBid,
          max_auto_bid: enableAutoBid && parsedMaxAutoBid >= parsedBid ? parsedMaxAutoBid : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to place bid");
      }

      // Update local balance
      if (coinBalance) {
        coinBalance.setBalance(data.new_balance);
      }

      // Reset form
      setBidAmount((data.final_amount + AUCTION_DEFAULTS.minBidIncrement).toString());
      setMaxAutoBid("");
      setEnableAutoBid(false);

      // Notify
      toast.success(
        data.auction_extended
          ? `Bid placed! Auction extended to ${new Date(data.new_end_time).toLocaleTimeString()}`
          : "Bid placed successfully!"
      );

      onBidPlaced?.(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!canBuyNow || !auction.buy_now_price) return;

    setIsBuyingNow(true);
    try {
      const response = await fetch(`/api/auctions/${auction.id}/buy-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to complete purchase");
      }

      // Update local balance
      if (coinBalance) {
        coinBalance.setBalance(data.new_balance);
      }

      toast.success("Congratulations! You won!");

      onBuyNow?.(data);
    } catch (error: any) {
      toast.error(error.message || "Failed to complete purchase");
    } finally {
      setIsBuyingNow(false);
    }
  };

  if (hasEnded) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <p className="text-zinc-400">This bid has ended</p>
        {auction.winner_id && (
          <p className="text-sm text-zinc-500 mt-2">
            Final price: {formatCoins(auction.current_bid || 0)} coins ({formatUsd(coinsToFanUsd(auction.current_bid || 0))})
          </p>
        )}
      </div>
    );
  }

  if (isOwner) {
    return (
      <div className="glass-card p-6 rounded-xl text-center">
        <p className="text-zinc-400">This is your listing</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-xl space-y-6">
      {/* Bid Input */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="bid-amount" className="text-sm text-zinc-300">
            Your Bid (min {formatCoins(minBid)} coins · {formatUsd(coinsToFanUsd(minBid))})
          </Label>
          <div className="relative mt-1.5">
            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
            <Input
              id="bid-amount"
              type="number"
              min={minBid}
              step={AUCTION_DEFAULTS.minBidIncrement}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="pl-10 bg-zinc-800 border-zinc-700 focus:border-pink-500"
              placeholder={minBid.toString()}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs">
            <span className="text-zinc-500">
              = {formatUsd(coinsToFanUsd(parsedBid))}
            </span>
            <span className="text-zinc-500">
              Balance: {formatCoins(balance)} ({formatUsd(coinsToFanUsd(balance))})
            </span>
          </div>
        </div>

        {/* Auto-bid Toggle */}
        {auction.allow_auto_bid && (
          <div className="space-y-3 p-4 bg-zinc-800/50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-400" />
                <Label htmlFor="auto-bid" className="text-sm text-zinc-300">
                  Auto-bid
                </Label>
              </div>
              <Switch
                id="auto-bid"
                checked={enableAutoBid}
                onCheckedChange={setEnableAutoBid}
              />
            </div>
            {enableAutoBid && (
              <div>
                <Label htmlFor="max-auto-bid" className="text-xs text-zinc-400">
                  Maximum auto-bid amount
                </Label>
                <Input
                  id="max-auto-bid"
                  type="number"
                  min={parsedBid}
                  value={maxAutoBid}
                  onChange={(e) => setMaxAutoBid(e.target.value)}
                  className="mt-1 bg-zinc-900 border-zinc-700 focus:border-violet-500"
                  placeholder="Enter max coins"
                />
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-zinc-500">
                    We&apos;ll automatically bid for you up to this amount
                  </p>
                  {parsedMaxAutoBid > 0 && (
                    <p className="text-xs text-zinc-400 font-medium">
                      = {formatUsd(coinsToFanUsd(parsedMaxAutoBid))}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Place Bid Button */}
        <Button
          onClick={handlePlaceBid}
          disabled={!canBid || isSubmitting}
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold py-6"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Placing Bid...
            </>
          ) : parsedBid > balance ? (
            "Insufficient Balance"
          ) : (
            <>
              Place Bid — {formatCoins(parsedBid)} coins ({formatUsd(coinsToFanUsd(parsedBid))})
            </>
          )}
        </Button>

        {/* Buy Now Button */}
        {auction.buy_now_price && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-zinc-900 px-2 text-zinc-500">or</span>
              </div>
            </div>

            <Button
              onClick={handleBuyNow}
              disabled={!canBuyNow || isBuyingNow}
              variant="outline"
              className="w-full border-amber-500/50 text-amber-400 hover:bg-amber-500/10 py-6"
            >
              {isBuyingNow ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Buy Now - {formatCoins(auction.buy_now_price)} coins
                  <span className="ml-2 text-zinc-500">
                    ({formatUsd(coinsToFanUsd(auction.buy_now_price))})
                  </span>
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default BidForm;
