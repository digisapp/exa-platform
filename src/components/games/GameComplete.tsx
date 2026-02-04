"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trophy, Clock, RotateCcw, Sparkles, Star } from "lucide-react";

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

      {canPlayAgain && (
        <p className="text-muted-foreground mb-6 relative">
          New models are waiting for you.
        </p>
      )}

      {/* Countdown Timer */}
      {!canPlayAgain && nextResetAt && (
        <div className="bg-gradient-to-r from-white/5 to-white/10 rounded-2xl p-5 mb-6 w-full border border-white/10 relative overflow-hidden">
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
