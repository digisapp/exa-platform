"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Share2, RotateCcw, Sparkles, Star, Crown } from "lucide-react";
import { toast } from "sonner";

interface GameCompleteProps {
  nextResetAt: string | null;
  totalSwiped: number;
  onPlayAgain?: () => void;
}

export function GameComplete({ nextResetAt, totalSwiped, onPlayAgain }: GameCompleteProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

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

  const handleShare = async () => {
    const text = `I just swiped through ${totalSwiped} models on EXA Boost! Can you beat my record? Play now:`;
    const url = typeof window !== "undefined" ? `${window.location.origin}/boost` : "";

    if (navigator.share) {
      try {
        await navigator.share({ title: "EXA Boost", text, url });
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied!");
    }
  };

  const canPlayAgain = timeRemaining === "Ready!" || !nextResetAt;

  return (
    <div className="flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-orange-500/10 rounded-3xl pointer-events-none" />

      {/* Trophy Animation */}
      <div className="relative mb-6">
        {/* Animated glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 blur-xl opacity-60 animate-pulse scale-110" />

        <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-orange-500/30">
          <Trophy className="h-14 w-14 text-white drop-shadow-lg" />

          {/* Floating sparkles */}
          <Sparkles className="absolute -top-2 -left-2 h-5 w-5 text-yellow-300 animate-pulse" />
          <Star className="absolute -top-1 -right-3 h-4 w-4 text-pink-300 animate-pulse" style={{ animationDelay: '0.5s' }} />
          <Sparkles className="absolute -bottom-1 -right-1 h-4 w-4 text-purple-300 animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        {/* Count badge */}
        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-pink-500/40 border-2 border-white/20">
          {totalSwiped}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2 relative">
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

      <p className="text-muted-foreground mb-6 relative">
        {canPlayAgain
          ? "New models are waiting for you."
          : `You've swiped through all ${totalSwiped} models. Come back later!`}
      </p>

      {/* Countdown Timer */}
      {!canPlayAgain && nextResetAt && (
        <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-2xl p-5 mb-6 w-full border border-white/10 relative overflow-hidden">
          {/* Subtle animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-orange-500/5 animate-pulse" />

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2 relative">
            <Clock className="h-4 w-4 text-pink-400" />
            <span>Next session available in</span>
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

        <Button
          onClick={handleShare}
          variant="outline"
          className="w-full h-11 border-white/20 bg-white/5 hover:bg-white/10"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Your Score
        </Button>

        <Link href="/models" className="w-full">
          <Button variant="ghost" className="w-full h-11 hover:bg-white/5">
            Browse All Models
          </Button>
        </Link>
      </div>

      {/* Stats Preview */}
      <div className="mt-8 pt-6 border-t border-white/10 w-full relative">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-3">
          <Crown className="h-4 w-4 text-yellow-400" />
          <span>Check out who&apos;s leading today</span>
        </div>
        <Link href="#leaderboard">
          <Button variant="link" className="text-pink-400 hover:text-pink-300">
            <Trophy className="h-4 w-4 mr-1" />
            View Full Leaderboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
