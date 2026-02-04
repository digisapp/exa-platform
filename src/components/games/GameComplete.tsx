"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, RotateCcw, Sparkles, Star, Heart, X, Flame, Zap, UserPlus, Coins, Share2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { DailySpin } from "./DailySpin";

interface SessionStats {
  likes: number;
  passes: number;
  boosts: number;
  pointsGiven: number;
}

interface GameCompleteProps {
  nextResetAt: string | null;
  totalSwiped: number;
  onPlayAgain?: () => void;
  sessionStats?: SessionStats;
  streak?: number;
  isLoggedIn?: boolean;
  hasSpunToday?: boolean;
  onSpinComplete?: (coins: number, newBalance?: number) => void;
}

export function GameComplete({
  nextResetAt,
  totalSwiped,
  onPlayAgain,
  sessionStats,
  streak = 0,
  isLoggedIn = false,
  hasSpunToday = false,
  onSpinComplete,
}: GameCompleteProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Share results
  const handleShare = async () => {
    const pointsText = sessionStats?.pointsGiven ? `${sessionStats.pointsGiven} points` : "some love";
    const streakText = streak > 1 ? ` 🔥 ${streak}-day streak!` : "";
    const shareText = `I just gave ${pointsText} on EXA Boost!${streakText} Play now and boost your favorite models!`;
    const shareUrl = `${window.location.origin}/boost`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "EXA Boost",
          text: shareText,
          url: shareUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      toast.success("Copied to clipboard!");
    }
  };

  useEffect(() => {
    if (!nextResetAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const reset = new Date(nextResetAt).getTime();
      const diff = reset - now;

      if (diff <= 0) {
        setTimeRemaining("Ready!");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextResetAt]);

  const canPlayAgain = timeRemaining === "Ready!" || !nextResetAt;

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-orange-500/10 rounded-3xl pointer-events-none" />

      {/* Trophy Animation */}
      <div className="relative mb-4">
        {/* Animated glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 blur-xl opacity-60 animate-pulse scale-110" />

        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
          <Trophy className="h-12 w-12 text-white drop-shadow-lg" />

          {/* Floating sparkles */}
          <Sparkles className="absolute -top-2 -left-2 h-5 w-5 text-yellow-300 animate-pulse" />
          <Star className="absolute -top-1 -right-3 h-4 w-4 text-pink-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Sparkles className="absolute -bottom-1 -right-1 h-4 w-4 text-purple-300 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-1 relative">
        {canPlayAgain ? (
          <span className="bg-gradient-to-r from-green-400 to-emerald-400 text-transparent bg-clip-text">
            Ready to Play Again!
          </span>
        ) : (
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 text-transparent bg-clip-text">
            You&apos;ve Seen Everyone!
          </span>
        )}
      </h2>

      {canPlayAgain && (
        <p className="text-muted-foreground mb-4 relative">
          New models are waiting for you.
        </p>
      )}

      {/* Session Stats */}
      {sessionStats && (sessionStats.likes > 0 || sessionStats.passes > 0) && (
        <div className="grid grid-cols-3 gap-3 w-full mb-4 relative">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
              <Heart className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-white">{sessionStats.likes}</p>
            <p className="text-xs text-muted-foreground">Likes</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-center gap-1 text-red-400 mb-1">
              <X className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-white">{sessionStats.passes}</p>
            <p className="text-xs text-muted-foreground">Passes</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Flame className="h-4 w-4" />
            </div>
            <p className="text-xl font-bold text-white">{sessionStats.boosts}</p>
            <p className="text-xs text-muted-foreground">Boosts</p>
          </div>
        </div>
      )}

      {/* Points Given */}
      {sessionStats && sessionStats.pointsGiven > 0 && (
        <div className="bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl p-3 mb-4 w-full border border-pink-500/20 relative">
          <div className="flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="text-lg font-bold bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">
              {sessionStats.pointsGiven} points given!
            </span>
          </div>
        </div>
      )}

      {/* Daily Streak */}
      {streak > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-3 mb-4 w-full border border-orange-500/20 relative">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">🔥</span>
            <span className="text-lg font-bold text-orange-400">
              {streak}-day streak!
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Come back tomorrow to keep it going
          </p>
        </div>
      )}

      {/* Daily Spin Reward (shows sign-up prompt for anonymous users) */}
      {!hasSpunToday && (
        <DailySpin
          isLoggedIn={isLoggedIn}
          onSpinComplete={onSpinComplete || (() => {})}
          hasSpunToday={hasSpunToday}
        />
      )}

      {/* Share Results */}
      {sessionStats && sessionStats.pointsGiven > 0 && (
        <Button
          onClick={handleShare}
          variant="outline"
          className="w-full mb-4 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Your Results
        </Button>
      )}

      {/* Sign Up Prompt for Anonymous Users */}
      {!isLoggedIn && (
        <div className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-orange-500/10 rounded-xl p-4 mb-4 w-full border border-purple-500/20 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-orange-500/5" />

          <div className="relative">
            <div className="flex items-center justify-center gap-2 mb-2">
              <UserPlus className="h-5 w-5 text-purple-400" />
              <span className="font-semibold bg-gradient-to-r from-purple-400 to-pink-400 text-transparent bg-clip-text">
                Create a Free Account
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Save your stats, keep your streak, and buy coins to boost models!
            </p>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-yellow-400" />
                Save stats
              </span>
              <span className="flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-400" />
                Keep streak
              </span>
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-purple-400" />
                Buy coins
              </span>
            </div>
            <Link href="/fan/sign-up" className="block">
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Sign Up Free
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Countdown Timer */}
      {!canPlayAgain && nextResetAt && (
        <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-2xl p-5 mb-4 w-full border border-white/10 relative overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-orange-500/5 animate-pulse" />

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2 relative">
            <Clock className="h-4 w-4 text-pink-400" />
            <span>Play again in</span>
          </div>
          <div className="text-4xl font-mono font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 text-transparent bg-clip-text relative">
            {timeRemaining}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full relative">
        {canPlayAgain && onPlayAgain && (
          <Button
            onClick={onPlayAgain}
            className="w-full h-12 text-base bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 hover:from-pink-600 hover:via-purple-600 hover:to-orange-600 shadow-lg shadow-pink-500/25"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Play Again
          </Button>
        )}
      </div>
    </div>
  );
}
