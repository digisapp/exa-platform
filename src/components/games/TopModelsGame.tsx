"use client";

import { useState, useEffect, useCallback } from "react";
import { SwipeStack } from "./SwipeStack";
import { TopModelsLeaderboard } from "./TopModelsLeaderboard";
import { BoostModal } from "./BoostModal";
import { GameComplete } from "./GameComplete";
import { Loader2, Sparkles, Trophy, Heart, X, HelpCircle, Flame } from "lucide-react";
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

          {/* Help button */}
          {!gameComplete && (
            <div className="mt-6">
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
            View Leaderboard
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
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <div className="flex justify-center mb-2">
              <Image
                src="/exa-logo-white.png"
                alt="EXA"
                width={80}
                height={32}
                className="h-8 w-auto"
              />
            </div>
            <DialogTitle className="text-center text-xl">
              Welcome to EXA Boost
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Boost your Favorite Models
            </p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-4 p-3 bg-green-500/10 rounded-lg">
              <div className="p-2 rounded-full bg-green-500/20">
                <Heart className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-medium">Swipe Right = Like</p>
                <p className="text-sm text-muted-foreground">Give 1 point</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-red-500/10 rounded-lg">
              <div className="p-2 rounded-full bg-red-500/20">
                <X className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-medium">Swipe Left = Pass</p>
                <p className="text-sm text-muted-foreground">Skip to next</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-orange-500/10 rounded-lg">
              <div className="p-2 rounded-full bg-orange-500/20">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="font-medium">Boost = 5x Points</p>
                <p className="text-sm text-muted-foreground">Use coins to boost</p>
              </div>
            </div>
            <Button onClick={dismissWelcome} className="w-full bg-gradient-to-r from-pink-500 to-purple-500">
              Start Swiping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
