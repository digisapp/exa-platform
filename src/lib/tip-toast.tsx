"use client";

import { toast } from "sonner";
import { Gift, Sparkles } from "lucide-react";
import type { TipGift } from "@/lib/tip-config";

interface TipToastProps {
  amount: number;
  recipientName: string;
  gift?: TipGift | null;
}

/**
 * The celebration a fan sees the instant a tip lands. It is deliberately
 * tier-aware: the ladder mirrors the Super Tip amounts (100/250/500/1000)
 * used by MessageBubble's `tipTierClasses`, so a 1000-coin tip *feels*
 * bigger than a 10-coin Rose everywhere it shows. Keep the two ladders in
 * sync — a fan who sees a gold, confetti-drenched toast should also get the
 * gold glow card in the thread.
 *
 * All motion (glow pulse + confetti) is skipped under
 * prefers-reduced-motion; the toast still renders, just calm.
 */

interface TipTier {
  /** Card gradient (synthwave neon; brighter/warmer as the tip grows). */
  gradient: string;
  /** Blurred glow behind the card. */
  glow: string;
  /** Tailwind color for the amount + sparkle accents. */
  accent: string;
  /** How many sparkle decorations to scatter (0–3). */
  sparkles: number;
  /** Toast lifetime — bigger tips linger. */
  duration: number;
  /** Confetti recipe, or null for no confetti (calm gifts). */
  confetti: {
    particleCount: number;
    /** Fire brief left/right cannons too (reserved for the big ones). */
    cannons: boolean;
    /** Add gold star shapes to the burst. */
    stars: boolean;
    colors: string[];
  } | null;
}

// Neon palette shared with the confetti so the burst matches the card.
const PINK = "#ec4899";
const VIOLET = "#8b5cf6";
const FUCHSIA = "#d946ef";
const GOLD = "#fbbf24";

function tierFor(amount: number, gift?: TipGift | null): TipTier {
  if (amount >= 1000) {
    return {
      gradient: "from-amber-400/90 via-pink-500/90 to-violet-600/90",
      glow: "from-amber-400 via-pink-500 to-violet-500",
      accent: "text-amber-200",
      sparkles: 3,
      duration: 4500,
      confetti: { particleCount: 200, cannons: true, stars: true, colors: [GOLD, PINK, VIOLET, FUCHSIA] },
    };
  }
  if (amount >= 500) {
    return {
      gradient: "from-amber-500/90 via-pink-500/90 to-violet-600/90",
      glow: "from-amber-400 via-pink-500 to-violet-500",
      accent: "text-amber-200",
      sparkles: 3,
      duration: 4000,
      confetti: { particleCount: 150, cannons: true, stars: true, colors: [GOLD, PINK, VIOLET] },
    };
  }
  if (amount >= 250) {
    return {
      gradient: "from-fuchsia-500/90 to-violet-600/90",
      glow: "from-fuchsia-500 via-pink-500 to-violet-500",
      accent: "text-yellow-300",
      sparkles: 2,
      duration: 3500,
      confetti: { particleCount: 110, cannons: false, stars: false, colors: [FUCHSIA, PINK, VIOLET] },
    };
  }
  if (amount >= 100) {
    // Entry Super Tip.
    return {
      gradient: "from-pink-500/90 to-violet-600/90",
      glow: "from-pink-500 via-fuchsia-500 to-violet-500",
      accent: "text-yellow-300",
      sparkles: 2,
      duration: 3200,
      confetti: { particleCount: 80, cannons: false, stars: false, colors: [PINK, VIOLET, FUCHSIA] },
    };
  }
  // Gifts & small custom tips (10–99): playful, not grand. Gifts burst the
  // chosen emoji; plain small tips get a modest pink puff.
  return {
    gradient: "from-pink-500/90 to-violet-600/90",
    glow: "from-pink-500 to-violet-500",
    accent: "text-yellow-300",
    sparkles: 1,
    duration: 2800,
    confetti: gift
      ? { particleCount: 34, cannons: false, stars: false, colors: [PINK, VIOLET] }
      : { particleCount: 40, cannons: false, stars: false, colors: [PINK, VIOLET] },
  };
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fire the celebration burst near the top-center where the toast appears.
 * Loaded lazily so canvas-confetti never ships in the initial bundle.
 */
function fireConfetti(tier: TipTier, gift?: TipGift | null) {
  if (!tier.confetti) return;
  const recipe = tier.confetti;

  import("canvas-confetti").then((mod) => {
    const confetti = mod.default;
    // Toast sits high; originate the burst just below it so pieces rain past.
    const origin = { x: 0.5, y: 0.18 };

    // Gifts throw the chosen emoji; everything else uses neon dots (+ gold
    // stars for the top tiers).
    const shapes = gift
      ? [confetti.shapeFromText({ text: gift.emoji, scalar: 2.2 })]
      : recipe.stars
        ? [confetti.shapeFromText({ text: "⭐", scalar: 1.6 }), "circle" as const, "square" as const]
        : undefined;

    confetti({
      particleCount: recipe.particleCount,
      spread: gift ? 70 : 100,
      startVelocity: 45,
      gravity: 1.1,
      scalar: gift ? 2.2 : recipe.stars ? 1.4 : 1,
      ticks: 220,
      origin,
      colors: recipe.colors,
      ...(shapes ? { shapes } : {}),
      disableForReducedMotion: true,
    });

    // Big tips get a brief left/right cannon pair for a "money rain" beat.
    if (recipe.cannons) {
      const end = Date.now() + 900;
      const frame = () => {
        confetti({ particleCount: 3, angle: 60, spread: 55, startVelocity: 50, origin: { x: 0 }, colors: recipe.colors, disableForReducedMotion: true });
        confetti({ particleCount: 3, angle: 120, spread: 55, startVelocity: 50, origin: { x: 1 }, colors: recipe.colors, disableForReducedMotion: true });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  });
}

export function showTipSuccessToast({ amount, recipientName, gift }: TipToastProps) {
  const tier = tierFor(amount, gift);
  const reduced = prefersReducedMotion();
  const isSuperTip = amount >= 100;

  if (!reduced) fireConfetti(tier, gift);

  // Sparkle positions, sliced to the tier's count.
  const sparkleSpots = [
    { className: "-top-2 -left-2 h-6 w-6", delay: "" },
    { className: "-top-1 -right-3 h-5 w-5", delay: "delay-75" },
    { className: "-bottom-1 -right-1 h-4 w-4", delay: "delay-150" },
  ].slice(0, tier.sparkles);

  const heading = gift ? `${gift.label} Sent!` : isSuperTip ? "Super Tip Sent!" : "Tip Sent!";

  toast.custom(
    (t) => (
      <div
        className={`relative mx-auto cursor-pointer ${reduced ? "animate-in fade-in duration-200" : "animate-in zoom-in-95 fade-in duration-300"}`}
        onClick={() => toast.dismiss(t)}
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 blur-2xl bg-gradient-to-r ${tier.glow} opacity-60 rounded-3xl scale-110 ${reduced ? "" : "animate-pulse"}`}
        />

        {/* Toast content */}
        <div
          className={`relative bg-gradient-to-br ${tier.gradient} backdrop-blur-xl text-white px-8 py-5 rounded-2xl shadow-2xl border border-white/20`}
        >
          {/* Sparkles decoration */}
          {sparkleSpots.map((s, i) => (
            <div key={i} className={`absolute ${s.className}`}>
              <Sparkles className={`h-full w-full ${tier.accent} ${reduced ? "" : `animate-pulse ${s.delay}`}`} />
            </div>
          ))}

          {/* Row 1: Icon + heading */}
          <div className="flex items-center justify-center gap-2.5">
            <div className="p-2 rounded-full bg-white/20 ring-2 ring-white/10">
              {gift ? (
                <span className="flex h-6 w-6 items-center justify-center text-xl leading-none">{gift.emoji}</span>
              ) : (
                <Gift className="h-6 w-6 text-white" />
              )}
            </div>
            <p className="text-2xl font-bold">{heading}</p>
          </div>

          {/* Row 2: Amount + recipient */}
          <p className="text-center text-white/90 text-lg mt-1.5">
            <span className={`font-semibold ${tier.accent}`}>{amount.toLocaleString()} coins</span> to {recipientName}
          </p>
        </div>
      </div>
    ),
    {
      duration: tier.duration,
      position: "top-center",
      unstyled: true,
      style: { width: "100%", display: "flex", justifyContent: "center" },
    }
  );
}
