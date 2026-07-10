"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { SwipeStack } from "./SwipeStack";
import { TopModelsLeaderboard } from "./TopModelsLeaderboard";
import { BoostModal } from "./BoostModal";
import { GameComplete } from "./GameComplete";
import { Loader2, Sparkles, Heart, X, HelpCircle, Flame, Share2, MessageCircle, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FanSignupDialog } from "@/components/auth/FanSignupDialog";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import {
  type BoostMatch as MatchModel,
  BOOST_MATCHES_STORAGE_KEY as MATCHES_STORAGE_KEY,
  readStoredBoostMatches as readStoredMatches,
  generateBoostFingerprint,
} from "./boost-shared";

interface Model {
  id: string;
  username: string;
  profile_photo_url: string;
  city: string | null;
  state: string | null;
  focus_tags: string[] | null;
  is_verified: boolean | null;
  is_featured: boolean | null;
  today_points?: number;
  total_points?: number;
  today_rank?: number | null;
}

interface Session {
  canSwipe: boolean;
  modelsSwiped: number;
  totalModels: number;
  modelsRemaining?: number;
  nextResetAt: string | null;
  sessionId: string | null;
  currentStreak?: number;
  longestStreak?: number;
  lastPlayDate?: string | null;
}

interface TopModelsGameProps {
  initialUser?: {
    id: string;
    coinBalance: number;
  } | null;
  actorType?: string | null;
}

const REFILL_THRESHOLD = 10;
const FOLLOW_TOAST_KEY = "boostFollowToastSeen";

export function TopModelsGame({ initialUser, actorType }: TopModelsGameProps) {
  const [models, setModels] = useState<Model[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const remainingRef = useRef(0);
  const hasMoreRef = useRef(false);
  const fetchMorePromiseRef = useRef<Promise<number> | null>(null);
  const pendingVotesRef = useRef<Set<Promise<unknown>>>(new Set());
  const [session, setSession] = useState<Session | null>(null);
  const [coinBalance, setCoinBalance] = useState(initialUser?.coinBalance || 0);
  const [loading, setLoading] = useState(true);
  const [boostModal, setBoostModal] = useState<Model | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [matches, setMatches] = useState<MatchModel[]>([]);
  const [showMatches, setShowMatches] = useState(false);
  const [pendingMatches, setPendingMatches] = useState<MatchModel[]>([]);
  const [followingPending, setFollowingPending] = useState(false);
  const sounds = useGameSounds();

  const isFan = actorType === "fan";

  // Get global coin balance context (for updating navbar balance)
  const coinBalanceContext = useCoinBalanceOptional();

  // Session stats tracking
  const [sessionStats, setSessionStats] = useState({
    likes: 0,
    passes: 0,
    boosts: 0,
    pointsGiven: 0,
  });
  const [streak, setStreak] = useState(0);
  // Check if first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("topModelsWelcomeSeen");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  // Restore matches saved before signup. Anonymous players keep building the
  // list; a returning fan gets a one-tap "Follow your matches" offer instead.
  useEffect(() => {
    const stored = readStoredMatches();
    if (!initialUser) {
      if (stored.length > 0) setMatches(stored);
    } else if (isFan && stored.length > 0) {
      setPendingMatches(stored);
    } else if (stored.length > 0) {
      localStorage.removeItem(MATCHES_STORAGE_KEY);
    }
  }, [initialUser, isFan]);

  const addMatch = useCallback(
    (model: Model) => {
      const match: MatchModel = {
        id: model.id,
        username: model.username,
        profile_photo_url: model.profile_photo_url,
      };
      setMatches((prev) => {
        if (prev.some((m) => m.id === match.id)) return prev;
        const next = [...prev, match];
        if (!initialUser) {
          try {
            localStorage.setItem(MATCHES_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // localStorage might be unavailable
          }
        }
        return next;
      });
    },
    [initialUser]
  );

  // One-tap follow for matches liked while anonymous (idempotent — reuses the
  // favorites endpoint, which upserts)
  const followPendingMatches = async () => {
    if (followingPending || pendingMatches.length === 0) return;
    setFollowingPending(true);
    let followedCount = 0;
    try {
      for (const match of pendingMatches) {
        try {
          const res = await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId: match.id }),
          });
          if (res.ok) followedCount++;
        } catch {
          // Skip this one, keep going
        }
      }
    } finally {
      setFollowingPending(false);
    }
    if (followedCount > 0) {
      try {
        localStorage.removeItem(MATCHES_STORAGE_KEY);
      } catch {
        // localStorage might be unavailable
      }
      setMatches((prev) => {
        const merged = [...prev];
        for (const match of pendingMatches) {
          if (!merged.some((m) => m.id === match.id)) merged.push(match);
        }
        return merged;
      });
      setPendingMatches([]);
      toast.success(`Following ${followedCount} model${followedCount === 1 ? "" : "s"} — they're in your feed now!`);
    } else {
      toast.error("Couldn't follow your matches. Please try again.");
    }
  };

  // Load streak and spin status from session (Supabase for signed-in users, localStorage for anonymous)
  useEffect(() => {
    if (initialUser && session?.currentStreak !== undefined) {
      // Signed-in user: use streak from Supabase
      setStreak(session.currentStreak);
    } else if (!initialUser) {
      // Anonymous user: use localStorage
      const today = new Date().toDateString();
      const lastPlayDate = localStorage.getItem("boostLastPlayDate");
      const savedStreak = parseInt(localStorage.getItem("boostStreak") || "0");

      if (lastPlayDate === today) {
        // Already played today, keep current streak
        setStreak(savedStreak);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastPlayDate === yesterday.toDateString()) {
          // Played yesterday, streak continues
          setStreak(savedStreak);
        } else {
          // Streak broken, reset to 0 (will become 1 when they complete)
          setStreak(0);
        }
      }
    }
  }, [initialUser, session?.currentStreak]);

  const dismissWelcome = () => {
    localStorage.setItem("topModelsWelcomeSeen", "true");
    setShowWelcome(false);
  };

  // Generate browser fingerprint
  useEffect(() => {
    setFingerprint(generateBoostFingerprint());
  }, []);

  // Fetch models and session
  const fetchModels = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/games/boost${fingerprint ? `?fingerprint=${fingerprint}` : ""}`
      );
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const deck: Model[] = data.models || [];
      seenIdsRef.current = new Set(deck.map((m) => m.id));
      remainingRef.current = deck.length;
      hasMoreRef.current = !!data.hasMore;
      setModels(deck);
      setSession(data.session);

      if (!data.session.canSwipe) {
        setGameComplete(true);
      } else if (deck.length === 0) {
        setGameComplete(true);
      } else {
        setGameComplete(false);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("Failed to load game. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [fingerprint]);

  // Fetch the next batch of unswiped models and append them to the deck.
  // Shares the in-flight promise so a deck-empty check can await a refill
  // that a threshold prefetch already kicked off.
  const fetchMoreModels = useCallback((): Promise<number> => {
    if (fetchMorePromiseRef.current) return fetchMorePromiseRef.current;
    if (!hasMoreRef.current) return Promise.resolve(0);

    const promise = (async () => {
      try {
        const res = await fetch(
          `/api/games/boost${fingerprint ? `?fingerprint=${fingerprint}` : ""}`
        );
        if (!res.ok) return 0;

        const data = await res.json();
        hasMoreRef.current = !!data.hasMore;
        const fresh: Model[] = (data.models || []).filter(
          (m: Model) => !seenIdsRef.current.has(m.id)
        );
        if (fresh.length > 0) {
          fresh.forEach((m) => seenIdsRef.current.add(m.id));
          remainingRef.current += fresh.length;
          setModels((prev) => [...prev, ...fresh]);
        }
        return fresh.length;
      } catch (error) {
        console.error("Failed to fetch more models:", error);
        return 0;
      } finally {
        fetchMorePromiseRef.current = null;
      }
    })();

    fetchMorePromiseRef.current = promise;
    return promise;
  }, [fingerprint]);

  // Top up the deck before it runs dry
  const maybeRefillDeck = useCallback(() => {
    remainingRef.current -= 1;
    if (remainingRef.current <= REFILL_THRESHOLD && hasMoreRef.current) {
      fetchMoreModels();
    }
  }, [fetchMoreModels]);

  useEffect(() => {
    if (fingerprint) {
      fetchModels();
    }
  }, [fingerprint, fetchModels]);

  // Handle swipe
  const handleSwipe = async (modelId: string, direction: "left" | "right") => {
    const voteType = direction === "right" ? "like" : "pass";
    const likedModel = voteType === "like" ? models.find((m) => m.id === modelId) : undefined;

    // Update session stats
    setSessionStats((prev) => ({
      ...prev,
      likes: voteType === "like" ? prev.likes + 1 : prev.likes,
      passes: voteType === "pass" ? prev.passes + 1 : prev.passes,
      pointsGiven: voteType === "like" ? prev.pointsGiven + 1 : prev.pointsGiven,
    }));

    if (likedModel) {
      addMatch(likedModel);
    }

    maybeRefillDeck();

    const votePromise = (async () => {
      try {
        const res = await fetch("/api/games/boost/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model_id: modelId,
            vote_type: voteType,
            fingerprint,
            session_id: session?.sessionId,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 429) {
            toast.info("Whoa, easy! Give it a few seconds before swiping again.");
          } else {
            toast.error(data.error || "That swipe didn't count. Please try again.");
          }
          return;
        }

        if (data.followed && likedModel && !localStorage.getItem(FOLLOW_TOAST_KEY)) {
          localStorage.setItem(FOLLOW_TOAST_KEY, "true");
          toast.success(`Following @${likedModel.username} — likes build your feed`);
        }

        if (data.points_awarded && data.points_awarded > 1) {
          toast.success(`Boosted! You gave this model ${data.points_awarded} points!`);
        }
      } catch (error) {
        console.error("Vote error:", error);
        toast.error("That swipe didn't count. Check your connection.");
      }
    })();

    pendingVotesRef.current.add(votePromise);
    votePromise.finally(() => pendingVotesRef.current.delete(votePromise));
    await votePromise;
  };

  // Handle boost
  const handleBoost = async (type: "boost" | "reveal" | "super") => {
    if (!boostModal) return;

    try {
      const res = await fetch("/api/games/boost/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: boostModal.id,
          vote_type: "like",
          boost: true,
          reveal: type === "reveal" || type === "super",
          super_boost: type === "super",
          fingerprint,
          session_id: session?.sessionId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          toast.error(`Sign in required: ${data.error}`);
          return;
        }
        if (res.status === 429) {
          toast.info("You're boosting fast! Try again in a few seconds.");
          return;
        }
        throw new Error(data.error);
      }

      // Update session stats with the points the server actually awarded
      const boostPoints = data.points_awarded || 0;
      setSessionStats((prev) => ({
        ...prev,
        likes: prev.likes + 1,
        boosts: prev.boosts + 1,
        pointsGiven: prev.pointsGiven + boostPoints,
      }));

      // Update coin balance (both local and global context)
      if (data.new_balance !== undefined) {
        setCoinBalance(data.new_balance);
        // Also update global context so navbar reflects the new balance
        coinBalanceContext?.setBalance(data.new_balance);
      }

      addMatch(boostModal);

      const title = type === "reveal" ? "Boosted & Revealed!" : "Boosted!";
      toast.success(`${title} You gave ${boostModal.username} ${data.points_awarded} points!`);

      // Play boost sound
      sounds.onBoost();

      // Remove this model from the stack
      setModels((prev) => prev.filter((m) => m.id !== boostModal.id));
      maybeRefillDeck();
    } catch (error) {
      console.error("Boost error:", error);
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Failed to boost. Please try again."
      );
      throw error;
    }
  };

  // Handle empty stack
  const handleEmpty = async () => {
    // If the server still has unswiped models (or a refill is already in
    // flight), top up instead of completing
    if (hasMoreRef.current || fetchMorePromiseRef.current) {
      const appended = await fetchMoreModels();
      if (appended > 0) return;
    }

    // Let in-flight votes land so the final swipe's completion marker is
    // written before we refetch the session
    if (pendingVotesRef.current.size > 0) {
      await Promise.allSettled([...pendingVotesRef.current]);
    }

    // Update streak when game completes
    if (initialUser && session?.sessionId) {
      // Signed-in user: save to Supabase
      try {
        const res = await fetch("/api/games/boost/streak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: session.sessionId }),
        });
        const data = await res.json();
        if (data.success) {
          setStreak(data.currentStreak);
        }
      } catch (error) {
        console.error("Failed to update streak:", error);
      }
    } else {
      // Anonymous user: save to localStorage
      const today = new Date().toDateString();
      const lastPlayDate = localStorage.getItem("boostLastPlayDate");
      const savedStreak = parseInt(localStorage.getItem("boostStreak") || "0");

      if (lastPlayDate !== today) {
        // First completion today
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const newStreak = lastPlayDate === yesterday.toDateString() ? savedStreak + 1 : 1;

        localStorage.setItem("boostLastPlayDate", today);
        localStorage.setItem("boostStreak", newStreak.toString());
        setStreak(newStreak);
      }
    }

    // Refetch so GameComplete renders with the real reset time instead of a
    // stale "Ready to Play Again!" flash
    await fetchModels();
  };

  // Handle play again
  const handlePlayAgain = () => {
    setGameComplete(false);
    setModels([]);
    fetchModels();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        {/* Animated loading card */}
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />

          {/* Card skeleton */}
          <div className="relative w-[280px] h-[380px] rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 overflow-hidden">
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

            {/* Content skeleton */}
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              <div className="h-8 w-32 bg-white/10 rounded-lg" />
              <div className="h-4 w-24 bg-white/5 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-white/5 rounded-full" />
                <div className="h-6 w-20 bg-white/5 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading text */}
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-pink-500" />
          <p className="text-muted-foreground">
            <span className="bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text font-medium">
              Loading models
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <div className="w-full">
      {/* Desktop: Two columns - Game + Leaderboard */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Game Area */}
        <div className="flex-1 flex flex-col items-center pb-8 md:pb-0" aria-live="polite">
          {initialUser && isFan && pendingMatches.length > 0 && (
            <div className="w-full max-w-[400px] mb-4 flex items-center justify-between gap-3 p-3 rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-orange-500/10 shadow-[0_0_16px_rgba(236,72,153,0.15)]">
              <div className="flex items-center gap-2 min-w-0">
                <Heart className="h-4 w-4 text-pink-400 fill-pink-400 shrink-0" />
                <p className="text-sm text-white/90 truncate">
                  You liked {pendingMatches.length} model{pendingMatches.length === 1 ? "" : "s"} before signing up
                </p>
              </div>
              <Button
                size="sm"
                onClick={followPendingMatches}
                disabled={followingPending}
                className="shrink-0 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 shadow-lg shadow-pink-500/25"
              >
                {followingPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-1.5" />
                )}
                Follow all
              </Button>
            </div>
          )}

          {matches.length > 0 && (
            <button
              onClick={() => setShowMatches(true)}
              className="mb-4 flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-pink-500/15 to-orange-500/10 border border-pink-500/30 hover:border-pink-500/60 hover:from-pink-500/25 hover:to-orange-500/15 text-sm font-semibold text-white shadow-[0_0_12px_rgba(236,72,153,0.25)] transition-all"
            >
              <Heart className="h-4 w-4 text-pink-400 fill-pink-400" />
              {matches.length} {initialUser && isFan ? "following" : "liked"}
            </button>
          )}

          {gameComplete ? (
            <GameComplete
              nextResetAt={session?.nextResetAt || null}
              totalSwiped={session?.modelsSwiped || 0}
              onPlayAgain={handlePlayAgain}
              sessionStats={sessionStats}
              streak={streak}
              isLoggedIn={!!initialUser}
              likedCount={matches.length}
            />
          ) : models.length > 0 ? (
            <SwipeStack
              models={models}
              onSwipe={handleSwipe}
              onBoost={(model) => setBoostModal(model)}
              onEmpty={handleEmpty}
              totalModels={session?.totalModels}
              modelsSwiped={session?.modelsSwiped}
            />
          ) : (
            <div className="text-center py-12 px-6 relative max-w-sm mx-auto">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-orange-500/10 rounded-3xl pointer-events-none" />

              <div className="relative">
                {/* Icon with glow */}
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-xl opacity-40 animate-pulse" />
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center">
                    <Sparkles className="h-10 w-10 text-pink-400" />
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 text-transparent bg-clip-text">
                  That&apos;s today&apos;s lineup
                </h3>
                <p className="text-muted-foreground mb-6">
                  Come back tomorrow for a fresh deck of models!
                </p>
                <Button
                  onClick={fetchModels}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 shadow-lg shadow-pink-500/25"
                >
                  <Loader2 className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          )}

          {/* Help & Share buttons */}
          {!gameComplete && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/boost`;
                  const shareText = "Play EXA Spotlight - Swipe and boost your favorite models!";

                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "EXA Spotlight",
                        text: shareText,
                        url: shareUrl,
                      });
                    } catch {
                      // User cancelled
                    }
                  } else {
                    await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                    toast.success("Link copied!");
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </button>
              <button
                onClick={() => setShowWelcome(true)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground bg-white/5 rounded-full hover:bg-white/10 transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                <span>How to play</span>
              </button>
            </div>
          )}
        </div>

        {/* Leaderboard Sidebar (Desktop) */}
        <div className="lg:w-80 hidden lg:block">
          <div className="sticky top-24">
            <TopModelsLeaderboard compact={false} />
          </div>
        </div>
      </div>

      {/* Mobile Leaderboard - Always visible */}
      <div className="lg:hidden mt-8">
        <div className="bg-white/5 rounded-xl p-4">
          <TopModelsLeaderboard compact={false} />
        </div>
      </div>

      {/* Boost Modal */}
      <BoostModal
        open={!!boostModal}
        onClose={() => setBoostModal(null)}
        model={boostModal}
        coinBalance={coinBalance}
        isLoggedIn={!!initialUser}
        onBoost={handleBoost}
      />

      {/* Matches Sheet */}
      <Dialog open={showMatches} onOpenChange={setShowMatches}>
        <DialogContent className="max-w-sm max-h-[85dvh] overflow-y-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-orange-500/10 pointer-events-none" />
          <DialogHeader className="relative">
            <DialogTitle className="flex items-center justify-center gap-2">
              <Heart className="h-5 w-5 text-pink-400 fill-pink-400" />
              <span className="bg-gradient-to-r from-pink-400 to-orange-400 text-transparent bg-clip-text font-bold">
                {initialUser && isFan ? "Following" : "Models you liked"}
              </span>
            </DialogTitle>
            <p className="text-sm text-muted-foreground text-center">
              {initialUser && isFan
                ? "In your feed now — likes build your feed"
                : `${matches.length} model${matches.length === 1 ? "" : "s"} you liked today`}
            </p>
          </DialogHeader>

          {!initialUser && matches.length > 0 && (
            <div className="relative">
              <FanSignupDialog redirectTo="/boost">
                <Button className="w-full bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 hover:to-orange-600 shadow-lg shadow-pink-500/25">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign up to follow the {matches.length} model{matches.length === 1 ? "" : "s"} you liked
                </Button>
              </FanSignupDialog>
            </div>
          )}

          <div className="relative grid grid-cols-3 gap-3 py-2">
            {matches.map((match) => (
              <div key={match.id} className="flex flex-col items-center gap-1.5">
                <Link href={`/${match.username}`} className="group flex flex-col items-center gap-1.5 w-full">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden ring-1 ring-pink-500/30 group-hover:ring-pink-500/70 transition-all">
                    {match.profile_photo_url ? (
                      <Image
                        src={match.profile_photo_url}
                        alt={match.username}
                        fill
                        sizes="120px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-pink-500/40 to-purple-500/40 flex items-center justify-center text-white font-bold text-lg">
                        {(match.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-white/70 group-hover:text-white truncate max-w-full transition-colors">
                    @{match.username}
                  </span>
                </Link>
                {initialUser && isFan && (
                  <Link
                    href={`/chats/new?model=${encodeURIComponent(match.username)}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500/15 to-orange-500/10 border border-pink-500/30 hover:border-pink-500/60 text-[11px] font-semibold text-pink-300 hover:text-pink-200 transition-all"
                  >
                    <MessageCircle className="h-3 w-3" />
                    Say hi
                  </Link>
                )}
              </div>
            ))}
          </div>

          {matches.length === 0 && (
            <p className="relative text-sm text-muted-foreground text-center py-6">
              Swipe right on models you like — they&apos;ll show up here.
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Welcome Modal */}
      <Dialog open={showWelcome} onOpenChange={(open) => !open && dismissWelcome()}>
        <DialogContent className="max-w-sm overflow-hidden">
          {/* Background glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/5 to-orange-500/10 pointer-events-none" />

          <DialogHeader className="text-center relative">
            {/* Animated logo with glow */}
            <div className="flex justify-center mb-3">
              <div className="relative">
                <span className="absolute inset-0 blur-xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 opacity-60 animate-pulse" />
                <Image
                  src="/exa-logo-white.png"
                  alt="EXA"
                  width={100}
                  height={40}
                  className="h-10 w-auto relative"
                />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 text-transparent bg-clip-text font-bold">
                Welcome to EXA Spotlight
              </span>
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              A fresh deck of ~25 models daily — boost them up the leaderboard
            </p>
          </DialogHeader>

          <div className="space-y-3 py-3 relative">
            {/* Like instruction */}
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-xl border border-green-500/20">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-green-400">Swipe Right = Like</p>
                <p className="text-sm text-muted-foreground">
                  {isFan ? "Boost their rank + follow them" : "Give 1 point to boost their rank"}
                </p>
              </div>
            </div>

            {/* Pass instruction */}
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-red-500/10 to-red-500/5 rounded-xl border border-red-500/20">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30">
                <X className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-400">Swipe Left = Pass</p>
                <p className="text-sm text-muted-foreground">Skip to the next model</p>
              </div>
            </div>

            {/* Boost instruction */}
            <div className="flex items-center gap-4 p-3 bg-gradient-to-r from-orange-500/10 via-pink-500/10 to-purple-500/10 rounded-xl border border-orange-500/20">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-500 shadow-lg shadow-orange-500/30 animate-pulse">
                <Flame className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold bg-gradient-to-r from-orange-400 to-pink-400 text-transparent bg-clip-text">Boost = 5x Points</p>
                <p className="text-sm text-muted-foreground">Use coins for maximum impact</p>
              </div>
            </div>

            <Button
              onClick={dismissWelcome}
              className="w-full h-12 text-base bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 hover:from-pink-600 hover:via-purple-600 hover:to-orange-600 shadow-lg shadow-pink-500/25 mt-2"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Start Swiping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </ErrorBoundary>
  );
}
