"use client";

import { useState, useEffect, useCallback } from "react";
import { SwipeStack } from "./SwipeStack";
import { TopModelsLeaderboard } from "./TopModelsLeaderboard";
import { BoostModal } from "./BoostModal";
import { GameComplete } from "./GameComplete";
import { Loader2, Sparkles, Trophy, Heart, X, HelpCircle, Flame, Share2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Model {
  id: string;
  first_name: string | null;
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
}

interface TopModelsGameProps {
  initialUser?: {
    id: string;
    coinBalance: number;
  } | null;
}

export function TopModelsGame({ initialUser }: TopModelsGameProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [coinBalance, setCoinBalance] = useState(initialUser?.coinBalance || 0);
  const [loading, setLoading] = useState(true);
  const [boostModal, setBoostModal] = useState<Model | null>(null);
  const [gameComplete, setGameComplete] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);

  // Check if first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("topModelsWelcomeSeen");
    if (!hasSeenWelcome) {
      setShowWelcome(true);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem("topModelsWelcomeSeen", "true");
    setShowWelcome(false);
  };

  // Generate browser fingerprint
  useEffect(() => {
    const generateFingerprint = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
      }
      const canvasData = canvas.toDataURL();
      const userAgent = navigator.userAgent;
      const screenRes = `${screen.width}x${screen.height}`;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Simple hash function
      const str = `${canvasData}${userAgent}${screenRes}${timezone}`;
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(36);
    };

    setFingerprint(generateFingerprint());
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
      setModels(data.models || []);
      setSession(data.session);

      if (!data.session.canSwipe) {
        setGameComplete(true);
      } else if (data.models.length === 0) {
        setGameComplete(true);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
      toast.error("Failed to load game. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, [fingerprint]);

  useEffect(() => {
    if (fingerprint) {
      fetchModels();
    }
  }, [fingerprint, fetchModels]);

  // Handle swipe
  const handleSwipe = async (modelId: string, direction: "left" | "right") => {
    const voteType = direction === "right" ? "like" : "pass";

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

      const data = await res.json();

      if (data.points_awarded && data.points_awarded > 1) {
        toast.success(`Boosted! You gave this model ${data.points_awarded} points!`);
      }
    } catch (error) {
      console.error("Vote error:", error);
    }
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

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          toast.error(`Sign in required: ${data.error}`);
          return;
        }
        throw new Error(data.error);
      }

      // Update coin balance
      if (data.new_balance !== undefined) {
        setCoinBalance(data.new_balance);
      }

      const title = type === "reveal" ? "Boosted & Revealed!" : "Boosted!";
      toast.success(`${title} You gave ${boostModal.first_name || boostModal.username} ${data.points_awarded} points!`);

      // Remove this model from the stack
      setModels((prev) => prev.filter((m) => m.id !== boostModal.id));
    } catch (error) {
      console.error("Boost error:", error);
      toast.error("Failed to boost. Please try again.");
      throw error;
    }
  };

  // Handle empty stack
  const handleEmpty = () => {
    setGameComplete(true);
  };

  // Handle play again
  const handlePlayAgain = () => {
    setGameComplete(false);
    setModels([]);
    fetchModels();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        <p className="text-muted-foreground">Loading models...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop: Two columns - Game + Leaderboard */}
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Game Area */}
        <div className="flex-1 flex flex-col items-center">
          {gameComplete ? (
            <GameComplete
              nextResetAt={session?.nextResetAt || null}
              totalSwiped={session?.modelsSwiped || 0}
              onPlayAgain={handlePlayAgain}
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
            <div className="text-center py-12">
              <Sparkles className="h-12 w-12 mx-auto mb-4 text-pink-500" />
              <h3 className="text-xl font-bold mb-2">No models available</h3>
              <p className="text-muted-foreground mb-4">
                Check back later for more models to discover!
              </p>
              <Button onClick={fetchModels} variant="outline">
                Refresh
              </Button>
            </div>
          )}

          {/* Help & Share buttons */}
          {!gameComplete && (
            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={async () => {
                  const shareUrl = `${window.location.origin}/boost`;
                  const shareText = "Play EXA Boost - Swipe and boost your favorite models!";

                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: "EXA Boost",
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

      {/* Mobile Leaderboard - Collapsible */}
      <div className="lg:hidden mt-8">
        <details className="bg-white/5 rounded-xl">
          <summary className="p-4 cursor-pointer flex items-center gap-2 font-medium">
            <Trophy className="h-5 w-5 text-yellow-400" />
            Leaderboard
          </summary>
          <div className="p-4 pt-0">
            <TopModelsLeaderboard compact={true} />
          </div>
        </details>
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
                Welcome to EXA Boost
              </span>
              <Sparkles className="h-5 w-5 text-yellow-400 animate-pulse" />
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Boost Models up the Leaderboard
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
                <p className="text-sm text-muted-foreground">Give 1 point to boost their rank</p>
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
  );
}
