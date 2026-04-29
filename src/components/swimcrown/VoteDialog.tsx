"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BuyCoinsModal } from "@/components/coins/BuyCoinsModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Crown, Coins, Loader2, ExternalLink } from "lucide-react";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";

interface Contestant {
  id: string;
  model_id: string;
  tagline: string | null;
  tier: string;
  vote_count: number;
  model: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    profile_photo_url: string | null;
    city?: string | null;
    state?: string | null;
  };
}

interface VoteDialogProps {
  contestant: Contestant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVoteSuccess: (contestantId: string, newVoteCount: number) => void;
  isLoggedIn: boolean;
}

const presetAmounts = [1, 5, 10, 25, 50, 100];

export function VoteDialog({
  contestant,
  open,
  onOpenChange,
  onVoteSuccess,
  isLoggedIn,
}: VoteDialogProps) {
  const coinCtx = useCoinBalanceOptional();
  const balance = coinCtx?.balance ?? 0;
  const [amount, setAmount] = useState(1);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);

  if (!contestant) return null;

  const effectiveAmount = isCustom
    ? Math.max(1, parseInt(customAmount) || 0)
    : amount;

  const handlePreset = (value: number) => {
    setAmount(value);
    setIsCustom(false);
    setCustomAmount("");
  };

  const handleCustom = () => {
    setIsCustom(true);
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to vote");
      return;
    }

    if (effectiveAmount < 1) {
      toast.error("Minimum 1 coin to vote");
      return;
    }

    if (effectiveAmount > balance) {
      toast.error("Insufficient coins", {
        description: "You need more coins to cast this vote.",
        action: {
          label: "Buy Coins",
          onClick: () => {
            window.location.href = "/coins";
          },
        },
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/swimcrown/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestant_id: contestant.id,
          coins: effectiveAmount,
        }),
      });

      if (res.status === 402) {
        toast.error("Insufficient coins", {
          description: "You need more coins to cast this vote.",
          action: {
            label: "Buy Coins",
            onClick: () => {
              window.location.href = "/coins";
            },
          },
        });
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.needCoins) {
          toast.error("Not enough coins. Buy more in your wallet!");
        } else {
          throw new Error(data.error || "Failed to vote");
        }
        return;
      }

      const data = await res.json();

      coinCtx?.deductCoins(effectiveAmount);
      toast.success(
        `Voted ${effectiveAmount} coin${effectiveAmount !== 1 ? "s" : ""} for ${contestant.model.first_name}!`
      );

      onVoteSuccess(
        contestant.id,
        data.voteCount ?? contestant.vote_count + effectiveAmount
      );
      onOpenChange(false);

      // Reset state
      setAmount(1);
      setIsCustom(false);
      setCustomAmount("");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-center">
            <span className="bg-gradient-to-r from-amber-300 to-yellow-400 bg-clip-text text-transparent">
              Vote for {contestant.model.first_name}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Contestant preview */}
        <div className="flex items-center gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <div className="relative h-14 w-14 rounded-full overflow-hidden bg-zinc-700 shrink-0">
            {contestant.model.profile_photo_url ? (
              <Image
                src={contestant.model.profile_photo_url}
                alt={contestant.model.first_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Crown className="h-6 w-6 text-zinc-500" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white truncate">
              {contestant.model.first_name} {contestant.model.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              @{contestant.model.username}
            </p>
          </div>
          <div className="ml-auto text-right shrink-0">
            <p className="text-sm font-bold text-amber-400">
              {contestant.vote_count.toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">votes</p>
          </div>
        </div>

        {/* Amount selector */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground text-center">
            1 vote = 1 coin ($0.10)
          </p>

          <div className="grid grid-cols-3 gap-2">
            {presetAmounts.map((val) => (
              <Button
                key={val}
                variant="outline"
                size="sm"
                className={`${
                  !isCustom && amount === val
                    ? "border-amber-500 bg-amber-500/10 text-amber-300"
                    : "border-zinc-700 text-muted-foreground hover:border-amber-500/50"
                }`}
                onClick={() => handlePreset(val)}
              >
                <Coins className="mr-1 h-3 w-3" />
                {val}
              </Button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={`shrink-0 ${
                isCustom
                  ? "border-amber-500 bg-amber-500/10 text-amber-300"
                  : "border-zinc-700 text-muted-foreground"
              }`}
              onClick={handleCustom}
            >
              Custom
            </Button>
            {isCustom && (
              <Input
                type="number"
                min={1}
                placeholder="Enter amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-white"
                autoFocus
              />
            )}
          </div>
        </div>

        {/* Balance + cost */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm">
          <span className="text-muted-foreground">Your balance</span>
          <span className="font-bold text-white flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-amber-400" />
            {balance.toLocaleString()} coins
          </span>
        </div>

        {balance < effectiveAmount && isLoggedIn && (
          <button
            type="button"
            onClick={() => setBuyCoinsOpen(true)}
            className="flex items-center justify-center gap-2 text-sm text-pink-400 hover:text-pink-300 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buy more coins
          </button>
        )}
        <BuyCoinsModal isOpen={buyCoinsOpen} onClose={() => setBuyCoinsOpen(false)} />

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || effectiveAmount < 1}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-5"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Crown className="h-4 w-4 mr-2" />
          )}
          {loading
            ? "Voting..."
            : `Vote ${effectiveAmount} coin${effectiveAmount !== 1 ? "s" : ""} — $${(effectiveAmount * 0.1).toFixed(2)}`}
        </Button>

        {!isLoggedIn && (
          <p className="text-center text-xs text-muted-foreground">
            <Link
              href="/sign-in"
              className="text-amber-400 hover:text-amber-300 underline"
            >
              Sign in
            </Link>{" "}
            to vote for contestants
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
