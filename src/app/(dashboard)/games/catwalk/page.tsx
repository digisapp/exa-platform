"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Gem,
  ArrowLeft,
  Loader2,
  Trophy,
  Play,
  RotateCcw,
  Crown,
  Lock,
  Star,
  Sparkles,
} from "lucide-react";

interface Runway {
  id: string;
  name: string;
  description: string;
  background: string;
  accentColor: string;
  unlockCost: number;
  gemMultiplier: number;
  unlocked: boolean;
  bestScore: { total_score: number; walk_score: number; pose_score: number } | null;
}

interface LeaderboardEntry {
  score: number;
  runwayId: string;
  modelName: string;
  profilePhoto?: string;
}

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const LANE_COUNT = 3;
const LANE_WIDTH = 120;
const RUNWAY_LENGTH = 3000; // Total distance to walk
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 100;

interface GameObject {
  x: number;
  y: number;
  lane: number;
  type: "obstacle" | "gem" | "beat";
  hit?: boolean;
}

type GamePhase = "idle" | "walking" | "posing" | "results";

export default function CatwalkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  const [gemBalance, setGemBalance] = useState<number>(0);
  const [modelName, setModelName] = useState<string>("Model");
  const [runways, setRunways] = useState<Runway[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedRunway, setSelectedRunway] = useState<Runway | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [walkScore, setWalkScore] = useState(0);
  const [poseScore, setPoseScore] = useState(0);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [perfectWalks, setPerfectWalks] = useState(0);
  const [gameResult, setGameResult] = useState<any>(null);

  // Game state refs
  const playerRef = useRef({
    lane: 1, // 0, 1, 2 (center start)
    y: CANVAS_HEIGHT - 150,
    walkFrame: 0,
    targetLane: 1,
  });
  const objectsRef = useRef<GameObject[]>([]);
  const distanceRef = useRef(0);
  const walkScoreRef = useRef(100); // Start at 100, lose points for hits
  const gemsRef = useRef(0);
  const perfectRef = useRef(0);
  const frameCountRef = useRef(0);

  // Pose sequence state
  const poseSequenceRef = useRef<string[]>([]);
  const currentPoseRef = useRef(0);
  const poseTimerRef = useRef(0);
  const poseResultsRef = useRef<boolean[]>([]);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gamePhase === "idle" && selectedRunway) {
        if (e.code === "Space") {
          e.preventDefault();
          startGame();
        }
      } else if (gamePhase === "walking") {
        if (e.code === "ArrowLeft") {
          e.preventDefault();
          movePlayer(-1);
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          movePlayer(1);
        } else if (e.code === "ArrowUp") {
          e.preventDefault();
          hitBeat();
        }
      } else if (gamePhase === "posing") {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.code)) {
          e.preventDefault();
          handlePoseInput(e.code);
        }
      } else if (gamePhase === "results" && !saving) {
        if (e.code === "Space") {
          e.preventDefault();
          resetGame();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gamePhase, selectedRunway, saving]);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/games/catwalk");
      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.gemBalance);
        setModelName(data.modelName);
        setRunways(data.runways);
        setLeaderboard(data.leaderboard);

        // Select first unlocked runway
        const firstUnlocked = data.runways.find((r: Runway) => r.unlocked);
        if (firstUnlocked) {
          setSelectedRunway(firstUnlocked);
        }
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function unlockRunway(runway: Runway) {
    if (gemBalance < runway.unlockCost) {
      toast.error("Not enough gems!");
      return;
    }

    try {
      const response = await fetch("/api/games/catwalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unlock", runwayId: runway.id }),
      });

      if (response.ok) {
        const result = await response.json();
        setGemBalance(result.newBalance);
        toast.success(`Unlocked ${runway.name}!`);
        fetchStatus();
      }
    } catch (error) {
      toast.error("Failed to unlock runway");
    }
  }

  function movePlayer(direction: number) {
    const player = playerRef.current;
    const newLane = Math.max(0, Math.min(LANE_COUNT - 1, player.lane + direction));
    player.targetLane = newLane;
  }

  function hitBeat() {
    const objects = objectsRef.current;
    // Check for nearby beat markers
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.type === "beat" && !obj.hit) {
        const distance = Math.abs(obj.y - playerRef.current.y);
        if (distance < 40) {
          obj.hit = true;
          perfectRef.current++;
          setPerfectWalks(perfectRef.current);
          walkScoreRef.current = Math.min(100, walkScoreRef.current + 2);
          return;
        }
      }
    }
  }

  function handlePoseInput(key: string) {
    const expected = poseSequenceRef.current[currentPoseRef.current];
    const keyMap: Record<string, string> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };

    if (keyMap[key] === expected) {
      poseResultsRef.current.push(true);
    } else {
      poseResultsRef.current.push(false);
    }

    currentPoseRef.current++;

    if (currentPoseRef.current >= poseSequenceRef.current.length) {
      finishPosing();
    }
  }

  function startGame() {
    if (!selectedRunway) return;

    // Reset game state
    playerRef.current = {
      lane: 1,
      y: CANVAS_HEIGHT - 150,
      walkFrame: 0,
      targetLane: 1,
    };
    objectsRef.current = [];
    distanceRef.current = 0;
    walkScoreRef.current = 100;
    gemsRef.current = 0;
    perfectRef.current = 0;
    frameCountRef.current = 0;

    setWalkScore(100);
    setGemsCollected(0);
    setPerfectWalks(0);
    setPoseScore(0);
    setGameResult(null);
    setGamePhase("walking");

    // Generate obstacles and gems
    generateObjects();

    // Start game loop
    gameLoop();
  }

  function generateObjects() {
    const objects: GameObject[] = [];
    const spacing = 200;

    for (let y = -spacing; y > -RUNWAY_LENGTH; y -= spacing) {
      const random = Math.random();

      if (random < 0.4) {
        // Obstacle
        objects.push({
          x: 0,
          y,
          lane: Math.floor(Math.random() * LANE_COUNT),
          type: "obstacle",
        });
      } else if (random < 0.7) {
        // Gem
        objects.push({
          x: 0,
          y,
          lane: Math.floor(Math.random() * LANE_COUNT),
          type: "gem",
        });
      } else {
        // Beat marker (rhythm hit)
        objects.push({
          x: 0,
          y,
          lane: 1, // Always center
          type: "beat",
        });
      }
    }

    objectsRef.current = objects;
  }

  const gameLoop = useCallback(() => {
    if (gamePhase !== "walking") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    frameCountRef.current++;
    distanceRef.current += 5;

    const player = playerRef.current;

    // Smooth lane movement
    const targetX = getLaneX(player.targetLane);
    const currentX = getLaneX(player.lane);
    if (Math.abs(targetX - currentX) > 5) {
      player.lane += (player.targetLane - player.lane) * 0.2;
    } else {
      player.lane = player.targetLane;
    }

    // Walk animation
    player.walkFrame = Math.floor(frameCountRef.current / 8) % 8;

    // Move objects toward player
    const objects = objectsRef.current;
    for (let i = objects.length - 1; i >= 0; i--) {
      objects[i].y += 5;

      // Check collision
      if (objects[i].y > player.y - PLAYER_HEIGHT / 2 && objects[i].y < player.y + 30) {
        const objLane = objects[i].lane;
        const playerLane = Math.round(player.lane);

        if (Math.abs(objLane - playerLane) < 0.5) {
          if (objects[i].type === "obstacle") {
            // Hit obstacle
            walkScoreRef.current = Math.max(0, walkScoreRef.current - 15);
            setWalkScore(walkScoreRef.current);
            objects.splice(i, 1);
            continue;
          } else if (objects[i].type === "gem") {
            // Collect gem
            gemsRef.current++;
            setGemsCollected(gemsRef.current);
            objects.splice(i, 1);
            continue;
          }
        }
      }

      // Remove passed objects
      if (objects[i].y > CANVAS_HEIGHT + 50) {
        if (objects[i].type === "beat" && !objects[i].hit) {
          // Missed beat
          walkScoreRef.current = Math.max(0, walkScoreRef.current - 3);
          setWalkScore(walkScoreRef.current);
        }
        objects.splice(i, 1);
      }
    }

    // Check if runway complete
    if (distanceRef.current >= RUNWAY_LENGTH) {
      startPosing();
      return;
    }

    // Draw
    draw(ctx);

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gamePhase]);

  useEffect(() => {
    if (gamePhase === "walking") {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gamePhase, gameLoop]);

  function getLaneX(lane: number): number {
    const centerX = CANVAS_WIDTH / 2;
    const laneOffset = (lane - 1) * LANE_WIDTH;
    return centerX + laneOffset;
  }

  function startPosing() {
    setGamePhase("posing");

    // Generate pose sequence (5 poses)
    const directions = ["up", "down", "left", "right"];
    const sequence: string[] = [];
    for (let i = 0; i < 5; i++) {
      sequence.push(directions[Math.floor(Math.random() * directions.length)]);
    }
    poseSequenceRef.current = sequence;
    currentPoseRef.current = 0;
    poseResultsRef.current = [];
    poseTimerRef.current = 0;

    // Draw pose screen
    drawPoseScreen();

    // Auto-fail timer (10 seconds)
    setTimeout(() => {
      if (gamePhase === "posing" && currentPoseRef.current < poseSequenceRef.current.length) {
        finishPosing();
      }
    }, 10000);
  }

  function finishPosing() {
    // Calculate pose score
    const correctPoses = poseResultsRef.current.filter(Boolean).length;
    const poseScoreCalc = Math.floor((correctPoses / poseSequenceRef.current.length) * 100);
    setPoseScore(poseScoreCalc);

    // Save score
    saveScore(walkScoreRef.current, poseScoreCalc);
  }

  async function saveScore(walk: number, pose: number) {
    if (!selectedRunway) return;

    setSaving(true);
    setGamePhase("results");

    try {
      const response = await fetch("/api/games/catwalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          runwayId: selectedRunway.id,
          walkScore: walk,
          poseScore: pose,
          gemsCollected: gemsRef.current,
          perfectWalks: perfectRef.current,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setGameResult(result);
        setGemBalance(result.newBalance);

        if (result.isNewHighScore) {
          toast.success("New High Score!");
        }
      }
    } catch (error) {
      console.error("Failed to save score:", error);
    } finally {
      setSaving(false);
    }
  }

  function resetGame() {
    setGamePhase("idle");
    setGameResult(null);
    drawIdleScreen();
    fetchStatus();
  }

  function draw(ctx: CanvasRenderingContext2D) {
    if (!selectedRunway) return;

    const player = playerRef.current;
    const objects = objectsRef.current;

    // Background
    ctx.fillStyle = selectedRunway.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Runway
    const runwayLeft = CANVAS_WIDTH / 2 - LANE_WIDTH * 1.5 - 20;
    const runwayRight = CANVAS_WIDTH / 2 + LANE_WIDTH * 1.5 + 20;

    // Runway surface
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(runwayLeft, 0, runwayRight - runwayLeft, CANVAS_HEIGHT);

    // Lane dividers
    ctx.strokeStyle = selectedRunway.accentColor + "40";
    ctx.lineWidth = 2;
    for (let i = 0; i < LANE_COUNT - 1; i++) {
      const x = getLaneX(i) + LANE_WIDTH / 2;
      ctx.beginPath();
      ctx.setLineDash([20, 20]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Runway edge glow
    ctx.strokeStyle = selectedRunway.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(runwayLeft, 0);
    ctx.lineTo(runwayLeft, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(runwayRight, 0);
    ctx.lineTo(runwayRight, CANVAS_HEIGHT);
    ctx.stroke();

    // Draw objects
    for (const obj of objects) {
      const objX = getLaneX(obj.lane);

      if (obj.type === "obstacle") {
        // Paparazzi/obstacle
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(objX - 25, obj.y, 50, 40);
        ctx.fillStyle = "#fbbf24";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("📸", objX, obj.y + 30);
      } else if (obj.type === "gem") {
        // Gem
        drawGem(ctx, objX, obj.y + 15, 15, "#06b6d4");
      } else if (obj.type === "beat") {
        // Beat marker
        if (!obj.hit) {
          ctx.strokeStyle = selectedRunway.accentColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(objX, obj.y, 20, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = selectedRunway.accentColor + "40";
          ctx.fill();
        } else {
          // Hit effect
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 20px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✓", objX, obj.y + 7);
        }
      }
    }

    // Draw player
    const playerX = getLaneX(Math.round(player.lane));
    drawModel(ctx, playerX, player.y, player.walkFrame, selectedRunway.accentColor);

    // HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`Walk: ${walkScoreRef.current}`, 20, 30);
    ctx.fillStyle = "#06b6d4";
    ctx.fillText(`💎 ${gemsRef.current}`, 20, 60);
    ctx.fillStyle = selectedRunway.accentColor;
    ctx.fillText(`✨ ${perfectRef.current}`, 20, 90);

    // Progress bar
    const progress = distanceRef.current / RUNWAY_LENGTH;
    ctx.fillStyle = "#333";
    ctx.fillRect(CANVAS_WIDTH - 220, 20, 200, 20);
    ctx.fillStyle = selectedRunway.accentColor;
    ctx.fillRect(CANVAS_WIDTH - 220, 20, 200 * progress, 20);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(CANVAS_WIDTH - 220, 20, 200, 20);

    // Beat indicator (hit zone)
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(runwayLeft, player.y);
    ctx.lineTo(runwayRight, player.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.7, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawModel(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, accent: string) {
    ctx.save();
    ctx.translate(x, y);

    // Dress/outfit
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-20, 30);
    ctx.lineTo(20, 30);
    ctx.lineTo(25, 80);
    ctx.lineTo(-25, 80);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = "#fcd34d";
    ctx.fillRect(-8, 10, 16, 25);

    // Head
    ctx.beginPath();
    ctx.arc(0, -5, 15, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    ctx.fillStyle = "#78350f";
    ctx.beginPath();
    ctx.arc(0, -10, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-14, -12, 28, 10);

    // Legs (walking animation)
    ctx.fillStyle = "#fcd34d";
    const legOffset = Math.sin(frame * Math.PI / 4) * 8;
    ctx.fillRect(-12, 80, 8, 18 + legOffset);
    ctx.fillRect(4, 80, 8, 18 - legOffset);

    // Heels
    ctx.fillStyle = "#000";
    ctx.fillRect(-14, 96 + legOffset, 12, 6);
    ctx.fillRect(2, 96 - legOffset, 12, 6);

    ctx.restore();
  }

  function drawPoseScreen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !selectedRunway) return;

    ctx.fillStyle = selectedRunway.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Camera flash effect
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = "#fff";
    ctx.font = "bold 36px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STRIKE A POSE!", CANVAS_WIDTH / 2, 80);

    // Instructions
    ctx.font = "20px sans-serif";
    ctx.fillText("Press the arrows in order:", CANVAS_WIDTH / 2, 130);

    // Draw pose sequence
    const arrowEmojis: Record<string, string> = {
      up: "⬆️",
      down: "⬇️",
      left: "⬅️",
      right: "➡️",
    };

    const startX = CANVAS_WIDTH / 2 - (poseSequenceRef.current.length * 50) / 2;
    poseSequenceRef.current.forEach((dir, i) => {
      const x = startX + i * 50;
      const done = i < currentPoseRef.current;
      const current = i === currentPoseRef.current;

      ctx.font = "40px sans-serif";
      if (done) {
        ctx.fillStyle = poseResultsRef.current[i] ? "#22c55e" : "#ef4444";
      } else if (current) {
        ctx.fillStyle = selectedRunway.accentColor;
      } else {
        ctx.fillStyle = "#666";
      }
      ctx.fillText(arrowEmojis[dir], x, 220);

      if (current) {
        ctx.strokeStyle = selectedRunway.accentColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(x - 25, 175, 50, 60);
      }
    });

    // Draw model posing
    drawModel(ctx, CANVAS_WIDTH / 2, 380, 0, selectedRunway.accentColor);

    // Camera flashes
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * CANVAS_WIDTH;
      const y = 300 + Math.random() * 100;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Redraw pose screen on currentPose change
  useEffect(() => {
    if (gamePhase === "posing") {
      drawPoseScreen();
    }
  }, [gamePhase, currentPoseRef.current]);

  function drawIdleScreen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !selectedRunway) return;

    ctx.fillStyle = selectedRunway.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = selectedRunway.accentColor;
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CATWALK", CANVAS_WIDTH / 2, 100);

    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText(selectedRunway.name, CANVAS_WIDTH / 2, 150);

    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("← → to dodge  |  ↑ to hit beats  |  SPACE to start", CANVAS_WIDTH / 2, 220);

    // Draw model
    drawModel(ctx, CANVAS_WIDTH / 2, 380, 0, selectedRunway.accentColor);

    // Best score
    if (selectedRunway.bestScore) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "20px sans-serif";
      ctx.fillText(`Best: ${selectedRunway.bestScore.total_score}`, CANVAS_WIDTH / 2, 480);
    }
  }

  // Draw idle screen when runway selected
  useEffect(() => {
    if (!loading && gamePhase === "idle" && selectedRunway) {
      setTimeout(drawIdleScreen, 50);
    }
  }, [loading, gamePhase, selectedRunway]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/games">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-pink-500" />
            Catwalk
          </h1>
          <p className="text-muted-foreground">
            Walk the runway, dodge obstacles, and strike a pose!
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <Gem className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-cyan-400">{gemBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Game Area */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0 relative">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="w-full h-auto"
              />

              {/* Results Overlay */}
              {gamePhase === "results" && gameResult && (
                <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <h2 className="text-3xl font-bold mb-6">Show Complete!</h2>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400">Walk Score</p>
                        <p className="text-3xl font-bold text-pink-400">{gameResult.walkScore}</p>
                      </div>
                      <div className="bg-white/10 rounded-lg p-4">
                        <p className="text-sm text-gray-400">Pose Score</p>
                        <p className="text-3xl font-bold text-violet-400">{gameResult.poseScore}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <p className="text-lg text-gray-400">Total Score</p>
                      <p className="text-5xl font-bold text-cyan-400">{gameResult.totalScore}</p>
                    </div>

                    {gameResult.isNewHighScore && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-lg px-4 py-2 mb-4">
                        <Crown className="h-4 w-4 mr-2" />
                        New High Score!
                      </Badge>
                    )}

                    <p className="text-green-400 font-medium mb-6">
                      +{gameResult.gemsEarned} gems earned!
                    </p>

                    <Button
                      onClick={resetGame}
                      className="bg-gradient-to-r from-pink-500 to-violet-500 px-8 py-6 text-lg"
                    >
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Walk Again
                    </Button>
                  </div>
                </div>
              )}

              {/* Start overlay */}
              {gamePhase === "idle" && selectedRunway && (
                <div
                  className="absolute inset-0 flex items-center justify-center cursor-pointer"
                  onClick={startGame}
                >
                  <div className="bg-black/50 rounded-full p-6">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Runway Selection */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {runways.map((runway) => (
              <Button
                key={runway.id}
                variant={selectedRunway?.id === runway.id ? "default" : "outline"}
                className={`h-auto py-3 flex flex-col items-center gap-1 ${
                  !runway.unlocked ? "opacity-60" : ""
                } ${selectedRunway?.id === runway.id ? "ring-2 ring-pink-500" : ""}`}
                style={{
                  backgroundColor: runway.unlocked && selectedRunway?.id === runway.id ? runway.accentColor : undefined,
                }}
                onClick={() => {
                  if (runway.unlocked) {
                    setSelectedRunway(runway);
                    setGamePhase("idle");
                  } else {
                    unlockRunway(runway);
                  }
                }}
                disabled={gamePhase !== "idle"}
              >
                {!runway.unlocked && <Lock className="h-4 w-4" />}
                <span className="text-xs font-medium truncate w-full">{runway.name.split(" ")[0]}</span>
                {!runway.unlocked && (
                  <span className="text-xs text-muted-foreground">{runway.unlockCost}💎</span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">←</Badge>
                <Badge variant="outline">→</Badge>
                <span className="text-muted-foreground">Dodge obstacles</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">↑</Badge>
                <span className="text-muted-foreground">Hit beat markers</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">SPACE</Badge>
                <span className="text-muted-foreground">Start/Restart</span>
              </div>
            </CardContent>
          </Card>

          {/* Selected Runway */}
          {selectedRunway && (
            <Card style={{ borderColor: selectedRunway.accentColor + "50" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg" style={{ color: selectedRunway.accentColor }}>
                  {selectedRunway.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">{selectedRunway.description}</p>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span>Gem Multiplier: {selectedRunway.gemMultiplier}x</span>
                </div>
                {selectedRunway.bestScore && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Best: {selectedRunway.bestScore.total_score}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Top Models
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scores yet!
                </p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(0, 5).map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0"
                    >
                      <span className="w-6 text-center font-bold">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={entry.profilePhoto} />
                        <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs">
                          {entry.modelName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.modelName}</p>
                      </div>
                      <span className="font-bold text-pink-400">{entry.score}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
