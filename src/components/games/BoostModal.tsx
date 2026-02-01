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
import { Flame, Eye, Coins, Loader2, Sparkles, Zap } from "lucide-react";
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
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="flex items-center justify-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            Boost {model.first_name || model.username}
          </DialogTitle>
          <DialogDescription>
            Give them 5x the points with a boost!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Model Preview */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-pink-500/30">
              <Image
                src={model.profile_photo_url}
                alt={model.first_name || model.username}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized={model.profile_photo_url?.includes("cdninstagram.com")}
              />
            </div>
          </div>

          {/* Not logged in */}
          {!isLoggedIn ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Sign in to boost models and climb the leaderboard!
              </p>
              <Link href="/login">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500">
                  Sign In to Boost
                </Button>
              </Link>
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
                        Give {BOOST_POINTS}x points (anonymous)
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
                        {BOOST_POINTS}x points + they see your name
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
                    Best Value
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
                        {SUPER_POINTS}x points + reveal + priority notification
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
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Boosting...
                    </>
                  ) : selectedType ? (
                    <>
                      {selectedType === "super" ? <Zap className="h-4 w-4 mr-2" /> : <Flame className="h-4 w-4 mr-2" />}
                      {selectedType === "super" ? "Super " : ""}Boost for {selectedType === "super" ? SUPER_COST : selectedType === "reveal" ? REVEAL_COST : BOOST_COST} coins
                    </>
                  ) : (
                    "Select an option"
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
