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
const LANE_WIDTH = 100;
const RUNWAY_LENGTH = 3000;
const PLAYER_WIDTH = 60;
const PLAYER_HEIGHT = 120;

// Particle system
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: "sparkle" | "flash" | "star";
}

// Camera flash
interface CameraFlash {
  x: number;
  y: number;
  life: number;
  intensity: number;
}

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

  // Visual effects
  const particlesRef = useRef<Particle[]>([]);
  const flashesRef = useRef<CameraFlash[]>([]);
  const comboRef = useRef(0);
  const screenShakeRef = useRef(0);
  const lastBeatTimeRef = useRef(0);

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
    const player = playerRef.current;
    // Check for nearby beat markers
    for (let i = 0; i < objects.length; i++) {
      const obj = objects[i];
      if (obj.type === "beat" && !obj.hit) {
        const distance = Math.abs(obj.y - player.y);
        if (distance < 40) {
          obj.hit = true;
          perfectRef.current++;
          comboRef.current++;
          setPerfectWalks(perfectRef.current);
          walkScoreRef.current = Math.min(100, walkScoreRef.current + 2);
          lastBeatTimeRef.current = Date.now();

          // Spawn sparkle particles
          const beatX = getLaneX(1);
          for (let p = 0; p < 12; p++) {
            particlesRef.current.push({
              x: beatX,
              y: player.y,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8 - 3,
              life: 1,
              maxLife: 1,
              color: selectedRunway?.accentColor || "#ec4899",
              size: Math.random() * 6 + 3,
              type: "star",
            });
          }
          return;
        }
      }
    }
    // Missed - reset combo
    comboRef.current = 0;
  }

  function spawnGemParticles(x: number, y: number) {
    for (let p = 0; p < 8; p++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 4 - 2,
        life: 1,
        maxLife: 1,
        color: "#06b6d4",
        size: Math.random() * 4 + 2,
        type: "sparkle",
      });
    }
  }

  function spawnCameraFlash(x: number, y: number) {
    flashesRef.current.push({
      x,
      y,
      life: 1,
      intensity: 0.8 + Math.random() * 0.2,
    });
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
      y: CANVAS_HEIGHT - 130,
      walkFrame: 0,
      targetLane: 1,
    };
    objectsRef.current = [];
    distanceRef.current = 0;
    walkScoreRef.current = 100;
    gemsRef.current = 0;
    perfectRef.current = 0;
    frameCountRef.current = 0;

    // Reset visual effects
    particlesRef.current = [];
    flashesRef.current = [];
    comboRef.current = 0;
    screenShakeRef.current = 0;

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
    player.walkFrame = (frameCountRef.current / 6) % (Math.PI * 2);

    // Update screen shake
    if (screenShakeRef.current > 0) {
      screenShakeRef.current *= 0.9;
    }

    // Update particles
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      p.life -= 0.02;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update camera flashes
    const flashes = flashesRef.current;
    for (let i = flashes.length - 1; i >= 0; i--) {
      flashes[i].life -= 0.08;
      if (flashes[i].life <= 0) {
        flashes.splice(i, 1);
      }
    }

    // Random camera flashes from crowd
    if (Math.random() < 0.03) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const crowdX = CANVAS_WIDTH / 2 + side * (LANE_WIDTH * 2 + 50 + Math.random() * 80);
      const crowdY = 100 + Math.random() * 300;
      spawnCameraFlash(crowdX, crowdY);
    }

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
            // Hit obstacle - screen shake
            walkScoreRef.current = Math.max(0, walkScoreRef.current - 15);
            setWalkScore(walkScoreRef.current);
            screenShakeRef.current = 10;
            comboRef.current = 0;
            objects.splice(i, 1);
            continue;
          } else if (objects[i].type === "gem") {
            // Collect gem with particles
            const gemX = getLaneX(objLane);
            spawnGemParticles(gemX, objects[i].y);
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
          comboRef.current = 0;
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
    const shake = screenShakeRef.current;

    // Apply screen shake
    ctx.save();
    if (shake > 0.5) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
    }

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, selectedRunway.background);
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Perspective runway
    const vanishY = -50;
    const topWidth = 80;
    const bottomWidth = LANE_WIDTH * 3 + 60;
    const centerX = CANVAS_WIDTH / 2;

    // Runway surface with gradient
    const runwayGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    runwayGrad.addColorStop(0, "#1a1a1a");
    runwayGrad.addColorStop(0.5, "#252525");
    runwayGrad.addColorStop(1, "#1f1f1f");

    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2, vanishY);
    ctx.lineTo(centerX + topWidth / 2, vanishY);
    ctx.lineTo(centerX + bottomWidth / 2, CANVAS_HEIGHT);
    ctx.lineTo(centerX - bottomWidth / 2, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = runwayGrad;
    ctx.fill();

    // Runway edge lights
    const edgeLightCount = 12;
    for (let i = 0; i < edgeLightCount; i++) {
      const t = i / edgeLightCount;
      const y = vanishY + t * (CANVAS_HEIGHT - vanishY + 100);
      const widthAtY = topWidth + (bottomWidth - topWidth) * t;
      const leftX = centerX - widthAtY / 2;
      const rightX = centerX + widthAtY / 2;
      const lightSize = 3 + t * 5;
      const pulse = Math.sin(frameCountRef.current * 0.1 + i * 0.5) * 0.3 + 0.7;

      // Left light
      ctx.beginPath();
      ctx.arc(leftX, y, lightSize, 0, Math.PI * 2);
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Light glow
      const glowGrad = ctx.createRadialGradient(leftX, y, 0, leftX, y, lightSize * 3);
      glowGrad.addColorStop(0, selectedRunway.accentColor + "60");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(leftX - lightSize * 3, y - lightSize * 3, lightSize * 6, lightSize * 6);

      // Right light
      ctx.beginPath();
      ctx.arc(rightX, y, lightSize, 0, Math.PI * 2);
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;

      const glowGrad2 = ctx.createRadialGradient(rightX, y, 0, rightX, y, lightSize * 3);
      glowGrad2.addColorStop(0, selectedRunway.accentColor + "60");
      glowGrad2.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(rightX - lightSize * 3, y - lightSize * 3, lightSize * 6, lightSize * 6);
    }

    // Crowd silhouettes on sides
    drawCrowd(ctx, true);
    drawCrowd(ctx, false);

    // Draw camera flashes
    for (const flash of flashesRef.current) {
      const flashGrad = ctx.createRadialGradient(
        flash.x, flash.y, 0,
        flash.x, flash.y, 40 * flash.intensity
      );
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flash.life * flash.intensity})`);
      flashGrad.addColorStop(0.3, `rgba(255, 255, 200, ${flash.life * 0.5})`);
      flashGrad.addColorStop(1, "transparent");
      ctx.fillStyle = flashGrad;
      ctx.fillRect(flash.x - 50, flash.y - 50, 100, 100);
    }

    // Lane guides (subtle)
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = selectedRunway.accentColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([10, 10]);
    for (let i = 0; i < LANE_COUNT; i++) {
      const laneX = getLaneX(i);
      ctx.beginPath();
      ctx.moveTo(laneX, 100);
      ctx.lineTo(laneX, CANVAS_HEIGHT);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Draw objects
    for (const obj of objects) {
      const objX = getLaneX(obj.lane);

      if (obj.type === "obstacle") {
        // Paparazzi photographer
        drawPaparazzi(ctx, objX, obj.y);
      } else if (obj.type === "gem") {
        // Spinning gem
        drawGem(ctx, objX, obj.y + 15, 18, "#06b6d4");
      } else if (obj.type === "beat") {
        // Beat marker with glow
        if (!obj.hit) {
          const beatPulse = Math.sin(frameCountRef.current * 0.15) * 0.3 + 0.7;

          // Outer glow
          const beatGrad = ctx.createRadialGradient(objX, obj.y, 0, objX, obj.y, 35);
          beatGrad.addColorStop(0, selectedRunway.accentColor + "80");
          beatGrad.addColorStop(1, "transparent");
          ctx.fillStyle = beatGrad;
          ctx.fillRect(objX - 40, obj.y - 40, 80, 80);

          // Beat circle
          ctx.strokeStyle = selectedRunway.accentColor;
          ctx.lineWidth = 3;
          ctx.globalAlpha = beatPulse;
          ctx.beginPath();
          ctx.arc(objX, obj.y, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Arrow up icon
          ctx.fillStyle = selectedRunway.accentColor;
          ctx.beginPath();
          ctx.moveTo(objX, obj.y - 10);
          ctx.lineTo(objX + 8, obj.y + 2);
          ctx.lineTo(objX - 8, obj.y + 2);
          ctx.closePath();
          ctx.fill();
        } else {
          // Hit sparkle
          ctx.fillStyle = "#22c55e";
          ctx.font = "bold 28px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("✓", objX, obj.y + 10);
        }
      }
    }

    // Beat hit zone indicator
    const hitZoneY = player.y;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(centerX - bottomWidth / 2 + 30, hitZoneY);
    ctx.lineTo(centerX + bottomWidth / 2 - 30, hitZoneY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw player
    const playerX = getLaneX(player.lane);
    drawModel(ctx, playerX, player.y, player.walkFrame, selectedRunway.accentColor);

    // Draw particles
    for (const p of particlesRef.current) {
      ctx.globalAlpha = p.life;
      if (p.type === "star") {
        drawStar(ctx, p.x, p.y, p.size, p.color);
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // HUD with glow
    drawHUD(ctx);

    ctx.restore();
  }

  function drawCrowd(ctx: CanvasRenderingContext2D, isLeft: boolean) {
    const centerX = CANVAS_WIDTH / 2;
    const baseX = isLeft ? centerX - LANE_WIDTH * 2 - 60 : centerX + LANE_WIDTH * 2 + 60;
    const crowdWidth = 150;

    // Crowd gradient (dark silhouettes)
    const crowdGrad = ctx.createLinearGradient(
      isLeft ? baseX - crowdWidth : baseX,
      0,
      isLeft ? baseX : baseX + crowdWidth,
      0
    );
    if (isLeft) {
      crowdGrad.addColorStop(0, "transparent");
      crowdGrad.addColorStop(1, "rgba(0, 0, 0, 0.8)");
    } else {
      crowdGrad.addColorStop(0, "rgba(0, 0, 0, 0.8)");
      crowdGrad.addColorStop(1, "transparent");
    }

    // Draw crowd silhouettes
    for (let i = 0; i < 15; i++) {
      const x = baseX + (isLeft ? -1 : 1) * (Math.random() * crowdWidth * 0.8);
      const y = 80 + i * 28;
      const scale = 0.6 + Math.random() * 0.4;

      ctx.fillStyle = `rgba(0, 0, 0, ${0.6 + Math.random() * 0.3})`;

      // Head
      ctx.beginPath();
      ctx.arc(x, y - 15 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillRect(x - 6 * scale, y - 7 * scale, 12 * scale, 20 * scale);
    }
  }

  function drawPaparazzi(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Photographer body
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x - 18, y - 5, 36, 50);

    // Head
    ctx.beginPath();
    ctx.arc(x, y - 15, 12, 0, Math.PI * 2);
    ctx.fill();

    // Camera
    ctx.fillStyle = "#333";
    ctx.fillRect(x - 12, y + 5, 24, 18);
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.arc(x, y + 14, 8, 0, Math.PI * 2);
    ctx.fill();

    // Camera flash indicator
    const flashPulse = Math.sin(frameCountRef.current * 0.2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(255, 200, 0, ${flashPulse})`;
    ctx.beginPath();
    ctx.arc(x, y + 14, 4, 0, Math.PI * 2);
    ctx.fill();

    // Warning glow
    const warnGrad = ctx.createRadialGradient(x, y + 20, 0, x, y + 20, 40);
    warnGrad.addColorStop(0, "rgba(239, 68, 68, 0.3)");
    warnGrad.addColorStop(1, "transparent");
    ctx.fillStyle = warnGrad;
    ctx.fillRect(x - 45, y - 25, 90, 90);
  }

  function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(frameCountRef.current * 0.1);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const outerX = Math.cos(angle) * size;
      const outerY = Math.sin(angle) * size;
      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      const innerAngle = angle + Math.PI / 5;
      const innerX = Math.cos(innerAngle) * size * 0.4;
      const innerY = Math.sin(innerAngle) * size * 0.4;
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawHUD(ctx: CanvasRenderingContext2D) {
    if (!selectedRunway) return;

    // Score panel background
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(15, 10, 150, 100, 10);
    ctx.fill();

    // Walk score with icon
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WALK", 25, 35);
    ctx.font = "bold 24px sans-serif";
    ctx.fillStyle = walkScoreRef.current > 70 ? "#22c55e" : walkScoreRef.current > 40 ? "#fbbf24" : "#ef4444";
    ctx.fillText(`${walkScoreRef.current}`, 80, 37);

    // Gems
    ctx.fillStyle = "#06b6d4";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`💎 ${gemsRef.current}`, 25, 65);

    // Perfect hits
    ctx.fillStyle = selectedRunway.accentColor;
    ctx.fillText(`✨ ${perfectRef.current}`, 25, 92);

    // Combo display
    if (comboRef.current >= 2) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 18px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${comboRef.current}x COMBO!`, CANVAS_WIDTH / 2, 45);
    }

    // Progress bar
    const progress = distanceRef.current / RUNWAY_LENGTH;
    const barWidth = 180;
    const barX = CANVAS_WIDTH - barWidth - 25;

    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.roundRect(barX - 10, 15, barWidth + 20, 35, 8);
    ctx.fill();

    // Progress track
    ctx.fillStyle = "#333";
    ctx.roundRect(barX, 25, barWidth, 15, 5);
    ctx.fill();

    // Progress fill with gradient
    const progressGrad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    progressGrad.addColorStop(0, selectedRunway.accentColor);
    progressGrad.addColorStop(1, "#ec4899");
    ctx.fillStyle = progressGrad;
    ctx.roundRect(barX, 25, barWidth * progress, 15, 5);
    ctx.fill();

    // Progress text
    ctx.fillStyle = "#fff";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.floor(progress * 100)}%`, barX + barWidth / 2, 36);

    // Model icon at progress position
    ctx.fillStyle = "#fff";
    ctx.font = "14px sans-serif";
    ctx.fillText("👠", barX + barWidth * progress, 17);
  }

  function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.translate(x, y);

    // Rotation animation
    const rotation = frameCountRef.current * 0.05;
    ctx.rotate(rotation);

    // Glow effect
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
    glowGrad.addColorStop(0, color + "60");
    glowGrad.addColorStop(1, "transparent");
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-size * 2, -size * 2, size * 4, size * 4);

    // Diamond shape
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.8, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.8, 0);
    ctx.closePath();

    // Gradient fill
    const gemGrad = ctx.createLinearGradient(-size, -size, size, size);
    gemGrad.addColorStop(0, "#67e8f9");
    gemGrad.addColorStop(0.5, color);
    gemGrad.addColorStop(1, "#0891b2");
    ctx.fillStyle = gemGrad;
    ctx.fill();

    // Shine
    ctx.beginPath();
    ctx.moveTo(-size * 0.3, -size * 0.6);
    ctx.lineTo(size * 0.1, -size * 0.2);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(-size * 0.4, -size * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.fill();

    ctx.restore();
  }

  function drawModel(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, accent: string) {
    ctx.save();
    ctx.translate(x, y);

    // Walking animation values
    const walkCycle = frame;
    const hipSway = Math.sin(walkCycle) * 3;
    const shoulderSway = Math.sin(walkCycle + Math.PI) * 2;
    const legSwing = Math.sin(walkCycle) * 12;
    const armSwing = Math.sin(walkCycle) * 8;
    const bobHeight = Math.abs(Math.sin(walkCycle * 2)) * 3;

    // Slight rotation for sass
    ctx.rotate(hipSway * 0.015);
    ctx.translate(0, -bobHeight);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 95 + bobHeight, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back leg
    const backLegX = -6 - legSwing * 0.3;
    ctx.save();
    ctx.translate(backLegX, 55);
    ctx.rotate(legSwing * 0.03);
    // Thigh
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 30);
    ctx.lineTo(4, 30);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    // Heel
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(-5, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(8, 35);
    ctx.lineTo(2, 35);
    ctx.lineTo(0, 42);
    ctx.lineTo(-2, 35);
    ctx.lineTo(-5, 35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dress/outfit - elegant flowing dress
    const dressGrad = ctx.createLinearGradient(-25, 20, 25, 85);
    dressGrad.addColorStop(0, accent);
    dressGrad.addColorStop(0.5, accent);
    dressGrad.addColorStop(1, shadeColor(accent, -30));

    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-12 + hipSway, 20);
    ctx.quadraticCurveTo(-18 + hipSway * 0.5, 35, -22 + hipSway * 0.3, 55);
    ctx.quadraticCurveTo(-25, 70, -20 + legSwing * 0.2, 85);
    ctx.lineTo(20 - legSwing * 0.2, 85);
    ctx.quadraticCurveTo(25, 70, 22 - hipSway * 0.3, 55);
    ctx.quadraticCurveTo(18 - hipSway * 0.5, 35, 12 - hipSway, 20);
    ctx.closePath();
    ctx.fill();

    // Dress highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.beginPath();
    ctx.moveTo(-5, 25);
    ctx.quadraticCurveTo(-10, 45, -8, 65);
    ctx.lineTo(0, 65);
    ctx.quadraticCurveTo(2, 45, 0, 25);
    ctx.closePath();
    ctx.fill();

    // Front leg
    const frontLegX = 6 + legSwing * 0.3;
    ctx.save();
    ctx.translate(frontLegX, 55);
    ctx.rotate(-legSwing * 0.03);
    // Thigh
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 30);
    ctx.lineTo(4, 30);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    // Heel
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(-5, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(8, 35);
    ctx.lineTo(2, 35);
    ctx.lineTo(0, 42);
    ctx.lineTo(-2, 35);
    ctx.lineTo(-5, 35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Torso/body
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-10 + shoulderSway, 0);
    ctx.quadraticCurveTo(-12, 10, -10, 22);
    ctx.lineTo(10, 22);
    ctx.quadraticCurveTo(12, 10, 10 + shoulderSway, 0);
    ctx.closePath();
    ctx.fill();

    // Neckline detail
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.quadraticCurveTo(0, 25, 8, 18);
    ctx.lineTo(10, 22);
    ctx.quadraticCurveTo(0, 30, -10, 22);
    ctx.closePath();
    ctx.fill();

    // Back arm
    ctx.save();
    ctx.translate(-10 + shoulderSway, 5);
    ctx.rotate(armSwing * 0.04 + 0.1);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-4, 12, -3, 25);
    ctx.lineTo(2, 25);
    ctx.quadraticCurveTo(3, 12, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Front arm
    ctx.save();
    ctx.translate(10 + shoulderSway, 5);
    ctx.rotate(-armSwing * 0.04 - 0.1);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-4, 12, -3, 25);
    ctx.lineTo(2, 25);
    ctx.quadraticCurveTo(3, 12, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Neck
    ctx.fillStyle = "#f5d0c5";
    ctx.fillRect(-4, -8, 8, 10);

    // Head
    ctx.beginPath();
    ctx.ellipse(0, -18, 12, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f5d0c5";
    ctx.fill();

    // Hair - long flowing hair
    ctx.fillStyle = "#2d1810";
    // Top of head
    ctx.beginPath();
    ctx.ellipse(0, -22, 13, 10, 0, Math.PI, 0);
    ctx.fill();

    // Side hair left
    ctx.beginPath();
    ctx.moveTo(-13, -18);
    ctx.quadraticCurveTo(-16, 0, -14 + hipSway * 0.5, 25);
    ctx.quadraticCurveTo(-12, 30, -8, 25);
    ctx.quadraticCurveTo(-10, 5, -11, -15);
    ctx.closePath();
    ctx.fill();

    // Side hair right
    ctx.beginPath();
    ctx.moveTo(13, -18);
    ctx.quadraticCurveTo(16, 0, 14 - hipSway * 0.5, 25);
    ctx.quadraticCurveTo(12, 30, 8, 25);
    ctx.quadraticCurveTo(10, 5, 11, -15);
    ctx.closePath();
    ctx.fill();

    // Hair shine
    ctx.fillStyle = "#4a2c20";
    ctx.beginPath();
    ctx.ellipse(-4, -26, 5, 3, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Face features
    // Eyes
    ctx.fillStyle = "#2d1810";
    ctx.beginPath();
    ctx.ellipse(-4, -18, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -18, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    ctx.strokeStyle = "#2d1810";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -21);
    ctx.quadraticCurveTo(-4, -22, -2, -21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(6, -21);
    ctx.quadraticCurveTo(4, -22, 2, -21);
    ctx.stroke();

    // Nose
    ctx.fillStyle = "#e8c4b8";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(1, -12);
    ctx.lineTo(-1, -12);
    ctx.closePath();
    ctx.fill();

    // Lips
    ctx.fillStyle = "#d4736a";
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.quadraticCurveTo(0, -6, 3, -8);
    ctx.quadraticCurveTo(0, -5, -3, -8);
    ctx.fill();

    // Earrings
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(-11, -14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -14, 2, 0, Math.PI * 2);
    ctx.fill();

    // Clutch bag
    ctx.fillStyle = shadeColor(accent, -40);
    ctx.save();
    ctx.translate(14 + shoulderSway, 28);
    ctx.rotate(-armSwing * 0.02);
    ctx.fillRect(-6, -3, 12, 8);
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(-2, 1, 4, 2);
    ctx.restore();

    ctx.restore();
  }

  // Helper function to darken/lighten colors
  function shadeColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
    return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
  }

  function drawPoseScreen() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !selectedRunway) return;

    // Background gradient
    const bgGrad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    bgGrad.addColorStop(0, selectedRunway.background);
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Spotlight effect
    const spotlightGrad = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, 350, 0,
      CANVAS_WIDTH / 2, 350, 200
    );
    spotlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.15)");
    spotlightGrad.addColorStop(1, "transparent");
    ctx.fillStyle = spotlightGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Random camera flashes
    const flashCount = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < flashCount; i++) {
      const flashX = Math.random() * CANVAS_WIDTH;
      const flashY = 250 + Math.random() * 150;
      const flashGrad = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, 30);
      flashGrad.addColorStop(0, "rgba(255, 255, 255, 0.8)");
      flashGrad.addColorStop(0.3, "rgba(255, 255, 200, 0.3)");
      flashGrad.addColorStop(1, "transparent");
      ctx.fillStyle = flashGrad;
      ctx.fillRect(flashX - 40, flashY - 40, 80, 80);
    }

    // Title with glow
    ctx.shadowColor = selectedRunway.accentColor;
    ctx.shadowBlur = 20;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 42px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STRIKE A POSE!", CANVAS_WIDTH / 2, 70);
    ctx.shadowBlur = 0;

    // Instructions
    ctx.font = "18px sans-serif";
    ctx.fillStyle = "#aaa";
    ctx.fillText("Hit the arrows in order!", CANVAS_WIDTH / 2, 105);

    // Draw pose sequence with better visuals
    const arrowSymbols: Record<string, { symbol: string; rotation: number }> = {
      up: { symbol: "▲", rotation: 0 },
      down: { symbol: "▼", rotation: 0 },
      left: { symbol: "◀", rotation: 0 },
      right: { symbol: "▶", rotation: 0 },
    };

    const startX = CANVAS_WIDTH / 2 - (poseSequenceRef.current.length * 60) / 2 + 30;
    poseSequenceRef.current.forEach((dir, i) => {
      const x = startX + i * 60;
      const y = 170;
      const done = i < currentPoseRef.current;
      const current = i === currentPoseRef.current;

      // Background circle
      ctx.beginPath();
      ctx.arc(x, y, 28, 0, Math.PI * 2);
      if (done) {
        ctx.fillStyle = poseResultsRef.current[i] ? "#22c55e" : "#ef4444";
      } else if (current) {
        ctx.fillStyle = selectedRunway.accentColor;
        // Pulse effect
        ctx.shadowColor = selectedRunway.accentColor;
        ctx.shadowBlur = 15;
      } else {
        ctx.fillStyle = "#333";
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Arrow symbol
      ctx.fillStyle = done || current ? "#fff" : "#666";
      ctx.font = "bold 24px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(arrowSymbols[dir].symbol, x, y);
    });

    // Draw model in pose
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2, 370);
    // Static pose (not walking)
    const poseProgress = currentPoseRef.current / poseSequenceRef.current.length;
    drawModelPose(ctx, 0, 0, poseProgress, selectedRunway.accentColor);
    ctx.restore();

    // Crowd silhouettes at bottom
    for (let i = 0; i < 20; i++) {
      const crowdX = (i / 20) * CANVAS_WIDTH;
      const crowdY = CANVAS_HEIGHT - 30 - Math.random() * 20;
      ctx.fillStyle = `rgba(0, 0, 0, ${0.5 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(crowdX, crowdY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(crowdX - 5, crowdY, 10, 15);
    }
  }

  function drawModelPose(ctx: CanvasRenderingContext2D, x: number, y: number, posePhase: number, accent: string) {
    ctx.save();
    ctx.translate(x, y);

    // Dynamic pose based on phase
    const poseAngle = Math.sin(posePhase * Math.PI * 2) * 0.1;
    ctx.rotate(poseAngle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 95, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs in pose stance
    // Back leg
    ctx.save();
    ctx.translate(-8, 55);
    ctx.rotate(-0.15);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 32);
    ctx.lineTo(4, 32);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    // Heel
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(-5, 32);
    ctx.lineTo(8, 32);
    ctx.lineTo(8, 37);
    ctx.lineTo(2, 37);
    ctx.lineTo(0, 44);
    ctx.lineTo(-2, 37);
    ctx.lineTo(-5, 37);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Dress
    const dressGrad = ctx.createLinearGradient(-25, 20, 25, 85);
    dressGrad.addColorStop(0, accent);
    dressGrad.addColorStop(1, shadeColor(accent, -30));
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 20);
    ctx.quadraticCurveTo(-20, 40, -25, 85);
    ctx.lineTo(22, 85);
    ctx.quadraticCurveTo(18, 40, 12, 20);
    ctx.closePath();
    ctx.fill();

    // Front leg
    ctx.save();
    ctx.translate(6, 55);
    ctx.rotate(0.1);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 30);
    ctx.lineTo(4, 30);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.moveTo(-5, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(8, 35);
    ctx.lineTo(2, 35);
    ctx.lineTo(0, 42);
    ctx.lineTo(-2, 35);
    ctx.lineTo(-5, 35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Torso
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-12, 10, -10, 22);
    ctx.lineTo(10, 22);
    ctx.quadraticCurveTo(12, 10, 10, 0);
    ctx.closePath();
    ctx.fill();

    // Neckline
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-8, 18);
    ctx.quadraticCurveTo(0, 25, 8, 18);
    ctx.lineTo(10, 22);
    ctx.quadraticCurveTo(0, 30, -10, 22);
    ctx.closePath();
    ctx.fill();

    // Arms in pose
    // Left arm on hip
    ctx.save();
    ctx.translate(-10, 8);
    ctx.rotate(0.8);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-5, 8, -3, 18);
    ctx.lineTo(2, 18);
    ctx.quadraticCurveTo(4, 8, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Right arm extended
    ctx.save();
    ctx.translate(10, 5);
    ctx.rotate(-0.3 + Math.sin(posePhase * Math.PI) * 0.2);
    ctx.fillStyle = "#f5d0c5";
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-4, 12, -3, 28);
    ctx.lineTo(2, 28);
    ctx.quadraticCurveTo(3, 12, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Neck
    ctx.fillStyle = "#f5d0c5";
    ctx.fillRect(-4, -8, 8, 10);

    // Head tilted
    ctx.save();
    ctx.rotate(0.1);
    ctx.beginPath();
    ctx.ellipse(0, -18, 12, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#f5d0c5";
    ctx.fill();

    // Hair
    ctx.fillStyle = "#2d1810";
    ctx.beginPath();
    ctx.ellipse(0, -22, 13, 10, 0, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-13, -18);
    ctx.quadraticCurveTo(-16, 0, -14, 25);
    ctx.quadraticCurveTo(-12, 30, -8, 25);
    ctx.quadraticCurveTo(-10, 5, -11, -15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(13, -18);
    ctx.quadraticCurveTo(16, 0, 14, 25);
    ctx.quadraticCurveTo(12, 30, 8, 25);
    ctx.quadraticCurveTo(10, 5, 11, -15);
    ctx.closePath();
    ctx.fill();

    // Face
    ctx.fillStyle = "#2d1810";
    ctx.beginPath();
    ctx.ellipse(-4, -18, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -18, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d4736a";
    ctx.beginPath();
    ctx.moveTo(-3, -8);
    ctx.quadraticCurveTo(0, -6, 3, -8);
    ctx.quadraticCurveTo(0, -5, -3, -8);
    ctx.fill();

    // Earrings
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.arc(-11, -14, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -14, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
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

    // Animated background
    const time = Date.now() * 0.001;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, selectedRunway.background);
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Animated spotlight sweep
    const spotX = CANVAS_WIDTH / 2 + Math.sin(time * 0.5) * 100;
    const spotlightGrad = ctx.createRadialGradient(spotX, 350, 0, spotX, 350, 250);
    spotlightGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
    spotlightGrad.addColorStop(1, "transparent");
    ctx.fillStyle = spotlightGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Runway preview (perspective)
    const centerX = CANVAS_WIDTH / 2;
    const vanishY = 80;
    const topWidth = 60;
    const bottomWidth = 280;

    ctx.beginPath();
    ctx.moveTo(centerX - topWidth / 2, vanishY);
    ctx.lineTo(centerX + topWidth / 2, vanishY);
    ctx.lineTo(centerX + bottomWidth / 2, CANVAS_HEIGHT);
    ctx.lineTo(centerX - bottomWidth / 2, CANVAS_HEIGHT);
    ctx.closePath();
    ctx.fillStyle = "rgba(30, 30, 30, 0.8)";
    ctx.fill();

    // Runway edge lights
    for (let i = 0; i < 8; i++) {
      const t = i / 8;
      const y = vanishY + t * (CANVAS_HEIGHT - vanishY);
      const widthAtY = topWidth + (bottomWidth - topWidth) * t;
      const leftX = centerX - widthAtY / 2;
      const rightX = centerX + widthAtY / 2;
      const lightSize = 2 + t * 4;
      const pulse = Math.sin(time * 2 + i * 0.5) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(leftX, y, lightSize, 0, Math.PI * 2);
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightX, y, lightSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Title with glow
    ctx.shadowColor = selectedRunway.accentColor;
    ctx.shadowBlur = 30;
    ctx.fillStyle = "#fff";
    ctx.font = "bold 56px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("CATWALK", CANVAS_WIDTH / 2, 85);
    ctx.shadowBlur = 0;

    // Runway name
    ctx.fillStyle = selectedRunway.accentColor;
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(selectedRunway.name, CANVAS_WIDTH / 2, 130);

    // Multiplier badge
    if (selectedRunway.gemMultiplier > 1) {
      ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
      ctx.beginPath();
      ctx.roundRect(CANVAS_WIDTH / 2 - 50, 145, 100, 30, 15);
      ctx.fill();
      ctx.fillStyle = "#06b6d4";
      ctx.font = "bold 16px sans-serif";
      ctx.fillText(`💎 ${selectedRunway.gemMultiplier}x Gems`, CANVAS_WIDTH / 2, 165);
    }

    // Controls panel
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH / 2 - 200, 195, 400, 55, 10);
    ctx.fill();

    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText("← →  Dodge", CANVAS_WIDTH / 2 - 110, 220);
    ctx.fillText("↑  Hit Beats", CANVAS_WIDTH / 2, 220);
    ctx.fillText("SPACE  Start", CANVAS_WIDTH / 2 + 110, 220);

    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#666";
    ctx.fillText("or tap/click to play", CANVAS_WIDTH / 2, 240);

    // Draw model with idle animation
    const idleFrame = Math.sin(time * 2) * 0.3;
    drawModel(ctx, CANVAS_WIDTH / 2, 380, idleFrame, selectedRunway.accentColor);

    // Best score display
    if (selectedRunway.bestScore) {
      ctx.fillStyle = "rgba(251, 191, 36, 0.15)";
      ctx.beginPath();
      ctx.roundRect(CANVAS_WIDTH / 2 - 80, 455, 160, 40, 8);
      ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("BEST SCORE", CANVAS_WIDTH / 2, 472);
      ctx.font = "bold 20px sans-serif";
      ctx.fillText(`${selectedRunway.bestScore.total_score}`, CANVAS_WIDTH / 2, 492);
    }

    // Animated particles
    for (let i = 0; i < 5; i++) {
      const px = Math.random() * CANVAS_WIDTH;
      const py = Math.random() * CANVAS_HEIGHT;
      const psize = Math.random() * 2 + 1;
      ctx.beginPath();
      ctx.arc(px, py, psize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
      ctx.fill();
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
