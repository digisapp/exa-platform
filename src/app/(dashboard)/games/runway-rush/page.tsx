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
  Zap,
} from "lucide-react";

interface LeaderboardEntry {
  score: number;
  gemsCollected: number;
  modelName: string;
  profilePhoto?: string;
}

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_HEIGHT = 80;
const PLAYER_WIDTH = 50;
const PLAYER_HEIGHT = 80;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const BASE_SPEED = 6;
const MAX_SPEED = 15;
const SPEED_INCREMENT = 0.001;

interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "obstacle" | "gem" | "superGem";
}

export default function RunwayRushPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const [gemBalance, setGemBalance] = useState<number>(0);
  const [modelName, setModelName] = useState<string>("Model");
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover">("idle");
  const [score, setScore] = useState(0);
  const [gemsCollected, setGemsCollected] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Game state refs (for animation loop)
  const playerRef = useRef({
    x: 100,
    y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
    frame: 0,
  });
  const objectsRef = useRef<GameObject[]>([]);
  const gameSpeedRef = useRef(BASE_SPEED);
  const scoreRef = useRef(0);
  const gemsRef = useRef(0);
  const distanceRef = useRef(0);
  const frameCountRef = useRef(0);

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
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        if (gameState === "idle") {
          startGame();
        } else if (gameState === "playing") {
          jump();
        } else if (gameState === "gameover" && !saving) {
          resetGame();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState, saving]);

  // Handle touch input
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function handleTouch(e: TouchEvent) {
      e.preventDefault();
      if (gameState === "idle") {
        startGame();
      } else if (gameState === "playing") {
        jump();
      } else if (gameState === "gameover" && !saving) {
        resetGame();
      }
    }

    canvas.addEventListener("touchstart", handleTouch);
    return () => canvas.removeEventListener("touchstart", handleTouch);
  }, [gameState, saving]);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/games/runway-rush");
      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.gemBalance);
        setModelName(data.modelName);
        setPersonalBest(data.personalBest?.score || null);
        setPlayerRank(data.playerRank);
        setLeaderboard(data.leaderboard);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }

  function jump() {
    const player = playerRef.current;
    if (!player.isJumping) {
      player.velocityY = JUMP_FORCE;
      player.isJumping = true;
    }
  }

  function startGame() {
    // Reset game state
    playerRef.current = {
      x: 100,
      y: CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      frame: 0,
    };
    objectsRef.current = [];
    gameSpeedRef.current = BASE_SPEED;
    scoreRef.current = 0;
    gemsRef.current = 0;
    distanceRef.current = 0;
    frameCountRef.current = 0;

    setScore(0);
    setGemsCollected(0);
    setGameState("playing");
    setShowResults(false);
    setLastRunResult(null);

    // Start game loop
    gameLoop();
  }

  function resetGame() {
    setGameState("idle");
    setShowResults(false);
    drawIdleScreen();
  }

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const player = playerRef.current;
    const objects = objectsRef.current;

    // Update
    frameCountRef.current++;
    distanceRef.current++;

    // Increase speed over time
    if (gameSpeedRef.current < MAX_SPEED) {
      gameSpeedRef.current += SPEED_INCREMENT;
    }

    // Update score
    scoreRef.current = Math.floor(distanceRef.current / 10);
    setScore(scoreRef.current);

    // Update player
    player.velocityY += GRAVITY;
    player.y += player.velocityY;

    // Ground collision
    const groundY = CANVAS_HEIGHT - GROUND_HEIGHT - PLAYER_HEIGHT;
    if (player.y >= groundY) {
      player.y = groundY;
      player.velocityY = 0;
      player.isJumping = false;
    }

    // Running animation
    if (!player.isJumping) {
      player.frame = Math.floor(frameCountRef.current / 5) % 4;
    }

    // Spawn objects
    if (frameCountRef.current % Math.floor(80 / (gameSpeedRef.current / BASE_SPEED)) === 0) {
      spawnObject();
    }

    // Update objects
    for (let i = objects.length - 1; i >= 0; i--) {
      objects[i].x -= gameSpeedRef.current;

      // Remove off-screen objects
      if (objects[i].x + objects[i].width < 0) {
        objects.splice(i, 1);
        continue;
      }

      // Collision detection
      if (checkCollision(player, objects[i])) {
        if (objects[i].type === "gem") {
          gemsRef.current += 1;
          setGemsCollected(gemsRef.current);
          objects.splice(i, 1);
        } else if (objects[i].type === "superGem") {
          gemsRef.current += 5;
          setGemsCollected(gemsRef.current);
          objects.splice(i, 1);
        } else {
          // Hit obstacle - game over
          gameOver();
          return;
        }
      }
    }

    // Draw
    draw(ctx, canvas.width, canvas.height);

    // Continue loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState]);

  // Start game loop when game state changes to playing
  useEffect(() => {
    if (gameState === "playing") {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  function spawnObject() {
    const random = Math.random();
    const groundY = CANVAS_HEIGHT - GROUND_HEIGHT;

    if (random < 0.6) {
      // Spawn obstacle
      const obstacleTypes = [
        { width: 30, height: 50 }, // Small barrier
        { width: 50, height: 40 }, // Wide barrier
        { width: 25, height: 70 }, // Tall barrier
      ];
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];

      objectsRef.current.push({
        x: CANVAS_WIDTH + 50,
        y: groundY - type.height,
        width: type.width,
        height: type.height,
        type: "obstacle",
      });
    } else if (random < 0.9) {
      // Spawn gem
      const yPos = groundY - 60 - Math.random() * 100;
      objectsRef.current.push({
        x: CANVAS_WIDTH + 50,
        y: yPos,
        width: 30,
        height: 30,
        type: "gem",
      });
    } else {
      // Spawn super gem (rare)
      const yPos = groundY - 100 - Math.random() * 80;
      objectsRef.current.push({
        x: CANVAS_WIDTH + 50,
        y: yPos,
        width: 40,
        height: 40,
        type: "superGem",
      });
    }
  }

  function checkCollision(player: typeof playerRef.current, obj: GameObject): boolean {
    const padding = obj.type === "obstacle" ? 5 : -5; // More forgiving for gems
    return (
      player.x < obj.x + obj.width - padding &&
      player.x + PLAYER_WIDTH > obj.x + padding &&
      player.y < obj.y + obj.height - padding &&
      player.y + PLAYER_HEIGHT > obj.y + padding
    );
  }

  async function gameOver() {
    setGameState("gameover");

    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
    }

    // Save score
    setSaving(true);
    try {
      const response = await fetch("/api/games/runway-rush", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: scoreRef.current,
          gemsCollected: gemsRef.current,
          distance: distanceRef.current,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setLastRunResult(result);
        setGemBalance(result.newBalance);

        if (result.isNewHighScore) {
          setPersonalBest(scoreRef.current);
          toast.success(`New High Score! +${result.bonusGems} bonus gems!`);
        }
      }
    } catch (error) {
      console.error("Failed to save score:", error);
    } finally {
      setSaving(false);
      setShowResults(true);
    }
  }

  function draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const player = playerRef.current;
    const objects = objectsRef.current;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, width, height);

    // Draw runway (ground)
    ctx.fillStyle = "#2d2d44";
    ctx.fillRect(0, height - GROUND_HEIGHT, width, GROUND_HEIGHT);

    // Draw runway lines
    ctx.strokeStyle = "#ec4899";
    ctx.lineWidth = 3;
    const lineOffset = (frameCountRef.current * gameSpeedRef.current) % 100;
    for (let x = -lineOffset; x < width + 100; x += 100) {
      ctx.beginPath();
      ctx.moveTo(x, height - GROUND_HEIGHT / 2);
      ctx.lineTo(x + 50, height - GROUND_HEIGHT / 2);
      ctx.stroke();
    }

    // Draw runway edge glow
    const gradient = ctx.createLinearGradient(0, height - GROUND_HEIGHT, 0, height - GROUND_HEIGHT + 10);
    gradient.addColorStop(0, "rgba(236, 72, 153, 0.5)");
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, height - GROUND_HEIGHT, width, 10);

    // Draw objects
    for (const obj of objects) {
      if (obj.type === "obstacle") {
        // Draw obstacle (barrier/cone style)
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(obj.x, obj.y, obj.width, 8);
      } else if (obj.type === "gem") {
        // Draw gem
        drawGem(ctx, obj.x + obj.width / 2, obj.y + obj.height / 2, 12, "#06b6d4");
      } else if (obj.type === "superGem") {
        // Draw super gem (bigger, golden)
        drawGem(ctx, obj.x + obj.width / 2, obj.y + obj.height / 2, 18, "#fbbf24");
        // Sparkle effect
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(obj.x + 30, obj.y + 5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw player (model silhouette)
    drawPlayer(ctx, player.x, player.y, player.frame, player.isJumping);

    // Draw HUD
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(`Score: ${scoreRef.current}`, 20, 40);

    ctx.fillStyle = "#06b6d4";
    ctx.fillText(`💎 ${gemsRef.current}`, 20, 70);

    // Speed indicator
    ctx.fillStyle = "#a855f7";
    ctx.font = "16px sans-serif";
    const speedPercent = Math.floor(((gameSpeedRef.current - BASE_SPEED) / (MAX_SPEED - BASE_SPEED)) * 100);
    ctx.fillText(`Speed: ${speedPercent}%`, width - 120, 40);
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);

    // Diamond shape
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

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.3);
    ctx.lineTo(0, -size * 0.6);
    ctx.lineTo(size * 0.3, -size * 0.3);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, jumping: boolean) {
    ctx.save();
    ctx.translate(x, y);

    // Body
    ctx.fillStyle = "#ec4899";
    ctx.fillRect(15, 20, 20, 35);

    // Head
    ctx.beginPath();
    ctx.arc(25, 12, 12, 0, Math.PI * 2);
    ctx.fillStyle = "#fcd34d";
    ctx.fill();

    // Hair
    ctx.fillStyle = "#92400e";
    ctx.beginPath();
    ctx.arc(25, 8, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(15, 5, 20, 8);

    // Legs (animate if running)
    ctx.fillStyle = "#fcd34d";
    if (jumping) {
      // Tucked legs
      ctx.fillRect(15, 55, 8, 15);
      ctx.fillRect(27, 55, 8, 15);
    } else {
      // Running animation
      const legOffset = Math.sin(frame * Math.PI / 2) * 8;
      ctx.fillRect(15, 55, 8, 20 + legOffset);
      ctx.fillRect(27, 55, 8, 20 - legOffset);
    }

    // Arms
    ctx.fillStyle = "#fcd34d";
    if (jumping) {
      // Arms up
      ctx.fillRect(5, 15, 8, 20);
      ctx.fillRect(37, 15, 8, 20);
    } else {
      // Swinging arms
      const armOffset = Math.sin(frame * Math.PI / 2) * 5;
      ctx.fillRect(7, 22 + armOffset, 8, 18);
      ctx.fillRect(35, 22 - armOffset, 8, 18);
    }

    // Heels
    ctx.fillStyle = "#ec4899";
    if (!jumping) {
      ctx.fillRect(15, 73, 10, 5);
      ctx.fillRect(27, 73, 10, 5);
    }

    ctx.restore();
  }

  function drawIdleScreen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Runway
    ctx.fillStyle = "#2d2d44";
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);

    // Draw player standing
    drawPlayer(ctx, 100, canvas.height - GROUND_HEIGHT - PLAYER_HEIGHT, 0, false);

    // Title
    ctx.fillStyle = "#ec4899";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("RUNWAY RUSH", canvas.width / 2, 100);

    ctx.fillStyle = "#fff";
    ctx.font = "24px sans-serif";
    ctx.fillText("Press SPACE or TAP to start", canvas.width / 2, 180);

    ctx.fillStyle = "#a855f7";
    ctx.font = "18px sans-serif";
    ctx.fillText("Jump over obstacles • Collect gems", canvas.width / 2, 220);

    if (personalBest) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "20px sans-serif";
      ctx.fillText(`High Score: ${personalBest}`, canvas.width / 2, 280);
    }

    ctx.textAlign = "left";
  }

  // Draw idle screen on load
  useEffect(() => {
    if (!loading && gameState === "idle") {
      drawIdleScreen();
    }
  }, [loading, gameState, personalBest]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-8 py-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/games">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-pink-500" />
            Runway Rush
          </h1>
          <p className="text-muted-foreground">
            Run, jump, and collect gems on the runway!
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
          <Gem className="h-5 w-5 text-cyan-400" />
          <span className="font-bold text-cyan-400">{gemBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Game Area */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 relative">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="w-full h-auto cursor-pointer"
              style={{ imageRendering: "pixelated" }}
            />

            {/* Game Over Overlay */}
            {gameState === "gameover" && showResults && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center text-white p-8">
                  <h2 className="text-3xl font-bold mb-4">Game Over!</h2>

                  <div className="space-y-2 mb-6">
                    <p className="text-2xl">
                      Score: <span className="text-pink-400 font-bold">{score}</span>
                    </p>
                    <p className="text-xl text-cyan-400">
                      💎 {gemsCollected} gems collected
                    </p>

                    {lastRunResult?.isNewHighScore && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-lg px-4 py-1">
                        <Crown className="h-4 w-4 mr-2" />
                        New High Score! +{lastRunResult.bonusGems} bonus
                      </Badge>
                    )}

                    {lastRunResult && (
                      <p className="text-green-400 font-medium">
                        +{lastRunResult.totalGemsEarned} gems earned!
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={resetGame}
                    disabled={saving}
                    className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 px-8 py-6 text-lg"
                  >
                    {saving ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-5 w-5" />
                    )}
                    Play Again
                  </Button>
                </div>
              </div>
            )}

            {/* Start prompt for idle state */}
            {gameState === "idle" && (
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

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">High Score</span>
                <span className="font-bold text-xl text-pink-400">
                  {personalBest || 0}
                </span>
              </div>
              {playerRank && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Rank</span>
                  <Badge variant="secondary">#{playerRank}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Top Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scores yet. Be the first!
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

          {/* Controls */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">SPACE</Badge>
                <span className="text-muted-foreground">or</span>
                <Badge variant="outline">TAP</Badge>
                <span className="text-muted-foreground">to jump</span>
              </div>
              <p className="text-muted-foreground">
                Collect gems for rewards. Avoid obstacles!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
