"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, Share2, RotateCcw } from "lucide-react";

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
    const url = typeof window !== "undefined" ? window.location.href : "";

    if (navigator.share) {
      try {
        await navigator.share({ title: "EXA Boost", text, url });
      } catch {
        // User cancelled share
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(`${text} ${url}`);
    }
  };

  const canPlayAgain = timeRemaining === "Ready!" || !nextResetAt;

  return (
    <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
      {/* Trophy Animation */}
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center animate-pulse">
          <Trophy className="h-12 w-12 text-white" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs font-bold">
          {totalSwiped}
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-2">
        {canPlayAgain ? "Ready to Play Again!" : "You've Seen Everyone!"}
      </h2>

      <p className="text-muted-foreground mb-6">
        {canPlayAgain
          ? "New models are waiting for you."
          : `You've swiped through all ${totalSwiped} models. Come back later to discover more!`}
      </p>

      {/* Countdown Timer */}
      {!canPlayAgain && nextResetAt && (
        <div className="bg-white/5 rounded-xl p-6 mb-6 w-full">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
            <Clock className="h-4 w-4" />
            <span>Next session available in</span>
          </div>
          <div className="text-3xl font-mono font-bold bg-gradient-to-r from-pink-500 to-purple-500 text-transparent bg-clip-text">
            {timeRemaining}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full">
        {canPlayAgain && onPlayAgain && (
          <Button
            onClick={onPlayAgain}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Play Again
          </Button>
        )}

        <Button
          onClick={handleShare}
          variant="outline"
          className="w-full"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Your Score
        </Button>

        <Link href="/models" className="w-full">
          <Button variant="ghost" className="w-full">
            Browse All Models
          </Button>
        </Link>
      </div>

      {/* Stats Preview */}
      <div className="mt-8 pt-6 border-t border-white/10 w-full">
        <p className="text-sm text-muted-foreground mb-4">
          Check out who&apos;s leading today
        </p>
        <Link href="#leaderboard">
          <Button variant="link" className="text-pink-400">
            View Full Leaderboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
