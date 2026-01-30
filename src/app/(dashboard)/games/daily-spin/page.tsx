"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Gem,
  Sparkles,
  ArrowLeft,
  Loader2,
  Trophy,
  Clock,
  History
} from "lucide-react";

interface SpinResult {
  gemsWon: number;
  spinResult: string;
  newBalance: number;
}

interface SpinHistory {
  id: string;
  gems_won: number;
  spin_result: string;
  created_at: string;
}

// Wheel segments with their values and colors
const WHEEL_SEGMENTS = [
  { value: 10, label: "10", color: "#6366f1", textColor: "#fff" },
  { value: 25, label: "25", color: "#8b5cf6", textColor: "#fff" },
  { value: 50, label: "50", color: "#a855f7", textColor: "#fff" },
  { value: 100, label: "100", color: "#d946ef", textColor: "#fff" },
  { value: 5, label: "5", color: "#4f46e5", textColor: "#fff" },
  { value: 200, label: "200", color: "#ec4899", textColor: "#fff" },
  { value: 15, label: "15", color: "#7c3aed", textColor: "#fff" },
  { value: 500, label: "500", color: "#f43f5e", textColor: "#fff" },
];

export default function DailySpinPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gemBalance, setGemBalance] = useState<number>(0);
  const [canSpin, setCanSpin] = useState(true);
  const [nextSpinTime, setNextSpinTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const [history, setHistory] = useState<SpinHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw segments
    const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
    const rotationRad = (rotation * Math.PI) / 180;

    WHEEL_SEGMENTS.forEach((segment, index) => {
      const startAngle = rotationRad + index * segmentAngle;
      const endAngle = startAngle + segmentAngle;

      // Draw segment
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = "#1e1e2e";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = segment.textColor;
      ctx.font = "bold 18px sans-serif";
      ctx.fillText(segment.label, radius - 20, 6);
      ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f0f17";
    ctx.fill();
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw gem icon in center
    ctx.fillStyle = "#06b6d4";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💎", centerX, centerY);
  }, [rotation]);

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/games/status");
      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.gemBalance);
        setCanSpin(data.canSpin);
        setNextSpinTime(data.nextSpinTime);
        setHistory(data.spinHistory || []);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSpin() {
    if (!canSpin || spinning) return;

    setSpinning(true);
    setSpinResult(null);

    try {
      const response = await fetch("/api/games/daily-spin", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to spin");
        setSpinning(false);
        return;
      }

      const result: SpinResult = await response.json();

      // Find segment index for the result
      const segmentIndex = WHEEL_SEGMENTS.findIndex(
        (s) => s.value === result.gemsWon
      );

      // Calculate final rotation
      // The pointer is at the top, so we need to account for that
      const segmentAngle = 360 / WHEEL_SEGMENTS.length;
      const targetAngle = 360 - (segmentIndex * segmentAngle + segmentAngle / 2);
      const spins = 5; // Number of full rotations
      const finalRotation = spins * 360 + targetAngle + 90; // +90 because pointer is at top

      // Animate the spin
      const currentRotation = rotation;
      const startTime = performance.now();
      const duration = 4000; // 4 seconds

      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const newRotation = currentRotation + (finalRotation - currentRotation) * easeOut;

        setRotation(newRotation % 360);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Spin complete
          setSpinResult(result);
          setGemBalance(result.newBalance);
          setCanSpin(false);
          setSpinning(false);
          toast.success(`You won ${result.gemsWon} gems!`);
          fetchStatus(); // Refresh history
        }
      }

      requestAnimationFrame(animate);
    } catch (error) {
      console.error("Spin error:", error);
      toast.error("Failed to spin. Please try again.");
      setSpinning(false);
    }
  }

  function formatTimeUntilSpin(isoString: string): string {
    const nextSpin = new Date(isoString);
    const now = new Date();
    const diffMs = nextSpin.getTime() - now.getTime();

    if (diffMs <= 0) return "Ready!";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
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
            <Sparkles className="h-6 w-6 text-pink-500" />
            Daily Spin
          </h1>
          <p className="text-muted-foreground">
            Spin the wheel once a day to win gems!
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <Gem className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-cyan-400">{gemBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Wheel Section */}
        <Card className="overflow-hidden">
          <CardContent className="p-8 flex flex-col items-center">
            {/* Pointer */}
            <div className="relative w-0 h-0 mb-[-10px] z-10">
              <div
                className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-pink-500"
                style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
              />
            </div>

            {/* Wheel Canvas */}
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={320}
                height={320}
                className="max-w-full"
              />

              {/* Glow effect when spinning */}
              {spinning && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-gradient-to-r from-pink-500/20 to-violet-500/20 blur-xl" />
              )}
            </div>

            {/* Result Display */}
            {spinResult && (
              <div className="mt-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500">
                  <Trophy className="h-5 w-5 mr-2" />
                  You won {spinResult.gemsWon} gems!
                </Badge>
              </div>
            )}

            {/* Spin Button */}
            <Button
              onClick={handleSpin}
              disabled={!canSpin || spinning}
              className="mt-6 px-8 py-6 text-lg bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 disabled:opacity-50"
            >
              {spinning ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Spinning...
                </>
              ) : canSpin ? (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Spin the Wheel!
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-5 w-5" />
                  {nextSpinTime ? formatTimeUntilSpin(nextSpinTime) : "Come back tomorrow!"}
                </>
              )}
            </Button>

            {!canSpin && nextSpinTime && (
              <p className="text-sm text-muted-foreground mt-2">
                Next spin available in {formatTimeUntilSpin(nextSpinTime)}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Prizes Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gem className="h-5 w-5 text-cyan-400" />
                Prizes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {WHEEL_SEGMENTS.sort((a, b) => b.value - a.value).map((segment, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: segment.color }}
                      />
                      <span className="text-sm">{segment.label} gems</span>
                    </div>
                    {segment.value >= 200 && (
                      <Badge variant="secondary" className="text-xs">
                        Rare
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => setShowHistory(!showHistory)}>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Recent Spins
                </span>
                <Badge variant="outline">{history.length}</Badge>
              </CardTitle>
            </CardHeader>
            {(showHistory || history.length <= 5) && (
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No spins yet. Try your luck!
                  </p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 10).map((spin) => (
                      <div
                        key={spin.id}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {new Date(spin.created_at).toLocaleDateString()}
                        </span>
                        <span className="font-medium text-cyan-400">
                          +{spin.gems_won} gems
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
