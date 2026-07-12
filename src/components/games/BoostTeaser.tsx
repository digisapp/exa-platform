"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, Flame, Heart, MapPin, X } from "lucide-react";
import { appendStoredBoostMatch, generateBoostFingerprint } from "./boost-shared";

const TEASER_DECK_SIZE = 5;

interface TeaserModel {
  id: string;
  username: string;
  profile_photo_url: string;
  state: string | null;
  focus_tags: string[] | null;
}

interface BoostTeaserProps {
  isLoggedIn: boolean;
  /**
   * "standalone" (default): self-contained centered section, horizontal
   * text-left/deck-right layout on desktop.
   * "column": bare card that fills a parent grid cell (e.g. paired with the
   * EXA Bids card on the homepage) — stacked layout at every breakpoint.
   */
  variant?: "standalone" | "column";
}

const cardVariants = {
  enter: { scale: 1, opacity: 1 },
  exit: (dir: number) => ({
    x: dir * 320,
    opacity: 0,
    zIndex: 5,
    transition: { duration: 0.2 },
  }),
};

function TeaserCard({
  model,
  exitDir,
  onSwipe,
}: {
  model: TeaserModel;
  exitDir: number;
  onSwipe: (direction: "left" | "right") => void;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-160, 160], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 40, 70], [0, 0.5, 1]);
  const passOpacity = useTransform(x, [-70, -40, 0], [1, 0.5, 0]);

  const handleDragEnd = (
    _: unknown,
    info: { offset: { x: number }; velocity: { x: number } }
  ) => {
    if (info.offset.x > 70 || info.velocity.x > 300) {
      onSwipe("right");
    } else if (info.offset.x < -70 || info.velocity.x < -300) {
      onSwipe("left");
    }
  };

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
      variants={cardVariants}
      initial={{ scale: 0.94, opacity: 1 }}
      animate="enter"
      exit="exit"
      custom={exitDir}
    >
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_12px_30px_rgba(0,0,0,0.5)]">
        <Image
          src={model.profile_photo_url}
          alt={model.username}
          fill
          sizes="(max-width: 640px) 304px, 208px"
          className="object-cover pointer-events-none"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        <motion.div
          className="absolute top-3 right-3 rotate-12 border-2 border-green-500 rounded-md px-2 py-0.5"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-green-500 font-bold text-sm">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-3 left-3 -rotate-12 border-2 border-red-500 rounded-md px-2 py-0.5"
          style={{ opacity: passOpacity }}
        >
          <span className="text-red-500 font-bold text-sm">PASS</span>
        </motion.div>

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-base truncate drop-shadow-lg">
            @{model.username}
          </p>
          {model.state && (
            <p className="flex items-center gap-1 text-white/70 text-xs mt-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {model.state}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SwipeActionButton({
  action,
  onClick,
  disabled,
}: {
  action: "pass" | "like";
  onClick: () => void;
  disabled: boolean;
}) {
  const isPass = action === "pass";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={isPass ? "Pass" : "Like"}
      className={`w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border-2 flex items-center justify-center transition-all disabled:opacity-50 shadow-lg ${
        isPass
          ? "border-red-500/50 hover:bg-red-500/20 shadow-red-500/10"
          : "border-green-500/50 hover:bg-green-500/20 shadow-green-500/10"
      }`}
    >
      {isPass ? (
        <X className="h-6 w-6 text-red-500" />
      ) : (
        <Heart className="h-6 w-6 text-green-500" />
      )}
    </button>
  );
}

export function BoostTeaser({ isLoggedIn, variant = "standalone" }: BoostTeaserProps) {
  const isColumn = variant === "column";
  const sectionRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const fingerprintRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [deck, setDeck] = useState<TeaserModel[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [exitDir, setExitDir] = useState(0);

  const loadDeck = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    try {
      const fingerprint = generateBoostFingerprint();
      fingerprintRef.current = fingerprint;
      const res = await fetch(`/api/games/boost?fingerprint=${fingerprint}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      sessionIdRef.current = data.session?.sessionId ?? null;
      const models: TeaserModel[] = (data.models || [])
        .filter((m: TeaserModel) => m.profile_photo_url)
        .slice(0, TEASER_DECK_SIZE);
      if (!data.session?.canSwipe || models.length === 0) {
        setFailed(true);
      } else {
        setDeck(models);
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      loadDeck();
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadDeck();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadDeck]);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      const model = deck?.[index];
      if (!model) return;
      setExitDir(direction === "right" ? 1 : -1);
      if (direction === "right") {
        setLikedCount((count) => count + 1);
        if (!isLoggedIn) {
          appendStoredBoostMatch({
            id: model.id,
            username: model.username,
            profile_photo_url: model.profile_photo_url,
          });
        }
      }
      setIndex((i) => i + 1);
      fetch("/api/games/boost/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: model.id,
          vote_type: direction === "right" ? "like" : "pass",
          fingerprint: fingerprintRef.current,
          session_id: sessionIdRef.current,
        }),
      })
        .then((res) => {
          if (!res.ok) return;
        })
        .catch(() => {});
    },
    [deck, index, isLoggedIn]
  );

  const done = failed || (deck !== null && index >= deck.length);
  const current = deck?.[index];
  const next = deck?.[index + 1];

  const card = (
      <div
        ref={sectionRef}
        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500/10 via-pink-500/5 to-transparent border border-orange-500/20 p-5 md:p-8 ${
          isColumn ? "h-full" : "max-w-2xl mx-auto"
        }`}
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <div
          className={`relative z-10 flex flex-col gap-6 ${
            isColumn ? "h-full" : "md:flex-row md:items-center md:gap-8"
          }`}
        >
          <div className={isColumn ? "" : "md:flex-1"}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Flame className="h-4 w-4 text-orange-300" />
              </div>
              <span className="text-xs font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-400">
                EXA SPOTLIGHT
              </span>
            </div>
            <p className="text-white/70 text-sm md:text-base">
              Swipe to discover models — likes build your feed
            </p>
          </div>

          <div
            className={`flex justify-center ${
              isColumn ? "flex-1 items-center" : "md:justify-end"
            }`}
          >
            {done ? (
              <div className="flex flex-col items-center gap-3 py-4">
                {likedCount > 0 && (
                  <p className="flex items-center gap-1.5 text-white/80 text-sm font-medium">
                    <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
                    You liked {likedCount} model{likedCount === 1 ? "" : "s"}
                  </p>
                )}
                <Link
                  href="/spotlight"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-sm font-semibold shadow-lg shadow-orange-500/25 transition-all"
                >
                  Keep playing on EXA Spotlight
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {likedCount > 0 && !isLoggedIn && (
                  <p className="text-xs text-white/50">
                    Sign up on EXA Spotlight to follow the models you liked
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-5">
                <div className="hidden sm:block">
                  <SwipeActionButton
                    action="pass"
                    onClick={() => handleSwipe("left")}
                    disabled={!current}
                  />
                </div>

                <div className="flex flex-col items-center gap-2.5">
                  <div className="relative w-[min(19rem,74vw)] aspect-[3/4] sm:w-52 sm:h-72 sm:aspect-auto touch-pan-y">
                    {deck === null ? (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/10 animate-pulse" />
                    ) : (
                      <>
                        {next && (
                          <div className="absolute inset-0 scale-[0.94] translate-y-2 rounded-2xl overflow-hidden bg-black ring-1 ring-white/10">
                            <Image
                              src={next.profile_photo_url}
                              alt={next.username}
                              fill
                              sizes="(max-width: 640px) 304px, 208px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40" />
                          </div>
                        )}
                        <AnimatePresence custom={exitDir}>
                          {current && (
                            <TeaserCard
                              key={current.id}
                              model={current}
                              exitDir={exitDir}
                              onSwipe={handleSwipe}
                            />
                          )}
                        </AnimatePresence>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: TEASER_DECK_SIZE }).map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 w-1.5 rounded-full transition-colors ${
                          i < index
                            ? "bg-gradient-to-r from-orange-400 to-pink-400"
                            : "bg-white/15"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-10 sm:hidden">
                  <SwipeActionButton
                    action="pass"
                    onClick={() => handleSwipe("left")}
                    disabled={!current}
                  />
                  <SwipeActionButton
                    action="like"
                    onClick={() => handleSwipe("right")}
                    disabled={!current}
                  />
                </div>
                <div className="hidden sm:block">
                  <SwipeActionButton
                    action="like"
                    onClick={() => handleSwipe("right")}
                    disabled={!current}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );

  if (isColumn) return card;

  return <section className="container px-4 md:px-16 py-6">{card}</section>;
}
