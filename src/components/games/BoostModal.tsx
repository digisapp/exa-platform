"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, Coins, Loader2, Sparkles, Zap, Flame, Trophy, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  first_name: string | null;
  username: string;
  profile_photo_url: string;
}

interface BoostModalProps {
  open: boolean;
  onClose: () => void;
  model: Model | null;
  coinBalance: number;
  isLoggedIn: boolean;
  onBoost: (type: "boost" | "reveal" | "super") => Promise<void>;
}

const BOOST_COST = 5;
const REVEAL_COST = 10;
const SUPER_COST = 20;
const BOOST_POINTS = 5;
const SUPER_POINTS = 10;

export function BoostModal({
  open,
  onClose,
  model,
  coinBalance,
  isLoggedIn,
  onBoost,
}: BoostModalProps) {
  const [selectedType, setSelectedType] = useState<"boost" | "reveal" | "super" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBoost = async () => {
    if (!selectedType) return;

    setLoading(true);
    try {
      await onBoost(selectedType);
      onClose();
    } catch (error) {
      console.error("Boost error:", error);
    } finally {
      setLoading(false);
    }
  };

  const canAffordBoost = coinBalance >= BOOST_COST;
  const canAffordReveal = coinBalance >= REVEAL_COST;
  const canAffordSuper = coinBalance >= SUPER_COST;

  if (!model) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm overflow-hidden">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-pink-500/5 to-transparent pointer-events-none" />

        <DialogHeader className="text-center relative">
          <DialogTitle className="flex items-center justify-center gap-2 text-xl">
            <span className="relative">
              <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
              <span className="absolute inset-0 blur-md bg-orange-500/50 animate-pulse" />
            </span>
            <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 text-transparent bg-clip-text font-bold">
              Boost {model.first_name || model.username}
            </span>
          </DialogTitle>
          <DialogDescription className="text-base">
            Your boost helps {model.first_name || "them"} rise to the top!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 relative">
          {/* Model Preview with animated ring */}
          <div className="flex justify-center">
            <div className="relative">
              {/* Animated glow ring */}
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 rounded-full blur-md opacity-60 animate-pulse" />
              <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/20 shadow-2xl">
                <Image
                  src={model.profile_photo_url}
                  alt={model.first_name || model.username}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
              {/* Flame badge */}
              <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full p-2 shadow-lg">
                <Flame className="h-4 w-4 text-white" />
              </div>
            </div>
          </div>

          {/* Not logged in */}
          {!isLoggedIn ? (
            <div className="text-center space-y-5">
              {/* Emotional hook */}
              <p className="text-sm text-muted-foreground px-2">
                Be their biggest supporter! Boosts give <strong className="text-white">5x leaderboard points</strong> and
                help {model.first_name || "them"} get discovered by brands and fans.
              </p>

              {/* Benefits list */}
              <div className="space-y-2.5 py-1">
                <div className="flex items-center gap-3 text-sm bg-white/5 rounded-lg px-4 py-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500">
                    <Trophy className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-left">Help {model.first_name || "them"} <strong className="text-orange-400">climb the leaderboard</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm bg-white/5 rounded-lg px-4 py-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-left">Increase their <strong className="text-pink-400">visibility & exposure</strong></span>
                </div>
                <div className="flex items-center gap-3 text-sm bg-white/5 rounded-lg px-4 py-2.5">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500">
                    <Heart className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-left">Show them you <strong className="text-purple-400">believe in them</strong></span>
                </div>
              </div>

              <Link href="/login" className="block">
                <Button className="w-full h-12 text-base bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25">
                  <Heart className="h-5 w-5 mr-2" />
                  Sign In to Support {model.first_name || "Them"}
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground">
                Free to join - start boosting your favorites today
              </p>
            </div>
          ) : (
            <>
              {/* Coin Balance */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span>Your balance: <strong>{coinBalance} coins</strong></span>
              </div>

              {/* Boost Options */}
              <div className="space-y-3">
                {/* Regular Boost */}
                <button
                  onClick={() => setSelectedType("boost")}
                  disabled={!canAffordBoost}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all text-left",
                    selectedType === "boost"
                      ? "border-orange-500 bg-orange-500/10"
                      : canAffordBoost
                      ? "border-white/10 hover:border-orange-500/50 hover:bg-white/5"
                      : "border-white/5 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500">
                      <Flame className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Boost</span>
                        <span className="text-sm text-yellow-400">{BOOST_COST} coins</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Give {BOOST_POINTS}x leaderboard points anonymously
                      </p>
                    </div>
                  </div>
                </button>

                {/* Reveal Boost */}
                <button
                  onClick={() => setSelectedType("reveal")}
                  disabled={!canAffordReveal}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden",
                    selectedType === "reveal"
                      ? "border-purple-500 bg-purple-500/10"
                      : canAffordReveal
                      ? "border-white/10 hover:border-purple-500/50 hover:bg-white/5"
                      : "border-white/5 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                      <Eye className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Boost + Reveal</span>
                        <span className="text-sm text-yellow-400">{REVEAL_COST} coins</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {BOOST_POINTS}x points + {model.first_name || "they"} sees your name
                      </p>
                    </div>
                  </div>
                </button>

                {/* Super Boost */}
                <button
                  onClick={() => setSelectedType("super")}
                  disabled={!canAffordSuper}
                  className={cn(
                    "w-full p-4 rounded-xl border-2 transition-all text-left relative overflow-hidden",
                    selectedType === "super"
                      ? "border-yellow-500 bg-yellow-500/10"
                      : canAffordSuper
                      ? "border-white/10 hover:border-yellow-500/50 hover:bg-white/5"
                      : "border-white/5 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-xs font-medium rounded-bl-lg text-black">
                    Max Support
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500">
                      <Zap className="h-5 w-5 text-black" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Super Boost</span>
                        <span className="text-sm text-yellow-400">{SUPER_COST} coins</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {SUPER_POINTS}x points + reveal + instant notification
                      </p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Not enough coins */}
              {!canAffordBoost && (
                <div className="text-center">
                  <p className="text-sm text-red-400 mb-2">Not enough coins!</p>
                  <Link href="/dashboard/coins">
                    <Button variant="outline" size="sm" className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      Get More Coins
                    </Button>
                  </Link>
                </div>
              )}

              {/* Confirm Button */}
              {canAffordBoost && (
                <Button
                  onClick={handleBoost}
                  disabled={!selectedType || loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending boost...
                    </>
                  ) : selectedType ? (
                    <>
                      {selectedType === "super" ? <Zap className="h-4 w-4 mr-2" /> : <Flame className="h-4 w-4 mr-2" />}
                      Support {model.first_name || "them"} with {selectedType === "super" ? SUPER_COST : selectedType === "reveal" ? REVEAL_COST : BOOST_COST} coins
                    </>
                  ) : (
                    "Choose how to support"
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
