"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Gem,
  Gift,
  ArrowLeft,
  Loader2,
  Trophy,
  Clock,
  History,
  Sparkles,
} from "lucide-react";

interface BoxResult {
  gemsWon: number;
  boxTier: string;
  tierColor: string;
  newBalance: number;
}

interface BoxHistory {
  id: string;
  gems_won: number;
  box_tier: string;
  created_at: string;
}

const TIER_INFO = {
  common: { label: "Common", color: "#6b7280", emoji: "📦" },
  rare: { label: "Rare", color: "#3b82f6", emoji: "💙" },
  epic: { label: "Epic", color: "#8b5cf6", emoji: "💜" },
  legendary: { label: "Legendary", color: "#f59e0b", emoji: "⭐" },
};

export default function MysteryBoxPage() {
  const [gemBalance, setGemBalance] = useState<number>(0);
  const [canOpen, setCanOpen] = useState(true);
  const [nextBoxTime, setNextBoxTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [boxResult, setBoxResult] = useState<BoxResult | null>(null);
  const [history, setHistory] = useState<BoxHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"idle" | "shaking" | "opening" | "revealed">("idle");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/games/mystery-box");
      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.gemBalance);
        setCanOpen(data.canOpen);
        setNextBoxTime(data.nextBoxTime);
        setHistory(data.boxHistory || []);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenBox() {
    if (!canOpen || opening) return;

    setOpening(true);
    setBoxResult(null);
    setAnimationPhase("shaking");

    try {
      const response = await fetch("/api/games/mystery-box", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to open box");
        setOpening(false);
        setAnimationPhase("idle");
        return;
      }

      const result: BoxResult = await response.json();

      // Shake animation for 1.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Opening animation
      setAnimationPhase("opening");
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Reveal result
      setAnimationPhase("revealed");
      setBoxResult(result);
      setGemBalance(result.newBalance);
      setCanOpen(false);
      setOpening(false);

      const tierLabel = TIER_INFO[result.boxTier as keyof typeof TIER_INFO]?.label || result.boxTier;
      toast.success(`${tierLabel} box! You won ${result.gemsWon} gems!`);

      // Refresh history
      fetchStatus();
    } catch (error) {
      console.error("Open box error:", error);
      toast.error("Failed to open box. Please try again.");
      setOpening(false);
      setAnimationPhase("idle");
    }
  }

  function formatTimeUntilBox(isoString: string): string {
    const nextBox = new Date(isoString);
    const now = new Date();
    const diffMs = nextBox.getTime() - now.getTime();

    if (diffMs <= 0) return "Ready!";

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    }
    return `${hours}h`;
  }

  function resetAnimation() {
    setAnimationPhase("idle");
    setBoxResult(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/games">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="h-6 w-6 text-amber-500" />
            Mystery Box
          </h1>
          <p className="text-muted-foreground">
            Open a mystery box once a week for surprise gems!
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <Gem className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-cyan-400">{gemBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Box Section */}
        <Card className="overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center min-h-[400px] justify-center">
            {/* Mystery Box Animation */}
            <div className="relative mb-8">
              {animationPhase === "revealed" && boxResult ? (
                // Revealed state - show results
                <div className="text-center animate-in zoom-in duration-500">
                  <div
                    className="text-8xl mb-4"
                    style={{
                      filter: `drop-shadow(0 0 20px ${boxResult.tierColor})`,
                    }}
                  >
                    {TIER_INFO[boxResult.boxTier as keyof typeof TIER_INFO]?.emoji || "📦"}
                  </div>
                  <Badge
                    className="text-lg px-4 py-2 mb-4"
                    style={{
                      backgroundColor: boxResult.tierColor,
                      color: "#fff",
                    }}
                  >
                    {TIER_INFO[boxResult.boxTier as keyof typeof TIER_INFO]?.label || boxResult.boxTier} Box!
                  </Badge>
                  <div className="flex items-center justify-center gap-2 text-3xl font-bold text-cyan-400">
                    <Gem className="h-8 w-8" />
                    <span>+{boxResult.gemsWon}</span>
                  </div>
                </div>
              ) : (
                // Box animation states
                <div
                  className={`relative transition-all duration-300 ${
                    animationPhase === "shaking"
                      ? "animate-shake"
                      : animationPhase === "opening"
                      ? "scale-110 opacity-50"
                      : ""
                  }`}
                >
                  {/* Gift box SVG */}
                  <div className="relative w-48 h-48">
                    {/* Box lid */}
                    <div
                      className={`absolute top-0 left-1/2 -translate-x-1/2 w-52 h-12 transition-all duration-500 ${
                        animationPhase === "opening" ? "-translate-y-8 rotate-12" : ""
                      }`}
                    >
                      <div className="w-full h-full bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-lg shadow-lg">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-full bg-amber-600" />
                      </div>
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-16 h-8">
                        <div className="w-full h-full bg-amber-600 rounded-full" />
                      </div>
                    </div>

                    {/* Box body */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-36 bg-gradient-to-b from-amber-500 to-amber-600 rounded-lg shadow-xl overflow-hidden">
                      {/* Ribbon vertical */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full bg-amber-700" />
                      {/* Shine effect */}
                      <div className="absolute top-0 left-0 w-1/3 h-full bg-gradient-to-r from-white/20 to-transparent" />

                      {/* Sparkles when shaking */}
                      {animationPhase === "shaking" && (
                        <>
                          <Sparkles className="absolute -top-2 -left-2 h-6 w-6 text-yellow-300 animate-ping" />
                          <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-300 animate-ping delay-100" />
                          <Sparkles className="absolute -bottom-2 left-4 h-5 w-5 text-yellow-300 animate-ping delay-200" />
                          <Sparkles className="absolute -bottom-2 right-4 h-5 w-5 text-yellow-300 animate-ping delay-300" />
                        </>
                      )}
                    </div>

                    {/* Question marks */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 text-4xl font-bold text-amber-800/50">
                      ?
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Open Button */}
            {animationPhase === "revealed" ? (
              <Button
                onClick={resetAnimation}
                variant="outline"
                className="px-8 py-6 text-lg"
              >
                <Gift className="mr-2 h-5 w-5" />
                View Box
              </Button>
            ) : (
              <Button
                onClick={handleOpenBox}
                disabled={!canOpen || opening}
                className="px-8 py-6 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
              >
                {opening ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening...
                  </>
                ) : canOpen ? (
                  <>
                    <Gift className="mr-2 h-5 w-5" />
                    Open Mystery Box!
                  </>
                ) : (
                  <>
                    <Clock className="mr-2 h-5 w-5" />
                    {nextBoxTime ? formatTimeUntilBox(nextBoxTime) : "Come back next week!"}
                  </>
                )}
              </Button>
            )}

            {!canOpen && nextBoxTime && animationPhase !== "revealed" && (
              <p className="text-sm text-muted-foreground mt-2">
                Next box available in {formatTimeUntilBox(nextBoxTime)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Tiers Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Box Tiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>📦</span>
                    <span className="text-sm font-medium" style={{ color: TIER_INFO.common.color }}>Common</span>
                  </div>
                  <span className="text-xs text-muted-foreground">5-25 gems</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>💙</span>
                    <span className="text-sm font-medium" style={{ color: TIER_INFO.rare.color }}>Rare</span>
                  </div>
                  <span className="text-xs text-muted-foreground">30-75 gems</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>💜</span>
                    <span className="text-sm font-medium" style={{ color: TIER_INFO.epic.color }}>Epic</span>
                  </div>
                  <span className="text-xs text-muted-foreground">100-200 gems</span>
                </div>
                <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                  <div className="flex items-center gap-2">
                    <span>⭐</span>
                    <span className="text-sm font-medium" style={{ color: TIER_INFO.legendary.color }}>Legendary</span>
                  </div>
                  <span className="text-xs text-muted-foreground">300-500 gems</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Legendary boxes are rare but worth the wait!
              </p>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Recent Boxes
                </span>
                <Badge variant="outline">{history.length}</Badge>
              </CardTitle>
            </CardHeader>
            {(showHistory || history.length <= 5) && (
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No boxes opened yet. Try your luck!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 10).map((box) => {
                      const tierInfo = TIER_INFO[box.box_tier as keyof typeof TIER_INFO];
                      return (
                        <div
                          key={box.id}
                          className="flex items-center justify-between py-1.5 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span>{tierInfo?.emoji || "📦"}</span>
                            <span className="text-muted-foreground">
                              {new Date(box.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <span className="font-medium text-cyan-400">
                            +{box.gems_won} gems
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Custom shake animation */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0); }
          10% { transform: translateX(-5px) rotate(-2deg); }
          20% { transform: translateX(5px) rotate(2deg); }
          30% { transform: translateX(-5px) rotate(-2deg); }
          40% { transform: translateX(5px) rotate(2deg); }
          50% { transform: translateX(-5px) rotate(-2deg); }
          60% { transform: translateX(5px) rotate(2deg); }
          70% { transform: translateX(-5px) rotate(-2deg); }
          80% { transform: translateX(5px) rotate(2deg); }
          90% { transform: translateX(-5px) rotate(-2deg); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
