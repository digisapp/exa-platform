"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Coins, Sparkles, Gift } from "lucide-react";
import confetti from "canvas-confetti";

// Spin wheel segments with coin rewards
const SEGMENTS = [
  { coins: 1, color: "from-pink-500 to-pink-600", weight: 30 },
  { coins: 2, color: "from-purple-500 to-purple-600", weight: 25 },
  { coins: 3, color: "from-blue-500 to-blue-600", weight: 20 },
  { coins: 5, color: "from-green-500 to-green-600", weight: 15 },
  { coins: 10, color: "from-yellow-500 to-orange-500", weight: 8 },
  { coins: 25, color: "from-orange-500 to-red-500", weight: 2 },
];

interface DailySpinProps {
  isLoggedIn: boolean;
  onSpinComplete: (coins: number) => void;
  hasSpunToday: boolean;
}

export function DailySpin({ isLoggedIn, onSpinComplete, hasSpunToday }: DailySpinProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const spinSoundRef = useRef<NodeJS.Timeout | null>(null);

  // Weighted random selection
  const getRandomSegment = () => {
    const totalWeight = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < SEGMENTS.length; i++) {
      random -= SEGMENTS[i].weight;
      if (random <= 0) return i;
    }
    return 0;
  };

  const handleSpin = async () => {
    if (isSpinning || hasSpunToday || !isLoggedIn) return;

    setIsSpinning(true);
    setResult(null);
    setShowResult(false);

    // Calculate winning segment
    const winningIndex = getRandomSegment();
    const segmentAngle = 360 / SEGMENTS.length;

    // Calculate rotation: multiple full spins + landing on segment
    // Add offset to land in center of segment
    const targetAngle = winningIndex * segmentAngle + segmentAngle / 2;
    const spins = 5; // Number of full rotations
    const finalRotation = spins * 360 + (360 - targetAngle);

    setRotation(finalRotation);

    // Play tick sounds during spin
    let tickCount = 0;
    spinSoundRef.current = setInterval(() => {
      tickCount++;
      // Slow down ticks as spin slows
      if (tickCount > 30) {
        clearInterval(spinSoundRef.current!);
      }
    }, 100);

    // Wait for spin animation
    setTimeout(async () => {
      clearInterval(spinSoundRef.current!);
      const wonCoins = SEGMENTS[winningIndex].coins;
      setResult(wonCoins);
      setShowResult(true);

      // Trigger confetti for big wins
      if (wonCoins >= 5) {
        confetti({
          particleCount: wonCoins >= 10 ? 150 : 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#f472b6", "#a855f7", "#eab308", "#22c55e"],
        });
      }

      // Call API to claim reward
      try {
        const res = await fetch("/api/games/boost/spin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coins: wonCoins }),
        });

        if (res.ok) {
          onSpinComplete(wonCoins);
        }
      } catch (error) {
        console.error("Failed to claim spin reward:", error);
      }

      setIsSpinning(false);
    }, 4000);
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (spinSoundRef.current) {
        clearInterval(spinSoundRef.current);
      }
    };
  }, []);

  if (!isLoggedIn) {
    return null; // Don't show spin for anonymous users
  }

  if (hasSpunToday) {
    return null; // Already spun today
  }

  return (
    <div className="bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-pink-500/10 rounded-xl p-4 mb-4 w-full border border-yellow-500/20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.1),transparent_70%)]" />

      <div className="relative">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Gift className="h-5 w-5 text-yellow-400" />
          <span className="font-semibold bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
            Daily Reward!
          </span>
          <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
        </div>

        {/* Spin Wheel */}
        <div className="relative w-48 h-48 mx-auto mb-4">
          {/* Wheel background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full blur-xl opacity-30 animate-pulse" />

          {/* Wheel */}
          <motion.div
            className="relative w-full h-full rounded-full overflow-hidden border-4 border-yellow-500/50 shadow-lg"
            animate={{ rotate: rotation }}
            transition={{
              duration: 4,
              ease: [0.2, 0.8, 0.3, 1], // Custom easing for realistic spin
            }}
          >
            {SEGMENTS.map((segment, index) => {
              const angle = (360 / SEGMENTS.length) * index;
              return (
                <div
                  key={index}
                  className={`absolute w-full h-full bg-gradient-to-br ${segment.color}`}
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan(Math.PI / SEGMENTS.length)}% 0%)`,
                    transform: `rotate(${angle}deg)`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  <div
                    className="absolute text-white font-bold text-sm"
                    style={{
                      top: "20%",
                      left: "50%",
                      transform: `translateX(-50%) rotate(${90 / SEGMENTS.length}deg)`,
                    }}
                  >
                    {segment.coins}
                  </div>
                </div>
              );
            })}

            {/* Center circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-yellow-500/50 flex items-center justify-center z-10">
              <Coins className="h-5 w-5 text-yellow-400" />
            </div>
          </motion.div>

          {/* Pointer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-yellow-400 drop-shadow-lg" />
          </div>
        </div>

        {/* Result Modal */}
        <AnimatePresence>
          {showResult && result !== null && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 rounded-xl"
            >
              <div className="text-center p-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                  className="text-5xl mb-2"
                >
                  🎉
                </motion.div>
                <p className="text-lg font-bold text-white mb-1">You won!</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="h-6 w-6 text-yellow-400" />
                  <span className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-transparent bg-clip-text">
                    {result} coins
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spin Button */}
        {!showResult && (
          <Button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 shadow-lg shadow-yellow-500/25 disabled:opacity-50"
          >
            {isSpinning ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Spinning...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Spin for Free Coins!
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
