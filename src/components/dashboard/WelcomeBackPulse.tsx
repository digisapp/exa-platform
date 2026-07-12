"use client";

import { useEffect, useState } from "react";
import { Eye, Heart, Sparkles, X, PenLine } from "lucide-react";
import type { WelcomeBackPulseData } from "@/lib/welcome-back";

/**
 * "Welcome back" pulse — dismissible hero banner for returning models.
 * All data (away-gap gate, stats, previous-visit timestamp) is computed
 * server-side in src/lib/welcome-back.ts; the page renders this component
 * only when that computation returned data.
 *
 * Dismiss persistence: localStorage stores the previous visit's timestamp.
 * The banner is hidden only while the stored value matches THIS return's
 * prevVisitIso — the next long absence produces a new timestamp, so the
 * banner re-arms automatically (shows once per return, not once ever).
 *
 * Copy constraints: warm and specific, zero guilt — "Welcome back", never
 * "you've been gone". Upcoming shows are NOT announced: never name an event.
 */

const DISMISS_KEY = "exa_welcome_back_dismissed_for";

export function WelcomeBackPulse({
  username,
  data,
}: {
  username: string;
  data: WelcomeBackPulseData;
}) {
  // Start hidden; reveal on mount unless this exact return was dismissed.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === data.prevVisitIso) return;
    } catch {}
    setVisible(true);
  }, [data.prevVisitIso]);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, data.prevVisitIso);
    } catch {}
  };

  // Scroll to whichever Live Wall instance is visible at this breakpoint
  // (mobile inline section vs. desktop sticky sidebar — both carry
  // data-live-wall on the dashboard page).
  const goToLiveWall = () => {
    const walls = document.querySelectorAll<HTMLElement>("[data-live-wall]");
    const target =
      Array.from(walls).find((el) => el.offsetParent !== null) || walls[0];
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!visible) return null;

  const tiles: { key: string; icon: React.ReactNode; value: number; label: string }[] = [
    {
      key: "views",
      icon: <Eye className="h-4 w-4 text-cyan-300" />,
      value: data.profileViews,
      label: data.profileViews === 1 ? "profile view" : "profile views",
    },
    {
      key: "fans",
      icon: <Heart className="h-4 w-4 text-pink-300 fill-pink-300" />,
      value: data.newFans,
      label: data.newFans === 1 ? "new fan" : "new fans",
    },
    {
      key: "likes",
      icon: <Sparkles className="h-4 w-4 text-violet-300" />,
      value: data.spotlightLikes,
      label: data.spotlightLikes === 1 ? "Spotlight like" : "Spotlight likes",
    },
  ].filter((t) => t.value > 0);

  // page_views retention caps the window at 90 days — say so honestly
  const windowPhrase = data.windowCapped
    ? "in the last 90 days"
    : "while you were away";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-pink-500/40 bg-gradient-to-br from-pink-500/15 via-violet-500/10 to-cyan-500/10 shadow-[0_0_32px_rgba(236,72,153,0.18)] animate-in fade-in slide-in-from-top-2 duration-300"
      aria-label="Welcome back"
    >
      {/* Ambient glow accents */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-pink-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-cyan-500/10 blur-3xl" />

      <button
        onClick={dismiss}
        aria-label="Dismiss welcome back banner"
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="relative p-5">
        <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-pink-300/80 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3" />
          You were missed
        </p>
        <h2 className="text-lg font-semibold mt-1 pr-8">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            @{username}
          </span>
        </h2>
        <p className="text-sm text-white/60 mt-0.5">
          Here&apos;s what happened {windowPhrase}:
        </p>

        {/* Stat tiles — only non-zero stats render */}
        <div
          className={`mt-4 grid grid-cols-1 gap-2 ${
            tiles.length === 1
              ? "sm:grid-cols-1"
              : tiles.length === 2
                ? "sm:grid-cols-2"
                : "sm:grid-cols-3"
          }`}
        >
          {tiles.map((tile) => (
            <div
              key={tile.key}
              className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-sm"
            >
              <div className="w-9 h-9 rounded-full bg-white/5 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                {tile.icon}
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold leading-tight bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">
                  {tile.value.toLocaleString()}
                </p>
                <p className="text-xs text-white/60">{tile.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Single CTA: the fastest way to tell everyone you're back */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={goToLiveWall}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 shadow-[0_0_16px_rgba(236,72,153,0.4)] transition-all"
          >
            <PenLine className="h-4 w-4" />
            Post to your Live Wall
          </button>
          <p className="text-xs text-white/50">
            Let your fans know you&apos;re here.
          </p>
        </div>
      </div>
    </section>
  );
}
