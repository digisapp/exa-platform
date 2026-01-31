"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Text,
  Sparkles,
  Float,
  MeshReflectorMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  RotateCcw,
  Gem,
  Trophy,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";

// Game constants
const RUNWAY_LENGTH = 50;
const RUNWAY_WIDTH = 4;
const LANE_COUNT = 3;
const LANE_WIDTH = RUNWAY_WIDTH / LANE_COUNT;
const WALK_SPEED = 0.08;

// Game state types
type GamePhase = "idle" | "walking" | "posing" | "results";

interface GameState {
  phase: GamePhase;
  distance: number;
  lane: number;
  targetLane: number;
  walkScore: number;
  gemsCollected: number;
  combo: number;
  beatHits: number;
}

interface BeatMarker {
  id: number;
  z: number;
  hit: boolean;
  lane: number;
}

interface GemObject {
  id: number;
  z: number;
  lane: number;
  collected: boolean;
}

// Model character component
function ModelCharacter({
  position,
  walkFrame,
  isWalking,
}: {
  position: [number, number, number];
  walkFrame: number;
  isWalking: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Simple walk animation - bob up and down, slight rotation
  const bobHeight = isWalking ? Math.sin(walkFrame * 0.3) * 0.05 : 0;
  const hipSway = isWalking ? Math.sin(walkFrame * 0.15) * 0.03 : 0;

  return (
    <group ref={groupRef} position={[position[0], position[1] + bobHeight, position[2]]}>
      {/* Body */}
      <mesh position={[0, 0.9, 0]} rotation={[0, hipSway, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#fcd9d0" />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 1.6, -0.05]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color="#2a1810" />
      </mesh>

      {/* Left leg */}
      <mesh
        position={[-0.08, 0.3, isWalking ? Math.sin(walkFrame * 0.3) * 0.1 : 0]}
        rotation={[isWalking ? Math.sin(walkFrame * 0.3) * 0.3 : 0, 0, 0]}
      >
        <capsuleGeometry args={[0.05, 0.4, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Right leg */}
      <mesh
        position={[0.08, 0.3, isWalking ? -Math.sin(walkFrame * 0.3) * 0.1 : 0]}
        rotation={[isWalking ? -Math.sin(walkFrame * 0.3) * 0.3 : 0, 0, 0]}
      >
        <capsuleGeometry args={[0.05, 0.4, 8, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* High heels */}
      <mesh position={[-0.08, 0.05, isWalking ? Math.sin(walkFrame * 0.3) * 0.1 : 0]}>
        <boxGeometry args={[0.06, 0.1, 0.12]} />
        <meshStandardMaterial color="#ec4899" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.08, 0.05, isWalking ? -Math.sin(walkFrame * 0.3) * 0.1 : 0]}>
        <boxGeometry args={[0.06, 0.1, 0.12]} />
        <meshStandardMaterial color="#ec4899" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Arms */}
      <mesh
        position={[-0.25, 0.95, 0]}
        rotation={[0, 0, isWalking ? Math.sin(walkFrame * 0.3) * 0.2 + 0.2 : 0.2]}
      >
        <capsuleGeometry args={[0.03, 0.3, 8, 16]} />
        <meshStandardMaterial color="#fcd9d0" />
      </mesh>
      <mesh
        position={[0.25, 0.95, 0]}
        rotation={[0, 0, isWalking ? -Math.sin(walkFrame * 0.3) * 0.2 - 0.2 : -0.2]}
      >
        <capsuleGeometry args={[0.03, 0.3, 8, 16]} />
        <meshStandardMaterial color="#fcd9d0" />
      </mesh>
    </group>
  );
}

// Runway floor component
function Runway() {
  return (
    <group>
      {/* Main runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -RUNWAY_LENGTH / 2]}>
        <planeGeometry args={[RUNWAY_WIDTH, RUNWAY_LENGTH]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={1}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#050505"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      {/* Lane dividers */}
      {[-LANE_WIDTH / 2, LANE_WIDTH / 2].map((x, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.01, -RUNWAY_LENGTH / 2]}
        >
          <planeGeometry args={[0.02, RUNWAY_LENGTH]} />
          <meshBasicMaterial color="#333" />
        </mesh>
      ))}

      {/* Runway edge lights */}
      {Array.from({ length: 20 }).map((_, i) => (
        <group key={i}>
          <pointLight
            position={[-RUNWAY_WIDTH / 2 - 0.3, 0.1, -i * 2.5]}
            color="#ec4899"
            intensity={0.5}
            distance={3}
          />
          <pointLight
            position={[RUNWAY_WIDTH / 2 + 0.3, 0.1, -i * 2.5]}
            color="#ec4899"
            intensity={0.5}
            distance={3}
          />
          <mesh position={[-RUNWAY_WIDTH / 2 - 0.3, 0.05, -i * 2.5]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
          <mesh position={[RUNWAY_WIDTH / 2 + 0.3, 0.05, -i * 2.5]}>
            <sphereGeometry args={[0.05, 8, 8]} />
            <meshBasicMaterial color="#ec4899" />
          </mesh>
        </group>
      ))}

      {/* End stage */}
      <mesh position={[0, 0.1, -RUNWAY_LENGTH - 2]}>
        <cylinderGeometry args={[3, 3, 0.2, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Beat marker on runway
function BeatMarker({
  position,
  hit,
  active
}: {
  position: [number, number, number];
  hit: boolean;
  active: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && active) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 8) * 0.1);
    }
  });

  if (hit) return null;

  return (
    <mesh ref={meshRef} position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.3, 0.4, 32]} />
      <meshBasicMaterial
        color={active ? "#fbbf24" : "#666"}
        transparent
        opacity={active ? 1 : 0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Collectible gem
function GemMesh({
  position,
  collected
}: {
  position: [number, number, number];
  collected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 2;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  if (collected) return null;

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

// Camera controller that follows the character
function CameraController({
  playerZ,
  isPlaying
}: {
  playerZ: number;
  isPlaying: boolean;
}) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { set } = useThree();

  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current });
    }
  }, [set]);

  useFrame(() => {
    if (isPlaying && cameraRef.current) {
      // Follow behind the player
      const targetZ = playerZ + 5;
      const targetY = 2.5;
      const targetX = 0;

      cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, targetX, 0.05);
      cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, targetY, 0.05);
      cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, targetZ, 0.05);

      // Look at a point ahead of the player
      const lookAtZ = playerZ - 3;
      cameraRef.current.lookAt(0, 1, lookAtZ);
    }
  });

  return <perspectiveCamera ref={cameraRef} position={[0, 3, 5]} fov={60} />;
}

// Paparazzi flash effect
function PaparazziFlashes({ playerZ }: { playerZ: number }) {
  const [flashes, setFlashes] = useState<{ id: number; position: [number, number, number] }[]>([]);

  useEffect(() => {
    if (playerZ < -RUNWAY_LENGTH + 10) {
      const interval = setInterval(() => {
        const side = Math.random() > 0.5 ? 1 : -1;
        setFlashes(prev => [
          ...prev.slice(-5),
          {
            id: Date.now(),
            position: [side * (RUNWAY_WIDTH / 2 + 2), 1.5, playerZ - 5 + Math.random() * 10] as [number, number, number],
          }
        ]);
      }, 300);

      return () => clearInterval(interval);
    }
  }, [playerZ]);

  return (
    <>
      {flashes.map(flash => (
        <pointLight
          key={flash.id}
          position={flash.position}
          color="#ffffff"
          intensity={50}
          distance={10}
        />
      ))}
    </>
  );
}

// Main 3D scene
function GameScene({
  gameState,
  setGameState,
  beatMarkers,
  setBeatMarkers,
  gems,
  setGems,
  walkFrame,
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  beatMarkers: BeatMarker[];
  setBeatMarkers: React.Dispatch<React.SetStateAction<BeatMarker[]>>;
  gems: GemObject[];
  setGems: React.Dispatch<React.SetStateAction<GemObject[]>>;
  walkFrame: number;
}) {
  const playerX = (gameState.lane - 1) * LANE_WIDTH;
  const playerZ = -gameState.distance;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <spotLight
        position={[0, 10, -RUNWAY_LENGTH]}
        angle={0.3}
        penumbra={0.5}
        intensity={2}
        color="#ec4899"
      />

      {/* Sparkle atmosphere */}
      <Sparkles
        count={100}
        scale={[10, 5, RUNWAY_LENGTH]}
        position={[0, 2.5, -RUNWAY_LENGTH / 2]}
        size={2}
        speed={0.5}
        color="#ec4899"
      />

      {/* Runway */}
      <Runway />

      {/* Character */}
      <ModelCharacter
        position={[playerX, 0, playerZ]}
        walkFrame={walkFrame}
        isWalking={gameState.phase === "walking"}
      />

      {/* Beat markers */}
      {beatMarkers.map((marker, i) => {
        const markerX = (marker.lane - 1) * LANE_WIDTH;
        const isActive = Math.abs((-marker.z) - gameState.distance) < 2;
        return (
          <BeatMarker
            key={marker.id}
            position={[markerX, 0.02, -marker.z]}
            hit={marker.hit}
            active={isActive}
          />
        );
      })}

      {/* Gems */}
      {gems.map(gem => {
        const gemX = (gem.lane - 1) * LANE_WIDTH;
        return (
          <GemMesh
            key={gem.id}
            position={[gemX, 0.5, -gem.z]}
            collected={gem.collected}
          />
        );
      })}

      {/* Paparazzi flashes near end */}
      {gameState.phase === "walking" && (
        <PaparazziFlashes playerZ={playerZ} />
      )}

      {/* End stage text */}
      <Text
        position={[0, 2, -RUNWAY_LENGTH - 2]}
        fontSize={0.5}
        color="#ec4899"
        anchorX="center"
        anchorY="middle"
      >
        EXA MODELS
      </Text>

      {/* Camera controller */}
      <CameraController
        playerZ={playerZ}
        isPlaying={gameState.phase === "walking"}
      />

      {/* Environment */}
      <Environment preset="night" />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={["#0a0a0a", 10, 60]} />
    </>
  );
}

// Main component
export default function CatwalkGame3D() {
  const [gameState, setGameState] = useState<GameState>({
    phase: "idle",
    distance: 0,
    lane: 1, // 0, 1, 2 (center start)
    targetLane: 1,
    walkScore: 100,
    gemsCollected: 0,
    combo: 0,
    beatHits: 0,
  });

  const [beatMarkers, setBeatMarkers] = useState<BeatMarker[]>([]);
  const [gems, setGems] = useState<GemObject[]>([]);
  const [walkFrame, setWalkFrame] = useState(0);
  const [gemBalance, setGemBalance] = useState(0);
  const [saving, setSaving] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const lastBeatTimeRef = useRef(0);

  // Initialize game objects
  const initializeGame = useCallback(() => {
    // Create beat markers along the runway
    const markers: BeatMarker[] = [];
    const gemObjects: GemObject[] = [];

    for (let i = 0; i < 15; i++) {
      markers.push({
        id: i,
        z: 5 + i * 3,
        hit: false,
        lane: Math.floor(Math.random() * 3),
      });
    }

    // Create gems
    for (let i = 0; i < 10; i++) {
      gemObjects.push({
        id: i,
        z: 7 + i * 4.5,
        lane: Math.floor(Math.random() * 3),
        collected: false,
      });
    }

    setBeatMarkers(markers);
    setGems(gemObjects);
  }, []);

  // Start game
  const startGame = useCallback(() => {
    initializeGame();
    setGameState({
      phase: "walking",
      distance: 0,
      lane: 1,
      targetLane: 1,
      walkScore: 100,
      gemsCollected: 0,
      combo: 0,
      beatHits: 0,
    });
    setWalkFrame(0);
  }, [initializeGame]);

  // Game loop
  useEffect(() => {
    if (gameState.phase !== "walking") return;

    const gameLoop = () => {
      setWalkFrame(prev => prev + 1);

      setGameState(prev => {
        // Move forward
        const newDistance = prev.distance + WALK_SPEED;

        // Check if reached end
        if (newDistance >= RUNWAY_LENGTH) {
          return { ...prev, phase: "results", distance: RUNWAY_LENGTH };
        }

        // Smooth lane transition
        let newLane = prev.lane;
        if (prev.lane !== prev.targetLane) {
          const laneSpeed = 0.15;
          if (prev.lane < prev.targetLane) {
            newLane = Math.min(prev.lane + laneSpeed, prev.targetLane);
          } else {
            newLane = Math.max(prev.lane - laneSpeed, prev.targetLane);
          }
        }

        return { ...prev, distance: newDistance, lane: newLane };
      });

      // Check gem collection
      setGems(prevGems => {
        return prevGems.map(gem => {
          if (gem.collected) return gem;

          const gemDistance = gem.z;
          if (
            Math.abs(gemDistance - gameState.distance) < 0.5 &&
            Math.round(gameState.lane) === gem.lane
          ) {
            setGameState(prev => ({
              ...prev,
              gemsCollected: prev.gemsCollected + 1,
            }));
            return { ...gem, collected: true };
          }
          return gem;
        });
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.phase, gameState.distance, gameState.lane]);

  // Hit beat function - must be defined before useEffect that uses it
  const hitBeat = useCallback(() => {
    setBeatMarkers(prev => {
      const playerLane = Math.round(gameState.lane);

      return prev.map(marker => {
        if (marker.hit) return marker;

        const distance = Math.abs(marker.z - gameState.distance);
        if (distance < 1.5 && marker.lane === playerLane) {
          // Hit!
          setGameState(s => ({
            ...s,
            combo: s.combo + 1,
            beatHits: s.beatHits + 1,
            walkScore: Math.min(100, s.walkScore + 5),
          }));
          return { ...marker, hit: true };
        }
        return marker;
      });
    });
  }, [gameState.distance, gameState.lane]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== "walking") return;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          setGameState(prev => ({
            ...prev,
            targetLane: Math.max(0, prev.targetLane - 1),
          }));
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setGameState(prev => ({
            ...prev,
            targetLane: Math.min(2, prev.targetLane + 1),
          }));
          break;
        case " ":
        case "ArrowUp":
        case "w":
        case "W":
          hitBeat();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.phase, hitBeat]);

  // Save score
  const saveScore = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/games/catwalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          runwayId: "studio",
          walkScore: gameState.walkScore,
          poseScore: 50, // Simplified for 3D version
          gemsCollected: gameState.gemsCollected,
          perfectWalks: gameState.beatHits,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.newBalance || gemBalance);
      }
    } catch (error) {
      console.error("Failed to save score:", error);
    }
    setSaving(false);
  };

  // Reset game
  const resetGame = () => {
    setGameState({
      phase: "idle",
      distance: 0,
      lane: 1,
      targetLane: 1,
      walkScore: 100,
      gemsCollected: 0,
      combo: 0,
      beatHits: 0,
    });
    setBeatMarkers([]);
    setGems([]);
  };

  // Load gem balance on mount
  useEffect(() => {
    fetch("/api/games/catwalk")
      .then(res => res.json())
      .then(data => {
        if (data.gemBalance) setGemBalance(data.gemBalance);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 gap-1">
            <Gem className="h-3 w-3" />
            {gemBalance}
          </Badge>
          {gameState.phase === "walking" && (
            <>
              <Badge variant="secondary" className="bg-pink-500/20 text-pink-400">
                Score: {gameState.walkScore}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                Combo: {gameState.combo}x
              </Badge>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                Gems: {gameState.gemsCollected}
              </Badge>
            </>
          )}
        </div>

        {gameState.phase === "idle" && (
          <Button onClick={startGame} className="bg-pink-600 hover:bg-pink-700">
            <Play className="h-4 w-4 mr-2" />
            Start Walk
          </Button>
        )}
      </div>

      {/* 3D Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-gray-800" style={{ height: "500px" }}>
        <Canvas
          camera={{ position: [0, 3, 5], fov: 60 }}
          shadows
          gl={{ antialias: true }}
        >
          <GameScene
            gameState={gameState}
            setGameState={setGameState}
            beatMarkers={beatMarkers}
            setBeatMarkers={setBeatMarkers}
            gems={gems}
            setGems={setGems}
            walkFrame={walkFrame}
          />
          {gameState.phase === "idle" && (
            <OrbitControls
              enableZoom={false}
              maxPolarAngle={Math.PI / 2.2}
              minPolarAngle={Math.PI / 4}
            />
          )}
        </Canvas>

        {/* Mobile controls overlay */}
        {gameState.phase === "walking" && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 md:hidden">
            <Button
              size="lg"
              variant="secondary"
              className="h-16 w-16 rounded-full bg-gray-800/80"
              onClick={() => setGameState(prev => ({
                ...prev,
                targetLane: Math.max(0, prev.targetLane - 1),
              }))}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-16 w-16 rounded-full bg-pink-600/80"
              onClick={hitBeat}
            >
              <ChevronUp className="h-8 w-8" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-16 w-16 rounded-full bg-gray-800/80"
              onClick={() => setGameState(prev => ({
                ...prev,
                targetLane: Math.min(2, prev.targetLane + 1),
              }))}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}

        {/* Progress bar */}
        {gameState.phase === "walking" && (
          <div className="absolute top-4 left-4 right-4">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all"
                style={{ width: `${(gameState.distance / RUNWAY_LENGTH) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {gameState.phase === "results" && (
        <Card className="bg-gray-900 border-pink-500/30">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
              <h2 className="text-2xl font-bold text-white">Walk Complete!</h2>

              <div className="grid grid-cols-3 gap-4 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-400">{gameState.walkScore}</p>
                  <p className="text-sm text-gray-400">Walk Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{gameState.gemsCollected}</p>
                  <p className="text-sm text-gray-400">Gems</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{gameState.beatHits}</p>
                  <p className="text-sm text-gray-400">Beat Hits</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={resetGame} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
                <Button
                  onClick={saveScore}
                  className="bg-pink-600 hover:bg-pink-700"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Score"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls info */}
      {gameState.phase === "idle" && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">A/D</kbd>
                <span>Change lanes</span>
              </div>
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">SPACE</kbd>
                <span>Hit the beat</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-cyan-400" />
                <span>Collect gems</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
