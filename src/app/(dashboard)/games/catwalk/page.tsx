"use client";

import { useEffect, useState, useRef } from "react";
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
const RUNWAY_LENGTH = 2400; // Shorter runway for better pace
const PLAYER_HEIGHT = 120;
const GAME_SPEED = 2.5; // Slower speed (was effectively 5)

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
  type: "sparkle" | "flash" | "star" | "circle";
}

// Camera flash
interface CameraFlash {
  x: number;
  y: number;
  life: number;
  intensity: number;
  size?: number;
  type?: "normal" | "burst" | "strobe";
}

// Paparazzi photographer in crowd
interface Paparazzo {
  x: number;
  y: number;
  side: "left" | "right";
  flashCooldown: number;
  cameraUp: boolean;
}

interface GameObject {
  x: number;
  y: number;
  lane: number;
  type: "obstacle" | "gem" | "beat";
  hit?: boolean;
}

type GamePhase = "idle" | "walking" | "posing" | "results";

// Floating text for visual feedback
interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  scale: number;
}

// Atmospheric particles for runway themes
interface AtmosphericParticle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  type: "sparkle" | "confetti" | "snowflake" | "leaf" | "star";
  rotation: number;
  color: string;
}

export default function CatwalkPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);

  const [gemBalance, setGemBalance] = useState<number>(0);
  const [_modelName, setModelName] = useState<string>("Model");
  const [runways, setRunways] = useState<Runway[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedRunway, setSelectedRunway] = useState<Runway | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [gamePhase, setGamePhase] = useState<GamePhase>("idle");
  const [_walkScore, setWalkScore] = useState(0);
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
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const comboRef = useRef(0);
  const screenShakeRef = useRef(0);
  const lastBeatTimeRef = useRef(0);
  const screenFlashRef = useRef(0); // Screen-wide flash effect

  // Media pit paparazzi
  const paparazziRef = useRef<Paparazzo[]>([]);
  const mediaPitActiveRef = useRef(false);

  // Atmospheric particles for themed runways
  const atmosphereRef = useRef<AtmosphericParticle[]>([]);

  // Ref to keep selectedRunway accessible in game loop without stale closures
  const selectedRunwayRef = useRef<Runway | null>(null);

  // Keep the ref updated when selectedRunway changes
  useEffect(() => {
    selectedRunwayRef.current = selectedRunway;
  }, [selectedRunway]);

  useEffect(() => {
    fetchStatus();
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Handle keyboard input (Arrow keys + WASD support)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (gamePhase === "idle" && selectedRunway) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          startGame();
        }
      } else if (gamePhase === "walking") {
        // Left movement: ArrowLeft or A
        if (e.code === "ArrowLeft" || e.code === "KeyA") {
          e.preventDefault();
          movePlayer(-1);
        // Right movement: ArrowRight or D
        } else if (e.code === "ArrowRight" || e.code === "KeyD") {
          e.preventDefault();
          movePlayer(1);
        // Beat hit: ArrowUp, W, or Space
        } else if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
          e.preventDefault();
          hitBeat();
        }
      } else if (gamePhase === "posing") {
        // Pose input: Arrow keys or WASD
        const keyMap: Record<string, string> = {
          ArrowUp: "ArrowUp",
          ArrowDown: "ArrowDown",
          ArrowLeft: "ArrowLeft",
          ArrowRight: "ArrowRight",
          KeyW: "ArrowUp",
          KeyS: "ArrowDown",
          KeyA: "ArrowLeft",
          KeyD: "ArrowRight",
        };
        if (keyMap[e.code]) {
          e.preventDefault();
          handlePoseInput(keyMap[e.code]);
        }
      } else if (gamePhase === "results" && !saving) {
        if (e.code === "Space" || e.code === "Enter") {
          e.preventDefault();
          resetGame();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gamePhase, selectedRunway, saving]);

  // Touch controls for mobile
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTouchMoveRef = useRef<number>(0);

  // Handle touch events on the canvas
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartRef.current || gamePhase !== "walking") return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const now = Date.now();

    // Throttle touch moves to avoid too many lane changes
    if (now - lastTouchMoveRef.current < 200) return;

    // Swipe threshold for lane change
    if (Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        movePlayer(1); // Swipe right
      } else {
        movePlayer(-1); // Swipe left
      }
      lastTouchMoveRef.current = now;
      // Reset touch start for continuous swiping
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: now,
      };
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStartRef.current) return;

    const touchDuration = Date.now() - touchStartRef.current.time;

    // Quick tap = beat hit or start game
    if (touchDuration < 200) {
      if (gamePhase === "idle" && selectedRunway) {
        e.preventDefault();
        startGame();
      } else if (gamePhase === "walking") {
        hitBeat();
      } else if (gamePhase === "results" && !saving) {
        resetGame();
      }
    }

    touchStartRef.current = null;
  }

  // Mobile control button handlers
  function handleMobileLeft() {
    if (gamePhase === "walking") movePlayer(-1);
    else if (gamePhase === "posing") handlePoseInput("ArrowLeft");
  }

  function handleMobileRight() {
    if (gamePhase === "walking") movePlayer(1);
    else if (gamePhase === "posing") handlePoseInput("ArrowRight");
  }

  function handleMobileUp() {
    if (gamePhase === "walking") hitBeat();
    else if (gamePhase === "posing") handlePoseInput("ArrowUp");
  }

  function handleMobileDown() {
    if (gamePhase === "posing") handlePoseInput("ArrowDown");
  }

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

          // Screen flash effect based on combo
          screenFlashRef.current = comboRef.current > 3 ? 0.4 : 0.2;

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

          // Floating text feedback based on timing and combo
          const feedbackText = distance < 15 ? "PERFECT!" : distance < 30 ? "GREAT!" : "GOOD";
          const feedbackColor = distance < 15 ? "#fbbf24" : distance < 30 ? "#22c55e" : "#06b6d4";
          floatingTextsRef.current.push({
            x: beatX,
            y: player.y - 40,
            text: feedbackText,
            color: feedbackColor,
            life: 1,
            scale: distance < 15 ? 2 : 1.5,
          });

          // Show combo text for streaks
          if (comboRef.current > 2) {
            floatingTextsRef.current.push({
              x: beatX,
              y: player.y - 70,
              text: `${comboRef.current}x COMBO`,
              color: "#ec4899",
              life: 1,
              scale: 1.2,
            });
          }
          return;
        }
      }
    }
    // Missed - reset combo
    comboRef.current = 0;
  }

  function spawnFloatingText(x: number, y: number, text: string, color: string) {
    floatingTextsRef.current.push({
      x,
      y,
      text,
      color,
      life: 1,
      scale: 1.5,
    });
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
    // Add floating +1 text
    spawnFloatingText(x, y - 20, "+1", "#06b6d4");
  }

  function spawnCameraFlash(x: number, y: number, type: "normal" | "burst" | "strobe" = "normal") {
    const sizes = { normal: 40, burst: 80, strobe: 30 };
    flashesRef.current.push({
      x,
      y,
      life: 1,
      intensity: type === "burst" ? 1 : 0.7 + Math.random() * 0.3,
      size: sizes[type],
      type,
    });

    // Burst creates multiple secondary flashes
    if (type === "burst") {
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          flashesRef.current.push({
            x: x + (Math.random() - 0.5) * 60,
            y: y + (Math.random() - 0.5) * 40,
            life: 0.8,
            intensity: 0.6,
            size: 25,
            type: "normal",
          });
        }, i * 50);
      }
    }
  }

  function initializePaparazzi() {
    const paparazzi: Paparazzo[] = [];
    // Left side paparazzi (media pit)
    for (let i = 0; i < 8; i++) {
      paparazzi.push({
        x: 60 + Math.random() * 80,
        y: 120 + i * 45,
        side: "left",
        flashCooldown: Math.random() * 60,
        cameraUp: Math.random() > 0.5,
      });
    }
    // Right side paparazzi
    for (let i = 0; i < 8; i++) {
      paparazzi.push({
        x: CANVAS_WIDTH - 60 - Math.random() * 80,
        y: 120 + i * 45,
        side: "right",
        flashCooldown: Math.random() * 60,
        cameraUp: Math.random() > 0.5,
      });
    }
    paparazziRef.current = paparazzi;
  }

  function initializeAtmosphere() {
    if (!selectedRunway) return;
    const particles: AtmosphericParticle[] = [];
    const runwayId = selectedRunway.id;

    // Different atmospheres for different runways
    for (let i = 0; i < 40; i++) {
      let particle: AtmosphericParticle;

      switch (runwayId) {
        case "paris":
          // Romantic sparkles and golden leaves
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 3 + Math.random() * 5,
            speed: 0.5 + Math.random() * 1.5,
            opacity: 0.3 + Math.random() * 0.5,
            type: i % 3 === 0 ? "leaf" : "sparkle",
            rotation: Math.random() * Math.PI * 2,
            color: i % 3 === 0 ? "#d4a853" : "#a855f7",
          };
          break;
        case "nyc":
          // Confetti and city lights sparkles
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 4 + Math.random() * 6,
            speed: 1 + Math.random() * 2,
            opacity: 0.4 + Math.random() * 0.4,
            type: i % 2 === 0 ? "confetti" : "sparkle",
            rotation: Math.random() * Math.PI * 2,
            color: ["#f59e0b", "#ef4444", "#3b82f6", "#22c55e", "#fff"][Math.floor(Math.random() * 5)],
          };
          break;
        case "milan":
          // Elegant white petals and gold dust
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 3 + Math.random() * 4,
            speed: 0.3 + Math.random() * 1,
            opacity: 0.5 + Math.random() * 0.4,
            type: "sparkle",
            rotation: Math.random() * Math.PI * 2,
            color: i % 2 === 0 ? "#fff" : "#14b8a6",
          };
          break;
        case "london":
          // Misty fog particles and red accents
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 8 + Math.random() * 12,
            speed: 0.2 + Math.random() * 0.5,
            opacity: 0.1 + Math.random() * 0.2,
            type: "sparkle",
            rotation: 0,
            color: i % 5 === 0 ? "#ef4444" : "#ffffff",
          };
          break;
        case "lagerfeld":
          // Magical golden stars and diamond sparkles
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 3 + Math.random() * 6,
            speed: 0.4 + Math.random() * 1,
            opacity: 0.6 + Math.random() * 0.4,
            type: i % 2 === 0 ? "star" : "sparkle",
            rotation: Math.random() * Math.PI * 2,
            color: ["#fbbf24", "#fff", "#d4af37"][Math.floor(Math.random() * 3)],
          };
          break;
        default:
          // Studio - basic sparkles
          particle = {
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 2 + Math.random() * 3,
            speed: 0.5 + Math.random() * 1,
            opacity: 0.3 + Math.random() * 0.3,
            type: "sparkle",
            rotation: 0,
            color: "#ec4899",
          };
      }
      particles.push(particle);
    }
    atmosphereRef.current = particles;
  }

  function handlePoseInput(key: string) {
    const expected = poseSequenceRef.current[currentPoseRef.current];
    const keyMap: Record<string, string> = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };

    const player = playerRef.current;
    const isCorrect = keyMap[key] === expected;

    if (isCorrect) {
      poseResultsRef.current.push(true);
      // Visual feedback for correct pose
      floatingTextsRef.current.push({
        x: CANVAS_WIDTH / 2,
        y: player.y - 60,
        text: "STRIKE!",
        color: "#22c55e",
        life: 1,
        scale: 2,
      });
      screenFlashRef.current = 0.15;
      // Green sparkle particles
      for (let p = 0; p < 10; p++) {
        particlesRef.current.push({
          x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 100,
          y: player.y - 30,
          vx: (Math.random() - 0.5) * 6,
          vy: -Math.random() * 5 - 1,
          life: 1,
          maxLife: 1,
          color: "#22c55e",
          size: Math.random() * 4 + 2,
          type: "star",
        });
      }
    } else {
      poseResultsRef.current.push(false);
      // Visual feedback for wrong pose
      floatingTextsRef.current.push({
        x: CANVAS_WIDTH / 2,
        y: player.y - 60,
        text: "MISS",
        color: "#ef4444",
        life: 1,
        scale: 1.5,
      });
      screenShakeRef.current = 5;
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

    // Initialize media pit paparazzi
    initializePaparazzi();
    mediaPitActiveRef.current = false;

    // Initialize runway-themed atmosphere
    initializeAtmosphere();

    setWalkScore(100);
    setGemsCollected(0);
    setPerfectWalks(0);
    setPoseScore(0);
    setGameResult(null);

    // Generate obstacles and gems
    generateObjects();

    // Set game phase to walking - useEffect will start the game loop
    setGamePhase("walking");
  }

  function generateObjects() {
    const objects: GameObject[] = [];
    const spacing = 300; // More spread out for relaxed pace

    for (let y = -spacing; y > -RUNWAY_LENGTH; y -= spacing) {
      const random = Math.random();

      if (random < 0.35) {
        // Obstacle (slightly less frequent)
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

  // Store game phase in a ref for the animation loop
  const gamePhaseRef = useRef<GamePhase>("idle");
  useEffect(() => {
    gamePhaseRef.current = gamePhase;
  }, [gamePhase]);

  // The actual game tick function - defined as a regular function so it always has fresh state
  function gameTick() {
    if (gamePhaseRef.current !== "walking") return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    frameCountRef.current++;
    distanceRef.current += GAME_SPEED;

    const player = playerRef.current;

    // Smooth lane movement
    const targetX = getLaneX(player.targetLane);
    const currentX = getLaneX(player.lane);
    if (Math.abs(targetX - currentX) > 5) {
      player.lane += (player.targetLane - player.lane) * 0.15;
    } else {
      player.lane = player.targetLane;
    }

    // Walk animation (slower, more elegant)
    player.walkFrame = (frameCountRef.current / 10) % (Math.PI * 2);

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
      const decayRate = flashes[i].type === "burst" ? 0.06 : 0.1;
      flashes[i].life -= decayRate;
      if (flashes[i].life <= 0) {
        flashes.splice(i, 1);
      }
    }

    // Update floating texts
    const floatingTexts = floatingTextsRef.current;
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 1.5; // Float upward
      ft.life -= 0.02;
      ft.scale *= 0.98; // Shrink slightly
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // Update screen flash (decay)
    if (screenFlashRef.current > 0) {
      screenFlashRef.current *= 0.85;
      if (screenFlashRef.current < 0.01) {
        screenFlashRef.current = 0;
      }
    }

    // Update paparazzi and trigger their flashes
    const progress = distanceRef.current / RUNWAY_LENGTH;
    const paparazzi = paparazziRef.current;
    for (const pap of paparazzi) {
      pap.flashCooldown--;

      // Flash more frequently as model gets closer to camera
      const flashChance = progress > 0.7 ? 0.08 : progress > 0.4 ? 0.04 : 0.02;

      if (pap.flashCooldown <= 0 && Math.random() < flashChance) {
        // Paparazzi takes photo!
        pap.cameraUp = true;
        const flashType = progress > 0.8 && Math.random() > 0.5 ? "burst" : "normal";
        spawnCameraFlash(pap.x, pap.y - 15, flashType);
        pap.flashCooldown = 30 + Math.random() * 60; // Cooldown before next flash

        // Camera click sound effect could go here
      }

      // Camera lowering animation
      if (pap.flashCooldown > 0 && pap.flashCooldown < 20) {
        pap.cameraUp = false;
      }
    }

    // Media pit activation near end of runway (intense flash zone)
    if (progress > 0.85 && !mediaPitActiveRef.current) {
      mediaPitActiveRef.current = true;
      // Massive flash burst as model enters media pit
      for (let i = 0; i < 6; i++) {
        setTimeout(() => {
          const side = i % 2 === 0 ? 1 : -1;
          spawnCameraFlash(
            CANVAS_WIDTH / 2 + side * (80 + Math.random() * 100),
            150 + Math.random() * 200,
            "burst"
          );
        }, i * 80);
      }
    }

    // Continuous media pit flashes when active
    if (mediaPitActiveRef.current && Math.random() < 0.15) {
      const side = Math.random() > 0.5 ? 1 : -1;
      spawnCameraFlash(
        CANVAS_WIDTH / 2 + side * (60 + Math.random() * 120),
        100 + Math.random() * 250,
        Math.random() > 0.7 ? "burst" : "strobe"
      );
    }

    // Random camera flashes from crowd (ambient)
    if (Math.random() < 0.05) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const crowdX = CANVAS_WIDTH / 2 + side * (LANE_WIDTH * 2 + 50 + Math.random() * 80);
      const crowdY = 100 + Math.random() * 300;
      spawnCameraFlash(crowdX, crowdY, "normal");
    }

    // Update atmospheric particles
    const atmosphere = atmosphereRef.current;
    for (const p of atmosphere) {
      p.y += p.speed;
      p.rotation += 0.02;
      if (p.type === "confetti") {
        p.x += Math.sin(p.rotation) * 0.5;
      } else if (p.type === "leaf") {
        p.x += Math.sin(p.rotation * 2) * 0.8;
      }
      // Reset particles that go off screen
      if (p.y > CANVAS_HEIGHT + 20) {
        p.y = -20;
        p.x = Math.random() * CANVAS_WIDTH;
      }
    }

    // Move objects toward player
    const objects = objectsRef.current;
    for (let i = objects.length - 1; i >= 0; i--) {
      objects[i].y += GAME_SPEED;

      // Check collision
      if (objects[i].y > player.y - PLAYER_HEIGHT / 2 && objects[i].y < player.y + 30) {
        const objLane = objects[i].lane;
        const playerLane = Math.round(player.lane);

        if (Math.abs(objLane - playerLane) < 0.5) {
          if (objects[i].type === "obstacle") {
            // Hit obstacle - screen shake and visual feedback
            const obstacleX = getLaneX(objLane);
            walkScoreRef.current = Math.max(0, walkScoreRef.current - 15);
            setWalkScore(walkScoreRef.current);
            screenShakeRef.current = 10;
            comboRef.current = 0;

            // Red floating text for penalty
            floatingTextsRef.current.push({
              x: obstacleX,
              y: objects[i].y - 30,
              text: "-15",
              color: "#ef4444",
              life: 1,
              scale: 1.5,
            });

            // Spawn red particles for hit effect
            for (let p = 0; p < 6; p++) {
              particlesRef.current.push({
                x: obstacleX,
                y: objects[i].y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 0.8,
                maxLife: 0.8,
                color: "#ef4444",
                size: Math.random() * 5 + 3,
                type: "circle",
              });
            }

            objects.splice(i, 1);
            continue;
          } else if (objects[i].type === "gem") {
            // Collect gem with particles and feedback
            const gemX = getLaneX(objLane);
            const gemY = objects[i].y;
            spawnGemParticles(gemX, gemY);
            gemsRef.current++;
            setGemsCollected(gemsRef.current);

            // Floating text for gem collection
            floatingTextsRef.current.push({
              x: gemX,
              y: gemY - 20,
              text: "+1",
              color: "#06b6d4",
              life: 0.8,
              scale: 1.2,
            });

            // Subtle cyan screen flash for gems
            screenFlashRef.current = Math.max(screenFlashRef.current, 0.1);

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
  }

  // Animation loop wrapper - uses ref to always call latest gameTick
  function runGameLoop() {
    gameTick();
    if (gamePhaseRef.current === "walking") {
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }
  }

  useEffect(() => {
    if (gamePhase === "walking") {
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gamePhase]);

  function getLaneX(lane: number, y?: number): number {
    const centerX = CANVAS_WIDTH / 2;
    const baseLaneOffset = (lane - 1) * LANE_WIDTH;

    // Apply perspective narrowing based on Y position (for 2.5D effect)
    if (y !== undefined) {
      const farY = 30;
      const nearY = CANVAS_HEIGHT + 20;
      const t = (y - farY) / (nearY - farY);
      const perspectiveScale = 0.35 + t * 0.75; // Narrower at far end
      return centerX + baseLaneOffset * perspectiveScale;
    }

    return centerX + baseLaneOffset;
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

  // Isometric projection helpers for 2.5D view
  function toIsometric(x: number, y: number, z: number = 0): { x: number; y: number } {
    // Isometric projection with camera angle from behind-above
    const isoAngle = 0.5; // Viewing angle (0.5 = 30 degrees down)
    const scale = 1.2;

    return {
      x: CANVAS_WIDTH / 2 + (x - CANVAS_WIDTH / 2) * scale,
      y: y * (1 - isoAngle * 0.3) + z * isoAngle * 0.5 + 50,
    };
  }

  function getDepthScale(y: number): number {
    // Objects closer to camera (higher y) appear larger
    const minScale = 0.4;
    const maxScale = 1.2;
    // Clamp t to prevent negative scales for objects above the canvas
    const t = Math.max(0, Math.min(1, y / CANVAS_HEIGHT));
    return minScale + (maxScale - minScale) * t;
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

    // Background gradient - darker for 3D depth
    const bgGrad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    bgGrad.addColorStop(0, selectedRunway.background);
    bgGrad.addColorStop(0.4, shadeColor(selectedRunway.background, -20));
    bgGrad.addColorStop(1, "#000000");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw runway-specific themed background
    drawThemedBackground(ctx, selectedRunway.id);

    // === 2.5D ISOMETRIC RUNWAY ===
    const centerX = CANVAS_WIDTH / 2;
    const runwayWidth = LANE_WIDTH * 3 + 60;
    const perspectiveNarrow = 0.35; // How much runway narrows at the back

    // Runway dimensions at different depths
    const farY = 30;
    const nearY = CANVAS_HEIGHT + 20;
    const farWidth = runwayWidth * perspectiveNarrow;
    const nearWidth = runwayWidth * 1.1;

    // 3D Runway platform - Draw sides first (depth)
    const platformHeight = 25;

    // Left side of platform (3D edge)
    ctx.beginPath();
    ctx.moveTo(centerX - nearWidth / 2, nearY);
    ctx.lineTo(centerX - farWidth / 2, farY);
    ctx.lineTo(centerX - farWidth / 2, farY + platformHeight * 0.3);
    ctx.lineTo(centerX - nearWidth / 2, nearY + platformHeight);
    ctx.closePath();
    const leftSideGrad = ctx.createLinearGradient(0, farY, 0, nearY);
    leftSideGrad.addColorStop(0, "#0a0a0a");
    leftSideGrad.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = leftSideGrad;
    ctx.fill();

    // Right side of platform (3D edge)
    ctx.beginPath();
    ctx.moveTo(centerX + nearWidth / 2, nearY);
    ctx.lineTo(centerX + farWidth / 2, farY);
    ctx.lineTo(centerX + farWidth / 2, farY + platformHeight * 0.3);
    ctx.lineTo(centerX + nearWidth / 2, nearY + platformHeight);
    ctx.closePath();
    const rightSideGrad = ctx.createLinearGradient(0, farY, 0, nearY);
    rightSideGrad.addColorStop(0, "#0a0a0a");
    rightSideGrad.addColorStop(1, "#151515");
    ctx.fillStyle = rightSideGrad;
    ctx.fill();

    // Main runway surface (top of platform)
    const runwayGrad = ctx.createLinearGradient(0, farY, 0, nearY);
    runwayGrad.addColorStop(0, "#1a1a1a");
    runwayGrad.addColorStop(0.3, "#252525");
    runwayGrad.addColorStop(0.7, "#2a2a2a");
    runwayGrad.addColorStop(1, "#222222");

    ctx.beginPath();
    ctx.moveTo(centerX - farWidth / 2, farY);
    ctx.lineTo(centerX + farWidth / 2, farY);
    ctx.lineTo(centerX + nearWidth / 2, nearY);
    ctx.lineTo(centerX - nearWidth / 2, nearY);
    ctx.closePath();
    ctx.fillStyle = runwayGrad;
    ctx.fill();

    // Runway center line (perspective)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 15]);
    ctx.beginPath();
    ctx.moveTo(centerX, farY);
    ctx.lineTo(centerX, nearY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing runway edge lights with 3D effect
    const edgeLightCount = 14;
    for (let i = 0; i < edgeLightCount; i++) {
      const t = i / edgeLightCount;
      const y = farY + t * (nearY - farY);
      const widthAtY = farWidth + (nearWidth - farWidth) * t;
      const leftX = centerX - widthAtY / 2;
      const rightX = centerX + widthAtY / 2;
      const lightSize = 2 + t * 6;
      const pulse = Math.sin(frameCountRef.current * 0.1 + i * 0.5) * 0.3 + 0.7;

      // Left light with 3D glow
      ctx.beginPath();
      ctx.arc(leftX, y, lightSize, 0, Math.PI * 2);
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Light glow on runway surface
      const glowGrad = ctx.createRadialGradient(leftX, y, 0, leftX, y, lightSize * 4);
      glowGrad.addColorStop(0, selectedRunway.accentColor + "50");
      glowGrad.addColorStop(0.5, selectedRunway.accentColor + "20");
      glowGrad.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad;
      ctx.fillRect(leftX - lightSize * 4, y - lightSize * 4, lightSize * 8, lightSize * 8);

      // Right light
      ctx.beginPath();
      ctx.arc(rightX, y, lightSize, 0, Math.PI * 2);
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.globalAlpha = pulse;
      ctx.fill();
      ctx.globalAlpha = 1;

      const glowGrad2 = ctx.createRadialGradient(rightX, y, 0, rightX, y, lightSize * 4);
      glowGrad2.addColorStop(0, selectedRunway.accentColor + "50");
      glowGrad2.addColorStop(0.5, selectedRunway.accentColor + "20");
      glowGrad2.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrad2;
      ctx.fillRect(rightX - lightSize * 4, y - lightSize * 4, lightSize * 8, lightSize * 8);

      // Light reflection on floor
      ctx.globalAlpha = 0.1 * pulse;
      ctx.fillStyle = selectedRunway.accentColor;
      ctx.beginPath();
      ctx.ellipse(leftX + 10, y + 5, lightSize * 2, lightSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(rightX - 10, y + 5, lightSize * 2, lightSize * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Crowd silhouettes on sides
    drawCrowd(ctx, true);
    drawCrowd(ctx, false);

    // Draw paparazzi photographers
    drawMediaPit(ctx);

    // Draw camera flashes with enhanced effects
    for (const flash of flashesRef.current) {
      const size = flash.size || 40;
      const baseIntensity = flash.life * flash.intensity;

      // Main flash
      const flashGrad = ctx.createRadialGradient(
        flash.x, flash.y, 0,
        flash.x, flash.y, size * flash.intensity
      );
      flashGrad.addColorStop(0, `rgba(255, 255, 255, ${baseIntensity})`);
      flashGrad.addColorStop(0.2, `rgba(255, 255, 240, ${baseIntensity * 0.8})`);
      flashGrad.addColorStop(0.5, `rgba(255, 250, 200, ${baseIntensity * 0.4})`);
      flashGrad.addColorStop(1, "transparent");
      ctx.fillStyle = flashGrad;
      ctx.fillRect(flash.x - size * 1.5, flash.y - size * 1.5, size * 3, size * 3);

      // Burst flashes have lens flare effect
      if (flash.type === "burst" && flash.life > 0.5) {
        // Horizontal lens flare
        ctx.fillStyle = `rgba(255, 255, 200, ${flash.life * 0.3})`;
        ctx.fillRect(flash.x - 80, flash.y - 2, 160, 4);

        // Vertical lens flare
        ctx.fillRect(flash.x - 2, flash.y - 60, 4, 120);

        // Star burst
        ctx.save();
        ctx.translate(flash.x, flash.y);
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.fillStyle = `rgba(255, 255, 255, ${flash.life * 0.2})`;
          ctx.fillRect(-1, 0, 2, 50);
        }
        ctx.restore();
      }

      // Strobe flashes are sharper
      if (flash.type === "strobe") {
        ctx.fillStyle = `rgba(255, 255, 255, ${flash.life})`;
        ctx.beginPath();
        ctx.arc(flash.x, flash.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Screen flash effect when media pit is super active
    if (mediaPitActiveRef.current && flashesRef.current.length > 5) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.03 * flashesRef.current.length})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
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

    // Draw objects with 2.5D depth scaling
    // Sort objects by Y so farther ones are drawn first
    const sortedObjects = [...objects].sort((a, b) => a.y - b.y);

    for (const obj of sortedObjects) {
      // Use perspective-aware lane position
      const objX = getLaneX(obj.lane, obj.y);
      const depthScale = getDepthScale(obj.y);

      if (obj.type === "obstacle") {
        // Paparazzi photographer with depth scaling
        ctx.save();
        ctx.translate(objX, obj.y);
        ctx.scale(depthScale, depthScale);
        ctx.translate(-objX, -obj.y);
        drawPaparazzi(ctx, objX, obj.y);
        ctx.restore();
      } else if (obj.type === "gem") {
        // Spinning gem with depth scaling
        const gemSize = 18 * depthScale;
        // Draw shadow on runway
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.ellipse(objX, obj.y + 25 * depthScale, gemSize * 0.8, gemSize * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        drawGem(ctx, objX, obj.y + 15 * depthScale, gemSize, "#06b6d4");
      } else if (obj.type === "beat") {
        // Beat marker with glow and depth scaling
        if (!obj.hit) {
          const beatPulse = Math.sin(frameCountRef.current * 0.15) * 0.3 + 0.7;
          const beatSize = 22 * depthScale;

          // Outer glow
          const beatGrad = ctx.createRadialGradient(objX, obj.y, 0, objX, obj.y, 35 * depthScale);
          beatGrad.addColorStop(0, selectedRunway.accentColor + "80");
          beatGrad.addColorStop(1, "transparent");
          ctx.fillStyle = beatGrad;
          ctx.fillRect(objX - 40 * depthScale, obj.y - 40 * depthScale, 80 * depthScale, 80 * depthScale);

          // Beat circle
          ctx.strokeStyle = selectedRunway.accentColor;
          ctx.lineWidth = 3 * depthScale;
          ctx.globalAlpha = beatPulse;
          ctx.beginPath();
          ctx.arc(objX, obj.y, beatSize, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Arrow up icon
          ctx.fillStyle = selectedRunway.accentColor;
          ctx.beginPath();
          ctx.moveTo(objX, obj.y - 10 * depthScale);
          ctx.lineTo(objX + 8 * depthScale, obj.y + 2 * depthScale);
          ctx.lineTo(objX - 8 * depthScale, obj.y + 2 * depthScale);
          ctx.closePath();
          ctx.fill();
        } else {
          // Hit sparkle
          ctx.fillStyle = "#22c55e";
          ctx.font = `bold ${Math.floor(28 * depthScale)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("✓", objX, obj.y + 10 * depthScale);
        }
      }
    }

    // Beat hit zone indicator with perspective
    const hitZoneY = player.y;
    const hitZoneWidth = nearWidth * 0.8;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(centerX - hitZoneWidth / 2 + 30, hitZoneY);
    ctx.lineTo(centerX + hitZoneWidth / 2 - 30, hitZoneY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw player with perspective
    const playerX = getLaneX(player.lane, player.y);
    const playerScale = getDepthScale(player.y);

    // Player shadow on runway
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(playerX, player.y + 95 * playerScale, 30 * playerScale, 12 * playerScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw model with scale
    ctx.save();
    ctx.translate(playerX, player.y);
    ctx.scale(playerScale, playerScale);
    ctx.translate(-playerX, -player.y);
    drawModel(ctx, playerX, player.y, player.walkFrame, selectedRunway.accentColor);
    ctx.restore();

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

    // Draw atmospheric particles (falling sparkles, confetti, etc.)
    drawAtmosphere(ctx);

    // Draw floating texts (PERFECT!, GREAT!, combo multipliers, etc.)
    for (const ft of floatingTextsRef.current) {
      ctx.save();
      ctx.globalAlpha = ft.life;
      ctx.font = `bold ${Math.floor(16 * ft.scale)}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // Text shadow/glow
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      // Second pass for extra glow
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // HUD with glow
    drawHUD(ctx);

    // Screen flash overlay (for beat hits)
    if (screenFlashRef.current > 0) {
      ctx.save();
      ctx.globalAlpha = screenFlashRef.current;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawThemedBackground(ctx: CanvasRenderingContext2D, runwayId: string) {
    const time = frameCountRef.current * 0.01;

    switch (runwayId) {
      case "paris": {
        // Eiffel Tower silhouette
        ctx.fillStyle = "rgba(100, 80, 120, 0.3)";
        const towerX = CANVAS_WIDTH * 0.15;
        ctx.beginPath();
        ctx.moveTo(towerX, 200);
        ctx.lineTo(towerX - 40, 180);
        ctx.lineTo(towerX - 25, 120);
        ctx.lineTo(towerX - 15, 80);
        ctx.lineTo(towerX - 8, 30);
        ctx.lineTo(towerX, 0);
        ctx.lineTo(towerX + 8, 30);
        ctx.lineTo(towerX + 15, 80);
        ctx.lineTo(towerX + 25, 120);
        ctx.lineTo(towerX + 40, 180);
        ctx.closePath();
        ctx.fill();

        // Romantic streetlamp on right
        ctx.fillStyle = "rgba(160, 100, 180, 0.25)";
        ctx.fillRect(CANVAS_WIDTH * 0.85, 60, 4, 120);
        // Lamp glow
        const lampGlow = ctx.createRadialGradient(CANVAS_WIDTH * 0.85 + 2, 55, 0, CANVAS_WIDTH * 0.85 + 2, 55, 40);
        lampGlow.addColorStop(0, "rgba(255, 220, 180, 0.4)");
        lampGlow.addColorStop(1, "transparent");
        ctx.fillStyle = lampGlow;
        ctx.fillRect(CANVAS_WIDTH * 0.85 - 40, 15, 80, 80);

        // Stars in night sky
        for (let i = 0; i < 12; i++) {
          const starX = 50 + i * 70;
          const starY = 20 + Math.sin(time + i) * 10;
          ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + Math.sin(time * 2 + i) * 0.2})`;
          ctx.beginPath();
          ctx.arc(starX, starY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case "nyc": {
        // NYC skyline silhouette
        ctx.fillStyle = "rgba(30, 40, 60, 0.5)";
        // Building 1 (Empire State style)
        ctx.fillRect(50, 80, 40, 200);
        ctx.fillRect(60, 40, 20, 40);
        ctx.fillRect(68, 20, 4, 20);
        // Building 2
        ctx.fillRect(100, 100, 50, 180);
        ctx.fillRect(110, 70, 30, 30);
        // Building 3
        ctx.fillRect(680, 90, 45, 190);
        ctx.fillRect(690, 60, 25, 30);
        // Building 4 (Freedom Tower style)
        ctx.fillRect(730, 50, 35, 230);
        ctx.fillRect(740, 10, 15, 40);

        // Window lights
        ctx.fillStyle = "rgba(255, 200, 100, 0.6)";
        for (let i = 0; i < 8; i++) {
          for (let j = 0; j < 5; j++) {
            if (Math.random() > 0.3) {
              ctx.fillRect(55 + j * 8, 90 + i * 12, 4, 6);
            }
          }
        }
        for (let i = 0; i < 6; i++) {
          for (let j = 0; j < 4; j++) {
            if (Math.random() > 0.3) {
              ctx.fillRect(686 + j * 10, 100 + i * 14, 5, 7);
            }
          }
        }

        // Searchlight beam
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.moveTo(CANVAS_WIDTH / 2, 0);
        ctx.lineTo(CANVAS_WIDTH / 2 - 100 + Math.sin(time) * 50, 150);
        ctx.lineTo(CANVAS_WIDTH / 2 + 100 + Math.sin(time) * 50, 150);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }

      case "milan": {
        // Milan Cathedral (Duomo) silhouette
        ctx.fillStyle = "rgba(50, 60, 70, 0.35)";
        const duomoX = CANVAS_WIDTH * 0.85;
        // Main cathedral body
        ctx.fillRect(duomoX - 60, 80, 120, 200);
        // Spires
        for (let i = 0; i < 7; i++) {
          const spireX = duomoX - 50 + i * 18;
          const spireH = 30 + (i === 3 ? 50 : Math.random() * 20);
          ctx.beginPath();
          ctx.moveTo(spireX, 80);
          ctx.lineTo(spireX + 6, 80 - spireH);
          ctx.lineTo(spireX + 12, 80);
          ctx.fill();
        }

        // Elegant arch on left
        ctx.strokeStyle = "rgba(20, 184, 166, 0.3)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(80, 180, 60, Math.PI, 0, false);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(80, 180, 45, Math.PI, 0, false);
        ctx.stroke();
        break;
      }

      case "london": {
        // Big Ben / Tower Bridge silhouette
        ctx.fillStyle = "rgba(40, 35, 30, 0.4)";
        // Big Ben
        const benX = 60;
        ctx.fillRect(benX, 50, 35, 200);
        ctx.fillRect(benX - 5, 40, 45, 15);
        ctx.fillRect(benX + 10, 10, 15, 30);
        // Clock face
        ctx.fillStyle = "rgba(255, 220, 150, 0.4)";
        ctx.beginPath();
        ctx.arc(benX + 17, 70, 12, 0, Math.PI * 2);
        ctx.fill();

        // Tower Bridge on right
        ctx.fillStyle = "rgba(40, 35, 30, 0.4)";
        ctx.fillRect(680, 100, 25, 150);
        ctx.fillRect(740, 100, 25, 150);
        // Bridge deck
        ctx.fillRect(680, 160, 85, 15);
        // Tower tops
        ctx.beginPath();
        ctx.moveTo(680, 100);
        ctx.lineTo(692, 60);
        ctx.lineTo(705, 100);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(740, 100);
        ctx.lineTo(752, 60);
        ctx.lineTo(765, 100);
        ctx.fill();

        // Fog/mist effect
        for (let i = 0; i < 5; i++) {
          const fogY = 200 + i * 60;
          const fogGrad = ctx.createLinearGradient(0, fogY, 0, fogY + 80);
          fogGrad.addColorStop(0, "transparent");
          fogGrad.addColorStop(0.5, "rgba(200, 200, 210, 0.08)");
          fogGrad.addColorStop(1, "transparent");
          ctx.fillStyle = fogGrad;
          ctx.fillRect(0, fogY, CANVAS_WIDTH, 80);
        }
        break;
      }

      case "lagerfeld": {
        // Magical legendary show - golden sparkles everywhere
        // Grand chandeliers
        for (let i = 0; i < 3; i++) {
          const chandelierX = 150 + i * 250;
          const chandelierY = 50;

          // Chandelier glow
          const chandGlow = ctx.createRadialGradient(chandelierX, chandelierY, 0, chandelierX, chandelierY, 80);
          chandGlow.addColorStop(0, "rgba(255, 215, 100, 0.3)");
          chandGlow.addColorStop(0.5, "rgba(255, 200, 50, 0.1)");
          chandGlow.addColorStop(1, "transparent");
          ctx.fillStyle = chandGlow;
          ctx.fillRect(chandelierX - 100, chandelierY - 100, 200, 200);

          // Crystal droplets
          ctx.fillStyle = "#fbbf24";
          for (let j = 0; j < 8; j++) {
            const angle = (j / 8) * Math.PI * 2 + time;
            const dropX = chandelierX + Math.cos(angle) * 25;
            const dropY = chandelierY + Math.sin(angle) * 15 + 20;
            ctx.beginPath();
            ctx.moveTo(dropX, dropY);
            ctx.lineTo(dropX + 3, dropY + 8);
            ctx.lineTo(dropX, dropY + 12);
            ctx.lineTo(dropX - 3, dropY + 8);
            ctx.closePath();
            ctx.fill();
          }
        }

        // Golden trim lines
        ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, 120);
        ctx.lineTo(CANVAS_WIDTH, 120);
        ctx.stroke();
        ctx.setLineDash([]);
        break;
      }

      default: {
        // Studio - professional lighting setup
        // Stage lights
        for (let i = 0; i < 4; i++) {
          const lightX = 100 + i * 200;
          const spotGrad = ctx.createRadialGradient(lightX, 0, 0, lightX, 0, 150);
          spotGrad.addColorStop(0, "rgba(236, 72, 153, 0.15)");
          spotGrad.addColorStop(1, "transparent");
          ctx.fillStyle = spotGrad;
          ctx.beginPath();
          ctx.moveTo(lightX, 0);
          ctx.lineTo(lightX - 80, 180);
          ctx.lineTo(lightX + 80, 180);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }

  function drawAtmosphere(ctx: CanvasRenderingContext2D) {
    const atmosphere = atmosphereRef.current;
    const time = frameCountRef.current * 0.02;

    for (const p of atmosphere) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case "sparkle": {
          // Diamond sparkle
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.lineTo(p.size * 0.3, 0);
          ctx.lineTo(0, p.size);
          ctx.lineTo(-p.size * 0.3, 0);
          ctx.closePath();
          ctx.fill();

          // Cross shine
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.8, 0);
          ctx.lineTo(p.size * 0.8, 0);
          ctx.moveTo(0, -p.size * 0.8);
          ctx.lineTo(0, p.size * 0.8);
          ctx.stroke();
          break;
        }
        case "confetti": {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          break;
        }
        case "leaf": {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size / 2, p.rotation, 0, Math.PI * 2);
          ctx.fill();
          // Leaf vein
          ctx.strokeStyle = shadeColor(p.color, -20);
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(p.size, 0);
          ctx.stroke();
          break;
        }
        case "star": {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
            const outerX = Math.cos(angle) * p.size;
            const outerY = Math.sin(angle) * p.size;
            if (i === 0) {
              ctx.moveTo(outerX, outerY);
            } else {
              ctx.lineTo(outerX, outerY);
            }
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * p.size * 0.4;
            const innerY = Math.sin(innerAngle) * p.size * 0.4;
            ctx.lineTo(innerX, innerY);
          }
          ctx.closePath();
          ctx.fill();
          break;
        }
        case "snowflake": {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1;
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -p.size);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
          }
          break;
        }
      }

      ctx.restore();
    }
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

  function drawMediaPit(ctx: CanvasRenderingContext2D) {
    const paparazzi = paparazziRef.current;
    const progress = distanceRef.current / RUNWAY_LENGTH;

    for (const pap of paparazzi) {
      const isFlashing = pap.flashCooldown > 50;

      // Photographer body (crouching/kneeling pose)
      ctx.fillStyle = "#1a1a1a";

      // Body
      ctx.beginPath();
      if (pap.cameraUp) {
        // Standing pose with camera up
        ctx.fillRect(pap.x - 10, pap.y - 5, 20, 35);
      } else {
        // Slightly hunched
        ctx.fillRect(pap.x - 10, pap.y, 20, 30);
      }
      ctx.fill();

      // Head
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.arc(pap.x, pap.y - 12, 9, 0, Math.PI * 2);
      ctx.fill();

      // Camera (professional DSLR style)
      ctx.save();
      ctx.translate(pap.x, pap.y);

      if (pap.cameraUp) {
        // Camera raised to eye level
        ctx.translate(pap.side === "left" ? 12 : -12, -8);
        ctx.rotate(pap.side === "left" ? 0.3 : -0.3);
      } else {
        // Camera at chest level
        ctx.translate(pap.side === "left" ? 8 : -8, 5);
      }

      // Camera body
      ctx.fillStyle = "#222";
      ctx.fillRect(-10, -8, 20, 14);

      // Lens (pointing at runway)
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.ellipse(pap.side === "left" ? 14 : -14, -1, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lens glass reflection
      ctx.fillStyle = "rgba(100, 150, 200, 0.4)";
      ctx.beginPath();
      ctx.ellipse(pap.side === "left" ? 14 : -14, -1, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flash unit on top of camera
      ctx.fillStyle = isFlashing ? "#fff" : "#333";
      ctx.fillRect(-4, -14, 8, 6);

      // Flash indicator light
      if (isFlashing) {
        ctx.fillStyle = "#ff4444";
      } else {
        const readyPulse = Math.sin(frameCountRef.current * 0.1 + pap.x) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(0, 255, 0, ${readyPulse * 0.8})`;
      }
      ctx.beginPath();
      ctx.arc(0, -11, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Flash glow when taking photo
      if (isFlashing) {
        const flashIntensity = (pap.flashCooldown - 50) / 10;
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(flashIntensity * 0.5, 0.8)})`;
        ctx.beginPath();
        ctx.arc(pap.x, pap.y - 10, 20, 0, Math.PI * 2);
        ctx.fill();
      }

      // Some paparazzi have phones too (for social media)
      if (Math.abs(pap.x - CANVAS_WIDTH / 2) > 300) {
        ctx.fillStyle = "#333";
        ctx.fillRect(pap.x + (pap.side === "left" ? -18 : 6), pap.y + 10, 12, 20);
        // Phone screen glow
        ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
        ctx.fillRect(pap.x + (pap.side === "left" ? -17 : 7), pap.y + 12, 10, 16);
      }
    }

    // Media pit zone indicator when active
    if (mediaPitActiveRef.current) {
      const pulse = Math.sin(frameCountRef.current * 0.15) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(255, 215, 0, ${pulse * 0.5})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(50, 100);
      ctx.lineTo(CANVAS_WIDTH - 50, 100);
      ctx.stroke();
      ctx.setLineDash([]);

      // "MEDIA PIT" text
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("📸 MEDIA PIT 📸", CANVAS_WIDTH / 2, 90);
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

    // Skin tone - fair porcelain
    const skinBase = "#fce4d6";
    const skinShadow = "#f0c9b8";
    const skinHighlight = "#fff5f0";

    // Blonde hair colors
    const hairBase = "#d4a853";
    const hairHighlight = "#f0d78c";
    const hairShadow = "#b8923d";

    // Walking animation values (more elegant, slower)
    const walkCycle = frame;
    const hipSway = Math.sin(walkCycle) * 2.5;
    const shoulderSway = Math.sin(walkCycle + Math.PI) * 1.5;
    const legSwing = Math.sin(walkCycle) * 10;
    const armSwing = Math.sin(walkCycle) * 6;
    const bobHeight = Math.abs(Math.sin(walkCycle * 2)) * 2;
    const hairFlow = Math.sin(walkCycle * 0.8) * 3;

    // Slight rotation for supermodel sass
    ctx.rotate(hipSway * 0.012);
    ctx.translate(0, -bobHeight);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 98 + bobHeight, 28, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Back leg with realistic shading
    const backLegX = -5 - legSwing * 0.25;
    ctx.save();
    ctx.translate(backLegX, 58);
    ctx.rotate(legSwing * 0.025);
    // Thigh with gradient
    const legGrad = ctx.createLinearGradient(-6, 0, 6, 0);
    legGrad.addColorStop(0, skinShadow);
    legGrad.addColorStop(0.5, skinBase);
    legGrad.addColorStop(1, skinShadow);
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-5, 12, -4, 28);
    ctx.quadraticCurveTo(-3, 32, 0, 32);
    ctx.quadraticCurveTo(3, 32, 4, 28);
    ctx.quadraticCurveTo(5, 12, 4, 0);
    ctx.closePath();
    ctx.fill();
    // Stiletto heel
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.moveTo(-4, 32);
    ctx.lineTo(6, 32);
    ctx.lineTo(5, 36);
    ctx.lineTo(1, 36);
    ctx.lineTo(0, 46);
    ctx.lineTo(-1, 36);
    ctx.lineTo(-4, 36);
    ctx.closePath();
    ctx.fill();
    // Heel shine
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-3, 33, 2, 2);
    ctx.restore();

    // Elegant cocktail dress
    const dressGrad = ctx.createLinearGradient(-25, 18, 25, 88);
    dressGrad.addColorStop(0, accent);
    dressGrad.addColorStop(0.3, shadeColor(accent, 10));
    dressGrad.addColorStop(0.7, accent);
    dressGrad.addColorStop(1, shadeColor(accent, -35));

    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-10 + hipSway * 0.5, 18);
    ctx.quadraticCurveTo(-16 + hipSway * 0.3, 32, -20 + hipSway * 0.2, 52);
    ctx.quadraticCurveTo(-23, 68, -18 + legSwing * 0.15, 88);
    ctx.lineTo(18 - legSwing * 0.15, 88);
    ctx.quadraticCurveTo(23, 68, 20 - hipSway * 0.2, 52);
    ctx.quadraticCurveTo(16 - hipSway * 0.3, 32, 10 - hipSway * 0.5, 18);
    ctx.closePath();
    ctx.fill();

    // Dress fabric shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(-4, 22);
    ctx.quadraticCurveTo(-8, 42, -6, 68);
    ctx.lineTo(0, 68);
    ctx.quadraticCurveTo(1, 42, 0, 22);
    ctx.closePath();
    ctx.fill();

    // Front leg
    const frontLegX = 5 + legSwing * 0.25;
    ctx.save();
    ctx.translate(frontLegX, 58);
    ctx.rotate(-legSwing * 0.025);
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(-5, 12, -4, 28);
    ctx.quadraticCurveTo(-3, 32, 0, 32);
    ctx.quadraticCurveTo(3, 32, 4, 28);
    ctx.quadraticCurveTo(5, 12, 4, 0);
    ctx.closePath();
    ctx.fill();
    // Stiletto
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.moveTo(-4, 32);
    ctx.lineTo(6, 32);
    ctx.lineTo(5, 36);
    ctx.lineTo(1, 36);
    ctx.lineTo(0, 46);
    ctx.lineTo(-1, 36);
    ctx.lineTo(-4, 36);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-3, 33, 2, 2);
    ctx.restore();

    // Torso with realistic shaping
    const torsoGrad = ctx.createLinearGradient(-12, 0, 12, 0);
    torsoGrad.addColorStop(0, skinShadow);
    torsoGrad.addColorStop(0.3, skinBase);
    torsoGrad.addColorStop(0.7, skinBase);
    torsoGrad.addColorStop(1, skinShadow);
    ctx.fillStyle = torsoGrad;
    ctx.beginPath();
    ctx.moveTo(-9 + shoulderSway, -2);
    ctx.quadraticCurveTo(-11, 6, -9, 20);
    ctx.lineTo(9, 20);
    ctx.quadraticCurveTo(11, 6, 9 + shoulderSway, -2);
    ctx.closePath();
    ctx.fill();

    // Elegant neckline
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-7, 16);
    ctx.quadraticCurveTo(0, 22, 7, 16);
    ctx.lineTo(9, 20);
    ctx.quadraticCurveTo(0, 28, -9, 20);
    ctx.closePath();
    ctx.fill();

    // Back arm
    ctx.save();
    ctx.translate(-9 + shoulderSway, 3);
    ctx.rotate(armSwing * 0.035 + 0.08);
    const armGrad = ctx.createLinearGradient(-3, 0, 3, 0);
    armGrad.addColorStop(0, skinShadow);
    armGrad.addColorStop(0.5, skinBase);
    armGrad.addColorStop(1, skinShadow);
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-3, 10, -2, 24);
    ctx.lineTo(2, 24);
    ctx.quadraticCurveTo(3, 10, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Front arm
    ctx.save();
    ctx.translate(9 + shoulderSway, 3);
    ctx.rotate(-armSwing * 0.035 - 0.08);
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-3, 10, -2, 24);
    ctx.lineTo(2, 24);
    ctx.quadraticCurveTo(3, 10, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Elegant neck
    ctx.fillStyle = skinBase;
    ctx.beginPath();
    ctx.moveTo(-3, -10);
    ctx.quadraticCurveTo(-4, -4, -3, 0);
    ctx.lineTo(3, 0);
    ctx.quadraticCurveTo(4, -4, 3, -10);
    ctx.closePath();
    ctx.fill();

    // Head - more oval, model proportions
    const headGrad = ctx.createRadialGradient(-2, -20, 0, 0, -18, 18);
    headGrad.addColorStop(0, skinHighlight);
    headGrad.addColorStop(0.5, skinBase);
    headGrad.addColorStop(1, skinShadow);
    ctx.beginPath();
    ctx.ellipse(0, -20, 11, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();

    // Blonde hair - voluminous flowing
    // Hair base layer
    ctx.fillStyle = hairBase;
    ctx.beginPath();
    ctx.ellipse(0, -24, 14, 11, 0, Math.PI, 0);
    ctx.fill();

    // Left side hair - long flowing
    ctx.beginPath();
    ctx.moveTo(-14, -20);
    ctx.quadraticCurveTo(-18, -5, -16 + hairFlow * 0.4, 20);
    ctx.quadraticCurveTo(-15, 35, -10 + hairFlow * 0.3, 40);
    ctx.quadraticCurveTo(-8, 35, -8 + hairFlow * 0.2, 25);
    ctx.quadraticCurveTo(-10, 5, -12, -18);
    ctx.closePath();
    ctx.fill();

    // Right side hair
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.quadraticCurveTo(18, -5, 16 - hairFlow * 0.4, 20);
    ctx.quadraticCurveTo(15, 35, 10 - hairFlow * 0.3, 40);
    ctx.quadraticCurveTo(8, 35, 8 - hairFlow * 0.2, 25);
    ctx.quadraticCurveTo(10, 5, 12, -18);
    ctx.closePath();
    ctx.fill();

    // Hair highlights
    ctx.fillStyle = hairHighlight;
    ctx.beginPath();
    ctx.ellipse(-5, -28, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-12, -18);
    ctx.quadraticCurveTo(-14, 0, -13 + hairFlow * 0.3, 15);
    ctx.quadraticCurveTo(-11, 10, -10, 0);
    ctx.quadraticCurveTo(-10, -10, -11, -16);
    ctx.closePath();
    ctx.fill();

    // Hair shadow/depth
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.moveTo(10, -18);
    ctx.quadraticCurveTo(14, 0, 12 - hairFlow * 0.2, 20);
    ctx.quadraticCurveTo(10, 15, 9, 5);
    ctx.quadraticCurveTo(9, -5, 10, -16);
    ctx.closePath();
    ctx.fill();

    // Face features - more detailed
    // Cheekbones highlight
    ctx.fillStyle = "rgba(255, 200, 180, 0.3)";
    ctx.beginPath();
    ctx.ellipse(-6, -15, 3, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -15, 3, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - almond shaped with detail
    // Eye whites
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-4, -19, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -19, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris - blue/green
    ctx.fillStyle = "#4a90a4";
    ctx.beginPath();
    ctx.arc(-4, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -19, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-4, -19, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -19, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4.5, -19.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.5, -19.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eyeliner/lashes
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-7, -19);
    ctx.quadraticCurveTo(-4, -21, -1, -19);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -19);
    ctx.quadraticCurveTo(4, -21, 1, -19);
    ctx.stroke();

    // Eyebrows - blonde, groomed
    ctx.strokeStyle = "#c9a040";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, -23);
    ctx.quadraticCurveTo(-4, -24.5, -1, -23);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -23);
    ctx.quadraticCurveTo(4, -24.5, 1, -23);
    ctx.stroke();

    // Nose - delicate
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(0, -13);
    ctx.stroke();
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(0, -12, 2, 1, 0, 0, Math.PI);
    ctx.fill();

    // Lips - full, glossy
    ctx.fillStyle = "#c45a5a";
    ctx.beginPath();
    ctx.moveTo(-4, -8);
    ctx.quadraticCurveTo(-2, -10, 0, -9);
    ctx.quadraticCurveTo(2, -10, 4, -8);
    ctx.quadraticCurveTo(2, -6, 0, -6.5);
    ctx.quadraticCurveTo(-2, -6, -4, -8);
    ctx.fill();
    // Lip highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, -8.5, 1.5, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond earrings
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-11, -16);
    ctx.lineTo(-10, -14);
    ctx.lineTo(-11, -12);
    ctx.lineTo(-12, -14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(11, -16);
    ctx.lineTo(12, -14);
    ctx.lineTo(11, -12);
    ctx.lineTo(10, -14);
    ctx.closePath();
    ctx.fill();
    // Earring sparkle
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-11, -14.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(11, -14.5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Designer clutch bag
    ctx.fillStyle = shadeColor(accent, -45);
    ctx.save();
    ctx.translate(13 + shoulderSway, 26);
    ctx.rotate(-armSwing * 0.015);
    ctx.beginPath();
    ctx.roundRect(-7, -4, 14, 10, 2);
    ctx.fill();
    // Gold clasp
    ctx.fillStyle = "#d4af37";
    ctx.beginPath();
    ctx.roundRect(-3, 0, 6, 3, 1);
    ctx.fill();
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

    // Intense camera flashes from media pit
    const flashCount = Math.floor(Math.random() * 6) + 4;
    for (let i = 0; i < flashCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const flashX = CANVAS_WIDTH / 2 + side * (80 + Math.random() * 200);
      const flashY = 280 + Math.random() * 150;
      const flashSize = 30 + Math.random() * 40;

      // Main flash
      const flashGrad = ctx.createRadialGradient(flashX, flashY, 0, flashX, flashY, flashSize);
      flashGrad.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      flashGrad.addColorStop(0.2, "rgba(255, 255, 240, 0.6)");
      flashGrad.addColorStop(0.5, "rgba(255, 250, 200, 0.3)");
      flashGrad.addColorStop(1, "transparent");
      ctx.fillStyle = flashGrad;
      ctx.fillRect(flashX - flashSize * 1.5, flashY - flashSize * 1.5, flashSize * 3, flashSize * 3);

      // Some flashes have lens flare
      if (Math.random() > 0.6) {
        ctx.fillStyle = "rgba(255, 255, 200, 0.25)";
        ctx.fillRect(flashX - 60, flashY - 1, 120, 2);
        ctx.fillRect(flashX - 1, flashY - 40, 2, 80);
      }
    }

    // Draw paparazzi silhouettes at bottom
    for (let i = 0; i < 12; i++) {
      const papX = 40 + i * 65;
      const papY = CANVAS_HEIGHT - 60;
      const isFlashing = Math.random() > 0.7;

      // Photographer body
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(papX - 12, papY - 10, 24, 40);

      // Head
      ctx.beginPath();
      ctx.arc(papX, papY - 18, 10, 0, Math.PI * 2);
      ctx.fill();

      // Camera
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(papX - 8, papY, 20, 14);
      ctx.beginPath();
      ctx.arc(papX + 4, papY + 7, 6, 0, Math.PI * 2);
      ctx.fillStyle = isFlashing ? "#fff" : "#333";
      ctx.fill();

      // Flash on camera
      if (isFlashing) {
        ctx.fillStyle = "#fff";
        ctx.fillRect(papX - 4, papY - 8, 8, 6);

        // Flash effect
        const flashGrad = ctx.createRadialGradient(papX, papY, 0, papX, papY, 35);
        flashGrad.addColorStop(0, "rgba(255, 255, 255, 0.7)");
        flashGrad.addColorStop(1, "transparent");
        ctx.fillStyle = flashGrad;
        ctx.fillRect(papX - 40, papY - 40, 80, 80);
      }
    }

    // Screen flash overlay for dramatic effect
    const overallFlash = Math.random() * 0.08;
    ctx.fillStyle = `rgba(255, 255, 255, ${overallFlash})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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

  }

  function drawModelPose(ctx: CanvasRenderingContext2D, x: number, y: number, posePhase: number, accent: string) {
    ctx.save();
    ctx.translate(x, y);

    // Skin tones - fair porcelain (matching drawModel)
    const skinBase = "#fce4d6";
    const skinShadow = "#f0c9b8";
    const skinHighlight = "#fff5f0";

    // Blonde hair colors
    const hairBase = "#d4a853";
    const hairHighlight = "#f0d78c";
    const hairShadow = "#b8923d";

    // Dynamic pose based on phase
    const poseAngle = Math.sin(posePhase * Math.PI * 2) * 0.1;
    ctx.rotate(poseAngle);

    // Shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 95, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs in pose stance - with gradient
    const legGrad = ctx.createLinearGradient(-6, 0, 6, 0);
    legGrad.addColorStop(0, skinShadow);
    legGrad.addColorStop(0.5, skinBase);
    legGrad.addColorStop(1, skinShadow);

    // Back leg
    ctx.save();
    ctx.translate(-8, 55);
    ctx.rotate(-0.15);
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 32);
    ctx.lineTo(4, 32);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    // Stiletto heel
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.moveTo(-5, 32);
    ctx.lineTo(8, 32);
    ctx.lineTo(7, 37);
    ctx.lineTo(2, 37);
    ctx.lineTo(0, 46);
    ctx.lineTo(-2, 37);
    ctx.lineTo(-5, 37);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-4, 33, 2, 2);
    ctx.restore();

    // Dress with gradient
    const dressGrad = ctx.createLinearGradient(-25, 20, 25, 85);
    dressGrad.addColorStop(0, accent);
    dressGrad.addColorStop(0.3, shadeColor(accent, 10));
    dressGrad.addColorStop(0.7, accent);
    dressGrad.addColorStop(1, shadeColor(accent, -35));
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-12, 20);
    ctx.quadraticCurveTo(-20, 40, -25, 85);
    ctx.lineTo(22, 85);
    ctx.quadraticCurveTo(18, 40, 12, 20);
    ctx.closePath();
    ctx.fill();

    // Dress shine
    ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
    ctx.beginPath();
    ctx.moveTo(-4, 22);
    ctx.quadraticCurveTo(-8, 42, -6, 68);
    ctx.lineTo(0, 68);
    ctx.quadraticCurveTo(1, 42, 0, 22);
    ctx.closePath();
    ctx.fill();

    // Front leg
    ctx.save();
    ctx.translate(6, 55);
    ctx.rotate(0.1);
    ctx.fillStyle = legGrad;
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.quadraticCurveTo(-6, 15, -4, 30);
    ctx.lineTo(4, 30);
    ctx.quadraticCurveTo(6, 15, 5, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.beginPath();
    ctx.moveTo(-5, 30);
    ctx.lineTo(8, 30);
    ctx.lineTo(7, 35);
    ctx.lineTo(2, 35);
    ctx.lineTo(0, 44);
    ctx.lineTo(-2, 35);
    ctx.lineTo(-5, 35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(-4, 31, 2, 2);
    ctx.restore();

    // Torso with gradient
    const torsoGrad = ctx.createLinearGradient(-12, 0, 12, 0);
    torsoGrad.addColorStop(0, skinShadow);
    torsoGrad.addColorStop(0.3, skinBase);
    torsoGrad.addColorStop(0.7, skinBase);
    torsoGrad.addColorStop(1, skinShadow);
    ctx.fillStyle = torsoGrad;
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

    // Arms with gradient
    const armGrad = ctx.createLinearGradient(-3, 0, 3, 0);
    armGrad.addColorStop(0, skinShadow);
    armGrad.addColorStop(0.5, skinBase);
    armGrad.addColorStop(1, skinShadow);

    // Left arm on hip
    ctx.save();
    ctx.translate(-10, 8);
    ctx.rotate(0.8);
    ctx.fillStyle = armGrad;
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
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.quadraticCurveTo(-4, 12, -3, 28);
    ctx.lineTo(2, 28);
    ctx.quadraticCurveTo(3, 12, 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Neck
    ctx.fillStyle = skinBase;
    ctx.fillRect(-4, -8, 8, 10);

    // Head tilted
    ctx.save();
    ctx.rotate(0.1);

    // Head with gradient
    const headGrad = ctx.createRadialGradient(-2, -18, 0, 0, -16, 16);
    headGrad.addColorStop(0, skinHighlight);
    headGrad.addColorStop(0.5, skinBase);
    headGrad.addColorStop(1, skinShadow);
    ctx.beginPath();
    ctx.ellipse(0, -18, 12, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = headGrad;
    ctx.fill();

    // Blonde hair - voluminous
    ctx.fillStyle = hairBase;
    ctx.beginPath();
    ctx.ellipse(0, -22, 14, 10, 0, Math.PI, 0);
    ctx.fill();

    // Left flowing hair
    ctx.beginPath();
    ctx.moveTo(-14, -18);
    ctx.quadraticCurveTo(-17, 0, -15, 25);
    ctx.quadraticCurveTo(-13, 30, -9, 25);
    ctx.quadraticCurveTo(-11, 5, -12, -15);
    ctx.closePath();
    ctx.fill();

    // Right flowing hair
    ctx.beginPath();
    ctx.moveTo(14, -18);
    ctx.quadraticCurveTo(17, 0, 15, 25);
    ctx.quadraticCurveTo(13, 30, 9, 25);
    ctx.quadraticCurveTo(11, 5, 12, -15);
    ctx.closePath();
    ctx.fill();

    // Hair highlights
    ctx.fillStyle = hairHighlight;
    ctx.beginPath();
    ctx.ellipse(-5, -26, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Hair shadow/depth
    ctx.fillStyle = hairShadow;
    ctx.beginPath();
    ctx.moveTo(10, -16);
    ctx.quadraticCurveTo(14, 0, 12, 18);
    ctx.quadraticCurveTo(10, 12, 9, 5);
    ctx.quadraticCurveTo(9, -5, 10, -14);
    ctx.closePath();
    ctx.fill();

    // Cheekbones highlight
    ctx.fillStyle = "rgba(255, 200, 180, 0.3)";
    ctx.beginPath();
    ctx.ellipse(-6, -14, 3, 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -14, 3, 2, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes - almond shaped with detail
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(-4, -17, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4, -17, 3, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris - blue/green
    ctx.fillStyle = "#4a90a4";
    ctx.beginPath();
    ctx.arc(-4, -17, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -17, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(-4, -17, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, -17, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlight
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4.5, -17.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(3.5, -17.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eyeliner/lashes
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-7, -17);
    ctx.quadraticCurveTo(-4, -19, -1, -17);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -17);
    ctx.quadraticCurveTo(4, -19, 1, -17);
    ctx.stroke();

    // Blonde eyebrows
    ctx.strokeStyle = "#c9a040";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7, -21);
    ctx.quadraticCurveTo(-4, -22.5, -1, -21);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(7, -21);
    ctx.quadraticCurveTo(4, -22.5, 1, -21);
    ctx.stroke();

    // Nose
    ctx.strokeStyle = skinShadow;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, -11);
    ctx.stroke();
    ctx.fillStyle = skinShadow;
    ctx.beginPath();
    ctx.ellipse(0, -10, 2, 1, 0, 0, Math.PI);
    ctx.fill();

    // Lips - full, glossy
    ctx.fillStyle = "#c45a5a";
    ctx.beginPath();
    ctx.moveTo(-4, -6);
    ctx.quadraticCurveTo(-2, -8, 0, -7);
    ctx.quadraticCurveTo(2, -8, 4, -6);
    ctx.quadraticCurveTo(2, -4, 0, -4.5);
    ctx.quadraticCurveTo(-2, -4, -4, -6);
    ctx.fill();
    // Lip highlight
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, -6.5, 1.5, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond earrings
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(-11, -12);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-13, -12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -14);
    ctx.lineTo(13, -12);
    ctx.lineTo(12, -10);
    ctx.lineTo(11, -12);
    ctx.closePath();
    ctx.fill();
    // Earring sparkle
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.arc(-12, -12.5, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, -12.5, 0.5, 0, Math.PI * 2);
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
                className="w-full h-auto touch-none"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />

              {/* In-Game HUD - shown during walking phase */}
              {gamePhase === "walking" && (
                <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none">
                  <div className="flex justify-between items-start">
                    {/* Walk Score */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-400">Walk Score</p>
                      <p className={`text-xl font-bold ${walkScoreRef.current >= 80 ? 'text-green-400' : walkScoreRef.current >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {walkScoreRef.current}
                      </p>
                    </div>

                    {/* Combo Counter */}
                    {comboRef.current > 1 && (
                      <div className="bg-gradient-to-r from-pink-500/80 to-violet-500/80 backdrop-blur-sm rounded-lg px-4 py-2 animate-pulse">
                        <p className="text-xs text-white/80">COMBO</p>
                        <p className="text-2xl font-bold text-white">{comboRef.current}x</p>
                      </div>
                    )}

                    {/* Gems Collected */}
                    <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex items-center gap-2">
                      <Gem className="h-4 w-4 text-cyan-400" />
                      <span className="text-xl font-bold text-cyan-400">{gemsRef.current}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 bg-black/40 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-100"
                      style={{ width: `${Math.min(100, (distanceRef.current / RUNWAY_LENGTH) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

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
                  <div className="bg-black/50 rounded-full p-6 animate-pulse">
                    <Play className="h-16 w-16 text-white" />
                  </div>
                  <p className="absolute bottom-8 text-white/60 text-sm">Tap to Start • Swipe to Move • Tap for Beat</p>
                </div>
              )}

              {/* Mobile Controls - shown during walking/posing on mobile */}
              {(gamePhase === "walking" || gamePhase === "posing") && (
                <div className="absolute bottom-0 left-0 right-0 p-4 md:hidden">
                  <div className="flex justify-between items-center gap-4">
                    {/* Left Button */}
                    <button
                      onTouchStart={(e) => { e.preventDefault(); handleMobileLeft(); }}
                      className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-white/40 transition-colors border border-white/30"
                    >
                      <span className="text-2xl text-white">←</span>
                    </button>

                    {/* Center - Up/Beat button */}
                    <button
                      onTouchStart={(e) => { e.preventDefault(); handleMobileUp(); }}
                      className="w-20 h-20 bg-gradient-to-br from-pink-500/60 to-violet-500/60 backdrop-blur-sm rounded-full flex items-center justify-center active:from-pink-500 active:to-violet-500 transition-all border border-white/30 shadow-lg"
                    >
                      <span className="text-2xl text-white">{gamePhase === "walking" ? "↑" : "↑"}</span>
                    </button>

                    {/* Right Button */}
                    <button
                      onTouchStart={(e) => { e.preventDefault(); handleMobileRight(); }}
                      className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-white/40 transition-colors border border-white/30"
                    >
                      <span className="text-2xl text-white">→</span>
                    </button>
                  </div>

                  {/* Down button for posing */}
                  {gamePhase === "posing" && (
                    <div className="flex justify-center mt-3">
                      <button
                        onTouchStart={(e) => { e.preventDefault(); handleMobileDown(); }}
                        className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center active:bg-white/40 transition-colors border border-white/30"
                      >
                        <span className="text-2xl text-white">↓</span>
                      </button>
                    </div>
                  )}
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
            <CardContent className="space-y-3 text-sm">
              {/* Keyboard Controls */}
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Keyboard</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">A/D</Badge>
                    <Badge variant="outline" className="text-xs">←/→</Badge>
                    <span className="text-muted-foreground">Dodge</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">W</Badge>
                    <Badge variant="outline" className="text-xs">↑</Badge>
                    <Badge variant="outline" className="text-xs">SPACE</Badge>
                    <span className="text-muted-foreground">Beat</span>
                  </div>
                </div>
              </div>
              {/* Mobile Controls */}
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Mobile</p>
                <div className="space-y-1.5">
                  <p className="text-muted-foreground">• Swipe left/right to dodge</p>
                  <p className="text-muted-foreground">• Tap anywhere for beat</p>
                  <p className="text-muted-foreground">• Use on-screen buttons</p>
                </div>
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
