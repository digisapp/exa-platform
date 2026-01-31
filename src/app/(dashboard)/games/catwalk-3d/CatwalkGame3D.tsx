"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Text,
  Sparkles,
  Float,
  MeshReflectorMaterial,
  Stars,
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
  Lock,
  Sparkles as SparklesIcon,
} from "lucide-react";

// ============================================
// KARL LAGERFELD INSPIRED GAME CONSTANTS
// ============================================

const RUNWAY_LENGTH = 80; // Good runway length for gameplay
const RUNWAY_WIDTH = 5;
const LANE_COUNT = 3;
const LANE_WIDTH = RUNWAY_WIDTH / LANE_COUNT;

// Progressive speed - starts slow, increases as you progress
const BASE_WALK_SPEED = 0.06; // Starting speed (slow and elegant)
const MAX_WALK_SPEED = 0.15; // Maximum speed near end
const LANE_SWITCH_SPEED = 0.12; // Smooth but responsive lane switching

// Lagerfeld-inspired runway themes
const RUNWAY_THEMES = {
  studio: {
    id: "studio",
    name: "Maison de Couture",
    subtitle: "The Classic Atelier",
    description: "Where every journey begins - the timeless fashion studio",
    unlockCost: 0,
    backgroundColor: "#0a0a0f",
    accentColor: "#ec4899",
    floorColor: "#050505",
    fogColor: "#0a0a0a",
    gemMultiplier: 1,
  },
  supermarket: {
    id: "supermarket",
    name: "Le Supermarché",
    subtitle: "Chanel Shopping Center, 2014",
    description: "The iconic supermarket runway - fashion meets everyday luxury",
    unlockCost: 500,
    backgroundColor: "#0f1520",
    accentColor: "#00ff88",
    floorColor: "#1a1a1a",
    fogColor: "#0a0f0a",
    gemMultiplier: 1.3,
  },
  beach: {
    id: "beach",
    name: "La Plage",
    subtitle: "Chanel Beach, 2019",
    description: "Real sand, real waves - paradise at the Grand Palais",
    unlockCost: 1000,
    backgroundColor: "#0a1525",
    accentColor: "#00bfff",
    floorColor: "#c2a87d",
    fogColor: "#1a2535",
    gemMultiplier: 1.5,
  },
  airport: {
    id: "airport",
    name: "L'Aéroport",
    subtitle: "Chanel Airlines, 2016",
    description: "First class fashion at 30,000 feet",
    unlockCost: 2000,
    backgroundColor: "#101520",
    accentColor: "#ffd700",
    floorColor: "#2a2a3a",
    fogColor: "#101520",
    gemMultiplier: 1.8,
  },
  space: {
    id: "space",
    name: "L'Espace",
    subtitle: "Chanel Rocket, 2017",
    description: "Fashion's final frontier - a rocket to the stars",
    unlockCost: 3000,
    backgroundColor: "#000008",
    accentColor: "#ff6600",
    floorColor: "#1a1a2e",
    fogColor: "#000010",
    gemMultiplier: 2.0,
  },
  casino: {
    id: "casino",
    name: "Le Casino",
    subtitle: "Haute Couture Jackpot, 2015",
    description: "All bets are on - glamour meets chance",
    unlockCost: 4000,
    backgroundColor: "#150808",
    accentColor: "#ff0040",
    floorColor: "#0a0505",
    fogColor: "#100505",
    gemMultiplier: 2.2,
  },
  forest: {
    id: "forest",
    name: "La Forêt Enchantée",
    subtitle: "Chanel in the Woods, 2018",
    description: "An enchanted forest grows in Paris",
    unlockCost: 5000,
    backgroundColor: "#050a05",
    accentColor: "#88ff88",
    floorColor: "#1a2a1a",
    fogColor: "#0a150a",
    gemMultiplier: 2.5,
  },
  ice: {
    id: "ice",
    name: "Palais de Glace",
    subtitle: "The Iceberg, 2010",
    description: "A frozen palace of crystalline beauty",
    unlockCost: 7500,
    backgroundColor: "#051520",
    accentColor: "#88ffff",
    floorColor: "#203040",
    fogColor: "#0a1a2a",
    gemMultiplier: 3.0,
  },
};

type ThemeId = keyof typeof RUNWAY_THEMES;

// Game state types
type GamePhase = "menu" | "idle" | "walking" | "posing" | "results";

interface GameState {
  phase: GamePhase;
  distance: number;
  lane: number;
  targetLane: number;
  walkScore: number;
  styleScore: number;
  gemsCollected: number;
  combo: number;
  beatHits: number;
  obstaclesAvoided: number;
  perfectPoses: number;
  currentTheme: ThemeId;
}

interface Obstacle {
  id: number;
  z: number;
  lane: number;
  type: "cart" | "luggage" | "wave" | "cards" | "leaves" | "ice";
  hit: boolean;
}

interface PoseStation {
  id: number;
  z: number;
  completed: boolean;
  score: number;
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
  type: "normal" | "gold" | "diamond" | "pearl";
  value: number;
}

interface PowerUp {
  id: number;
  z: number;
  lane: number;
  collected: boolean;
  type: "magnet" | "double" | "shield" | "slow";
}

// ============================================
// FEMALE MODEL CHARACTER - HAUTE COUTURE
// ============================================

function ModelCharacter({
  position,
  walkFrame,
  isWalking,
  isPosing,
  theme,
}: {
  position: [number, number, number];
  walkFrame: number;
  isWalking: boolean;
  isPosing: boolean;
  theme: ThemeId;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const themeData = RUNWAY_THEMES[theme];

  // Elegant runway walk animation
  const bobHeight = isWalking ? Math.sin(walkFrame * 0.2) * 0.025 : 0;
  const hipSway = isWalking ? Math.sin(walkFrame * 0.1) * 0.1 : 0;
  const shoulderSway = isWalking ? -Math.sin(walkFrame * 0.1) * 0.05 : 0;
  const walkCycle = walkFrame * 0.2;

  // Pose animation
  const poseRotation = isPosing ? Math.sin(walkFrame * 0.05) * 0.1 : 0;

  return (
    <group ref={groupRef} position={[position[0], position[1] + bobHeight, position[2]]} rotation={[0, poseRotation, 0]}>
      {/* Spotlight on model */}
      <pointLight position={[0, 2, 0]} color="#ffffff" intensity={2} distance={5} />

      {/* Torso/Dress - elegant fitted silhouette */}
      <group rotation={[0, hipSway, 0]}>
        {/* Upper body */}
        <mesh position={[0, 1.15, 0]}>
          <capsuleGeometry args={[0.13, 0.35, 8, 16]} />
          <meshStandardMaterial color="#0a0a12" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Waist - cinched */}
        <mesh position={[0, 0.88, 0]}>
          <cylinderGeometry args={[0.07, 0.11, 0.12, 16]} />
          <meshStandardMaterial color="#0a0a12" metalness={0.5} roughness={0.5} />
        </mesh>

        {/* Flowing gown */}
        <mesh position={[0, 0.55, 0]}>
          <coneGeometry args={[0.28, 0.7, 24]} />
          <meshStandardMaterial
            color="#0a0a12"
            metalness={0.4}
            roughness={0.6}
          />
        </mesh>

        {/* Gown train */}
        <mesh position={[0, 0.25, -0.15]} rotation={[0.3, 0, 0]}>
          <coneGeometry args={[0.2, 0.4, 16]} />
          <meshStandardMaterial color="#0a0a12" metalness={0.4} roughness={0.6} />
        </mesh>

        {/* Thigh slit detail */}
        <mesh position={[0.12, 0.45, 0.08]} rotation={[0.15, 0, 0.15]}>
          <planeGeometry args={[0.15, 0.4]} />
          <meshStandardMaterial color="#fcd9d0" side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Neck - elegant */}
      <mesh position={[0, 1.42, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.12, 16]} />
        <meshStandardMaterial color="#fcd9d0" />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.58, 0]}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial color="#fcd9d0" />
      </mesh>

      {/* Face - subtle features */}
      <mesh position={[0, 1.56, 0.085]}>
        <sphereGeometry args={[0.018, 8, 8]} />
        <meshStandardMaterial color="#c99090" />
      </mesh>

      {/* Dramatic updo hairstyle */}
      <group position={[0, 1.65, -0.02]}>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#1a0805" />
        </mesh>
        <mesh position={[0, 0.12, -0.02]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#1a0805" />
        </mesh>
        {/* Side swept */}
        <mesh position={[-0.08, -0.02, 0.02]} rotation={[0, 0, 0.3]}>
          <capsuleGeometry args={[0.04, 0.15, 8, 16]} />
          <meshStandardMaterial color="#1a0805" />
        </mesh>
        <mesh position={[0.08, -0.02, 0.02]} rotation={[0, 0, -0.3]}>
          <capsuleGeometry args={[0.04, 0.15, 8, 16]} />
          <meshStandardMaterial color="#1a0805" />
        </mesh>
      </group>

      {/* Left leg - runway strut */}
      <group
        position={[-0.05, 0.32, isWalking ? Math.sin(walkCycle) * 0.18 : 0]}
        rotation={[isWalking ? Math.sin(walkCycle) * 0.45 : 0, 0, 0]}
      >
        <mesh>
          <capsuleGeometry args={[0.042, 0.38, 8, 16]} />
          <meshStandardMaterial color="#fcd9d0" />
        </mesh>
        {/* Stiletto */}
        <mesh position={[0, -0.24, 0.03]}>
          <boxGeometry args={[0.045, 0.1, 0.1]} />
          <meshStandardMaterial color={themeData.accentColor} metalness={0.95} roughness={0.05} />
        </mesh>
        <mesh position={[0, -0.28, -0.025]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.008, 0.1, 8]} />
          <meshStandardMaterial color={themeData.accentColor} metalness={0.95} roughness={0.05} />
        </mesh>
      </group>

      {/* Right leg */}
      <group
        position={[0.05, 0.32, isWalking ? -Math.sin(walkCycle) * 0.18 : 0]}
        rotation={[isWalking ? -Math.sin(walkCycle) * 0.45 : 0, 0, 0]}
      >
        <mesh>
          <capsuleGeometry args={[0.042, 0.38, 8, 16]} />
          <meshStandardMaterial color="#fcd9d0" />
        </mesh>
        <mesh position={[0, -0.24, 0.03]}>
          <boxGeometry args={[0.045, 0.1, 0.1]} />
          <meshStandardMaterial color={themeData.accentColor} metalness={0.95} roughness={0.05} />
        </mesh>
        <mesh position={[0, -0.28, -0.025]} rotation={[0.25, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.008, 0.1, 8]} />
          <meshStandardMaterial color={themeData.accentColor} metalness={0.95} roughness={0.05} />
        </mesh>
      </group>

      {/* Arms with elegant swing */}
      <group rotation={[0, shoulderSway, 0]}>
        <group position={[-0.2, 1.2, 0]} rotation={[isWalking ? -Math.sin(walkCycle) * 0.12 : 0.1, 0, 0.12]}>
          <mesh>
            <capsuleGeometry args={[0.022, 0.24, 8, 16]} />
            <meshStandardMaterial color="#fcd9d0" />
          </mesh>
          <mesh position={[0, -0.2, 0]} rotation={[0.25, 0, 0]}>
            <capsuleGeometry args={[0.02, 0.2, 8, 16]} />
            <meshStandardMaterial color="#fcd9d0" />
          </mesh>
        </group>

        {/* Right arm - signature pose or holding clutch */}
        <group position={[0.2, 1.2, 0]} rotation={[isPosing ? -0.3 : 0.35, 0, isPosing ? -0.5 : -0.12]}>
          <mesh>
            <capsuleGeometry args={[0.022, 0.24, 8, 16]} />
            <meshStandardMaterial color="#fcd9d0" />
          </mesh>
          <mesh position={[0, -0.2, 0.04]} rotation={[-0.6, 0, 0]}>
            <capsuleGeometry args={[0.02, 0.2, 8, 16]} />
            <meshStandardMaterial color="#fcd9d0" />
          </mesh>
          {/* Clutch bag */}
          <mesh position={[0.02, -0.32, 0.08]}>
            <boxGeometry args={[0.18, 0.1, 0.035]} />
            <meshStandardMaterial color={themeData.accentColor} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      </group>

      {/* Statement necklace */}
      <mesh position={[0, 1.32, 0.05]}>
        <torusGeometry args={[0.07, 0.008, 8, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
      {/* Pendant */}
      <mesh position={[0, 1.25, 0.08]}>
        <octahedronGeometry args={[0.02]} />
        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0.05} emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>

      {/* Dramatic earrings */}
      <mesh position={[-0.1, 1.52, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[-0.1, 1.47, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0.1, 1.52, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.08, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
      <mesh position={[0.1, 1.47, 0]}>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
    </group>
  );
}

// ============================================
// THEMED RUNWAY ENVIRONMENTS
// ============================================

function ThemedRunway({ theme }: { theme: ThemeId }) {
  const themeData = RUNWAY_THEMES[theme];

  return (
    <group>
      {/* Main runway floor - simplified for performance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -RUNWAY_LENGTH / 2]}>
        <planeGeometry args={[RUNWAY_WIDTH, RUNWAY_LENGTH]} />
        <meshStandardMaterial
          color={themeData.floorColor}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Runway center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -RUNWAY_LENGTH / 2]}>
        <planeGeometry args={[0.05, RUNWAY_LENGTH]} />
        <meshBasicMaterial color={themeData.accentColor} transparent opacity={0.3} />
      </mesh>

      {/* Lane dividers */}
      {[-LANE_WIDTH / 2, LANE_WIDTH / 2].map((x, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.01, -RUNWAY_LENGTH / 2]}>
          <planeGeometry args={[0.02, RUNWAY_LENGTH]} />
          <meshBasicMaterial color="#333" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Edge lighting - continuous strips */}
      <mesh position={[-RUNWAY_WIDTH / 2 - 0.1, 0.02, -RUNWAY_LENGTH / 2]}>
        <boxGeometry args={[0.08, 0.04, RUNWAY_LENGTH]} />
        <meshStandardMaterial color={themeData.accentColor} emissive={themeData.accentColor} emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[RUNWAY_WIDTH / 2 + 0.1, 0.02, -RUNWAY_LENGTH / 2]}>
        <boxGeometry args={[0.08, 0.04, RUNWAY_LENGTH]} />
        <meshStandardMaterial color={themeData.accentColor} emissive={themeData.accentColor} emissiveIntensity={0.8} />
      </mesh>

      {/* Runway spotlights - spread for 80-unit runway */}
      {Array.from({ length: 5 }).map((_, i) => (
        <pointLight
          key={i}
          position={[0, 6, -i * 18]}
          intensity={2}
          color="#ffffff"
          distance={25}
        />
      ))}

      {/* Theme-specific decorations */}
      <ThemeDecorations theme={theme} />

      {/* End stage platform */}
      <mesh position={[0, 0.15, -RUNWAY_LENGTH - 3]}>
        <cylinderGeometry args={[5, 5, 0.3, 48]} />
        <meshStandardMaterial color="#0a0a12" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Brand logo at end */}
      <Text
        position={[0, 2.5, -RUNWAY_LENGTH - 3]}
        fontSize={0.8}
        color={themeData.accentColor}
        anchorX="center"
        anchorY="middle"
      >
        EXA COUTURE
      </Text>
      <Text
        position={[0, 1.8, -RUNWAY_LENGTH - 3]}
        fontSize={0.25}
        color="#888"
        anchorX="center"
        anchorY="middle"
      >
        {themeData.subtitle}
      </Text>
    </group>
  );
}

// Theme-specific decorations
function ThemeDecorations({ theme }: { theme: ThemeId }) {
  switch (theme) {
    case "supermarket":
      return <SupermarketDecorations />;
    case "beach":
      return <BeachDecorations />;
    case "airport":
      return <AirportDecorations />;
    case "space":
      return <SpaceDecorations />;
    case "casino":
      return <CasinoDecorations />;
    case "forest":
      return <ForestDecorations />;
    case "ice":
      return <IceDecorations />;
    default:
      return <StudioDecorations />;
  }
}

function StudioDecorations() {
  return (
    <group>
      {/* Classic fashion show lights */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i}>
          <mesh position={[-4, 4, -i * 12]}>
            <boxGeometry args={[0.3, 0.3, 0.5]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <spotLight position={[-4, 4, -i * 12]} angle={0.4} intensity={2} color="#ffeedd" target-position={[0, 0, -i * 12]} />
          <mesh position={[4, 4, -i * 12]}>
            <boxGeometry args={[0.3, 0.3, 0.5]} />
            <meshStandardMaterial color="#222" />
          </mesh>
          <spotLight position={[4, 4, -i * 12]} angle={0.4} intensity={2} color="#ffeedd" target-position={[0, 0, -i * 12]} />
        </group>
      ))}
    </group>
  );
}

function SupermarketDecorations() {
  return (
    <group>
      {/* Neon "CHANEL" style signs */}
      {Array.from({ length: 8 }).map((_, i) => (
        <group key={i}>
          {/* Shelf units */}
          <mesh position={[-5, 1.5, -10 - i * 14]}>
            <boxGeometry args={[1, 3, 0.5]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          <mesh position={[5, 1.5, -10 - i * 14]}>
            <boxGeometry args={[1, 3, 0.5]} />
            <meshStandardMaterial color="#333" />
          </mesh>
          {/* Products on shelves */}
          {[0.5, 1, 1.5, 2, 2.5].map((y, j) => (
            <group key={j}>
              <mesh position={[-5, y, -10 - i * 14 + 0.3]}>
                <boxGeometry args={[0.15, 0.2, 0.1]} />
                <meshStandardMaterial color={["#ec4899", "#00ff88", "#ffd700", "#00bfff", "#ff6600"][j]} emissive={["#ec4899", "#00ff88", "#ffd700", "#00bfff", "#ff6600"][j]} emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[5, y, -10 - i * 14 + 0.3]}>
                <boxGeometry args={[0.15, 0.2, 0.1]} />
                <meshStandardMaterial color={["#ec4899", "#00ff88", "#ffd700", "#00bfff", "#ff6600"][j]} emissive={["#ec4899", "#00ff88", "#ffd700", "#00bfff", "#ff6600"][j]} emissiveIntensity={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
      {/* Neon signs */}
      <Text position={[-6, 4, -30]} fontSize={0.5} color="#00ff88" anchorX="center">
        LUXE
      </Text>
      <Text position={[6, 4, -60]} fontSize={0.5} color="#ec4899" anchorX="center">
        BEAUTÉ
      </Text>
    </group>
  );
}

function BeachDecorations() {
  return (
    <group>
      {/* Beach umbrellas */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={i}>
          <mesh position={[-6, 0, -15 - i * 18]}>
            <coneGeometry args={[1.5, 0.3, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#ff6b6b" : "#4ecdc4"} />
          </mesh>
          <mesh position={[-6, 1, -15 - i * 18]}>
            <cylinderGeometry args={[0.05, 0.05, 2, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh position={[6, 0, -20 - i * 18]}>
            <coneGeometry args={[1.5, 0.3, 8]} />
            <meshStandardMaterial color={i % 2 === 0 ? "#4ecdc4" : "#ff6b6b"} />
          </mesh>
        </group>
      ))}
      {/* Wave effect - animated planes */}
      <mesh position={[0, -0.3, -RUNWAY_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, RUNWAY_LENGTH + 20]} />
        <meshStandardMaterial color="#006994" transparent opacity={0.4} />
      </mesh>
      {/* Palm trees */}
      {[-8, 8].map((x, i) => (
        <group key={i} position={[x, 0, -RUNWAY_LENGTH + 10]}>
          <mesh position={[0, 2, 0]}>
            <cylinderGeometry args={[0.2, 0.3, 4, 8]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          {[0, 1, 2, 3, 4].map((j) => (
            <mesh key={j} position={[Math.cos(j * 1.2) * 0.8, 4 + j * 0.1, Math.sin(j * 1.2) * 0.8]} rotation={[0.5, j * 1.2, 0]}>
              <coneGeometry args={[0.1, 1.5, 4]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function AirportDecorations() {
  return (
    <group>
      {/* Departure board */}
      <mesh position={[0, 4, -10]}>
        <boxGeometry args={[4, 1.5, 0.2]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <Text position={[0, 4.3, -9.8]} fontSize={0.2} color="#ffd700" anchorX="center">
        DEPARTURES
      </Text>
      <Text position={[0, 3.8, -9.8]} fontSize={0.15} color="#00ff00" anchorX="center">
        PARIS → FASHION WEEK
      </Text>
      {/* Luggage conveyor belts */}
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[-6, 0.3, -30 - i * 25]}>
          <boxGeometry args={[2, 0.3, 4]} />
          <meshStandardMaterial color="#333" metalness={0.8} />
        </mesh>
      ))}
      {/* Airport windows */}
      {Array.from({ length: 10 }).map((_, i) => (
        <mesh key={i} position={[8, 3, -10 - i * 12]}>
          <planeGeometry args={[2, 3]} />
          <meshStandardMaterial color="#1a3a5a" emissive="#1a3a5a" emissiveIntensity={0.2} />
        </mesh>
      ))}
    </group>
  );
}

function SpaceDecorations() {
  return (
    <group>
      {/* Rocket at the end */}
      <group position={[0, 0, -RUNWAY_LENGTH - 8]}>
        <mesh position={[0, 6, 0]}>
          <coneGeometry args={[1.5, 4, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[1.5, 1.5, 5, 16]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Fins */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 1.5, 0.5, Math.sin(i * Math.PI / 2) * 1.5]} rotation={[0, i * Math.PI / 2, 0]}>
            <boxGeometry args={[0.2, 2, 1]} />
            <meshStandardMaterial color="#ff4400" />
          </mesh>
        ))}
        {/* Engine glow */}
        <pointLight position={[0, -1, 0]} color="#ff6600" intensity={10} distance={15} />
      </group>
      {/* Stars */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      {/* Planets */}
      <mesh position={[-20, 15, -50]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial color="#ff6b4a" />
      </mesh>
      <mesh position={[25, 20, -80]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshStandardMaterial color="#4a9fff" />
      </mesh>
    </group>
  );
}

function CasinoDecorations() {
  return (
    <group>
      {/* Slot machines */}
      {Array.from({ length: 6 }).map((_, i) => (
        <group key={i}>
          <mesh position={[-5.5, 1, -15 - i * 18]}>
            <boxGeometry args={[1, 2, 0.8]} />
            <meshStandardMaterial color="#8b0000" metalness={0.5} />
          </mesh>
          <mesh position={[-5.5, 1.8, -15 - i * 18 + 0.3]}>
            <boxGeometry args={[0.6, 0.3, 0.1]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} />
          </mesh>
          <mesh position={[5.5, 1, -20 - i * 18]}>
            <boxGeometry args={[1, 2, 0.8]} />
            <meshStandardMaterial color="#8b0000" metalness={0.5} />
          </mesh>
        </group>
      ))}
      {/* Neon signs */}
      <Text position={[0, 5, -40]} fontSize={1} color="#ff0040" anchorX="center">
        JACKPOT
      </Text>
      {/* Roulette wheel at end */}
      <mesh position={[0, 0.5, -RUNWAY_LENGTH - 5]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3, 3, 0.3, 48]} />
        <meshStandardMaterial color="#006400" />
      </mesh>
    </group>
  );
}

function ForestDecorations() {
  return (
    <group>
      {/* Trees */}
      {Array.from({ length: 20 }).map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const x = side * (5 + Math.random() * 3);
        const z = -5 - i * 6;
        const height = 3 + Math.random() * 2;
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.15, 0.25, height, 8]} />
              <meshStandardMaterial color="#4a3728" />
            </mesh>
            <mesh position={[0, height + 0.5, 0]}>
              <coneGeometry args={[1.2, 2, 8]} />
              <meshStandardMaterial color="#228b22" />
            </mesh>
            <mesh position={[0, height + 1.8, 0]}>
              <coneGeometry args={[0.9, 1.5, 8]} />
              <meshStandardMaterial color="#2e8b2e" />
            </mesh>
            <mesh position={[0, height + 2.8, 0]}>
              <coneGeometry args={[0.6, 1, 8]} />
              <meshStandardMaterial color="#32cd32" />
            </mesh>
          </group>
        );
      })}
      {/* Fireflies */}
      <Sparkles count={200} scale={[15, 8, RUNWAY_LENGTH]} position={[0, 4, -RUNWAY_LENGTH / 2]} size={3} speed={0.3} color="#88ff88" />
      {/* Mushrooms */}
      {Array.from({ length: 10 }).map((_, i) => (
        <group key={i} position={[(i % 2 === 0 ? -1 : 1) * 4, 0, -10 - i * 11]}>
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.08, 0.1, 0.3, 8]} />
            <meshStandardMaterial color="#f5f5dc" />
          </mesh>
          <mesh position={[0, 0.35, 0]}>
            <sphereGeometry args={[0.2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#ff4500" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function IceDecorations() {
  return (
    <group>
      {/* Icebergs */}
      {Array.from({ length: 8 }).map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return (
          <group key={i} position={[side * (6 + Math.random() * 2), 0, -15 - i * 14]}>
            <mesh position={[0, 1.5, 0]}>
              <dodecahedronGeometry args={[2 + Math.random(), 0]} />
              <meshStandardMaterial color="#b0e0e6" transparent opacity={0.8} metalness={0.1} roughness={0.1} />
            </mesh>
          </group>
        );
      })}
      {/* Frozen ground effect */}
      <mesh position={[0, -0.1, -RUNWAY_LENGTH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, RUNWAY_LENGTH + 20]} />
        <meshStandardMaterial color="#a0d0e0" transparent opacity={0.3} />
      </mesh>
      {/* Snowflakes */}
      <Sparkles count={300} scale={[20, 10, RUNWAY_LENGTH]} position={[0, 5, -RUNWAY_LENGTH / 2]} size={2} speed={0.5} color="#ffffff" />
      {/* Northern lights effect */}
      <mesh position={[0, 20, -RUNWAY_LENGTH / 2]}>
        <planeGeometry args={[40, RUNWAY_LENGTH]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ============================================
// OBSTACLES
// ============================================

function ObstacleMesh({ obstacle, theme }: { obstacle: Obstacle; theme: ThemeId }) {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current && !obstacle.hit) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  if (obstacle.hit) return null;

  const x = (obstacle.lane - 1) * LANE_WIDTH;

  const getObstacleVisual = () => {
    switch (obstacle.type) {
      case "cart":
        return (
          <group>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[0.5, 0.4, 0.3]} />
              <meshStandardMaterial color="#888" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.08, 8, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
          </group>
        );
      case "luggage":
        return (
          <mesh position={[0, 0.2, 0]}>
            <boxGeometry args={[0.4, 0.3, 0.25]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
        );
      case "wave":
        return (
          <mesh position={[0, 0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
            <torusGeometry args={[0.3, 0.1, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#00bfff" transparent opacity={0.7} />
          </mesh>
        );
      case "cards":
        return (
          <group>
            {[0, 1, 2].map((i) => (
              <mesh key={i} position={[i * 0.1 - 0.1, 0.3, 0]} rotation={[0, i * 0.2, 0]}>
                <boxGeometry args={[0.15, 0.2, 0.01]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>
        );
      case "leaves":
        return (
          <group>
            {[0, 1, 2, 3].map((i) => (
              <mesh key={i} position={[Math.cos(i) * 0.2, 0.3 + i * 0.1, Math.sin(i) * 0.2]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#228b22" />
              </mesh>
            ))}
          </group>
        );
      case "ice":
        return (
          <mesh position={[0, 0.25, 0]}>
            <octahedronGeometry args={[0.25]} />
            <meshStandardMaterial color="#b0e0e6" transparent opacity={0.8} />
          </mesh>
        );
      default:
        return (
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.4, 0.4, 0.4]} />
            <meshStandardMaterial color="#ff0000" />
          </mesh>
        );
    }
  };

  return (
    <group ref={meshRef} position={[x, 0, -obstacle.z]}>
      {getObstacleVisual()}
      {/* Warning glow */}
      <pointLight position={[0, 0.5, 0]} color="#ff4444" intensity={2} distance={3} />
    </group>
  );
}

// ============================================
// GEMS AND COLLECTIBLES
// ============================================

function GemMesh({ gem, theme }: { gem: GemObject; theme: ThemeId }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const themeData = RUNWAY_THEMES[theme];

  useFrame((state) => {
    if (meshRef.current && !gem.collected) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 3;
      meshRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
    }
  });

  if (gem.collected) return null;

  const x = (gem.lane - 1) * LANE_WIDTH;

  const getGemVisual = () => {
    switch (gem.type) {
      case "gold":
        return (
          <mesh ref={meshRef} position={[x, 0.5, -gem.z]}>
            <octahedronGeometry args={[0.18, 0]} />
            <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} metalness={1} roughness={0.1} />
          </mesh>
        );
      case "diamond":
        return (
          <mesh ref={meshRef} position={[x, 0.5, -gem.z]}>
            <octahedronGeometry args={[0.2, 2]} />
            <meshStandardMaterial color="#ffffff" emissive="#88ffff" emissiveIntensity={0.8} metalness={0.9} roughness={0.05} />
          </mesh>
        );
      case "pearl":
        return (
          <mesh ref={meshRef} position={[x, 0.5, -gem.z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#ffeedd" emissive="#ffeedd" emissiveIntensity={0.3} metalness={0.3} roughness={0.2} />
          </mesh>
        );
      default:
        return (
          <mesh ref={meshRef} position={[x, 0.5, -gem.z]}>
            <octahedronGeometry args={[0.15, 0]} />
            <meshStandardMaterial color={themeData.accentColor} emissive={themeData.accentColor} emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
          </mesh>
        );
    }
  };

  return (
    <Float speed={3} rotationIntensity={0.3} floatIntensity={0.5}>
      {getGemVisual()}
    </Float>
  );
}

// ============================================
// POSE STATIONS
// ============================================

function PoseStationMesh({ station, playerZ }: { station: PoseStation; playerZ: number }) {
  const isActive = Math.abs(-station.z - playerZ) < 2 && !station.completed;
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current && isActive) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 6) * 0.15);
    }
  });

  if (station.completed) return null;

  return (
    <group position={[0, 0.02, -station.z]}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color={isActive ? "#ffd700" : "#666"} transparent opacity={isActive ? 1 : 0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial color={isActive ? "#ffd700" : "#333"} transparent opacity={0.2} />
      </mesh>
      {isActive && (
        <>
          <Text position={[0, 1.5, 0]} fontSize={0.3} color="#ffd700" anchorX="center">
            POSE!
          </Text>
          <pointLight position={[0, 2, 0]} color="#ffd700" intensity={5} distance={5} />
        </>
      )}
    </group>
  );
}

// ============================================
// AUDIENCE & MEDIA
// ============================================

function Audience({ theme }: { theme: ThemeId }) {
  // Simplified audience - spread along runway for performance
  const audienceData = useMemo(() => {
    const left: Array<{ pos: [number, number, number]; rot: number }> = [];
    const right: Array<{ pos: [number, number, number]; rot: number }> = [];

    for (let i = 0; i < 10; i++) {
      const z = -6 - i * 7.5; // Spread across 80-unit runway
      left.push({
        pos: [-(RUNWAY_WIDTH / 2 + 2), 0, z],
        rot: Math.PI / 5,
      });
      right.push({
        pos: [RUNWAY_WIDTH / 2 + 2, 0, z],
        rot: -Math.PI / 5,
      });
    }

    return { left, right };
  }, []);

  return (
    <group>
      {/* Single seating riser per side */}
      <mesh position={[-(RUNWAY_WIDTH / 2 + 2.1), 0.1, -RUNWAY_LENGTH / 2]}>
        <boxGeometry args={[1.5, 0.2, RUNWAY_LENGTH - 8]} />
        <meshStandardMaterial color="#0a0a0e" />
      </mesh>
      <mesh position={[RUNWAY_WIDTH / 2 + 2.1, 0.1, -RUNWAY_LENGTH / 2]}>
        <boxGeometry args={[1.5, 0.2, RUNWAY_LENGTH - 8]} />
        <meshStandardMaterial color="#0a0a0e" />
      </mesh>

      {/* Simplified audience members - no phone flashes for performance */}
      {audienceData.left.map((a, i) => (
        <SimpleAudienceMember key={`left-${i}`} position={a.pos} rotation={a.rot} />
      ))}
      {audienceData.right.map((a, i) => (
        <SimpleAudienceMember key={`right-${i}`} position={a.pos} rotation={a.rot} />
      ))}
    </group>
  );
}

function SimpleAudienceMember({ position, rotation }: { position: [number, number, number]; rotation: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.35, 0]}>
        <capsuleGeometry args={[0.08, 0.22, 4, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.07, 8, 8]} />
        <meshBasicMaterial color="#2a2a3e" />
      </mesh>
    </group>
  );
}

function MediaPit({ theme }: { theme: ThemeId }) {
  const themeData = RUNWAY_THEMES[theme];

  return (
    <group position={[0, 0, -RUNWAY_LENGTH - 2]}>
      {/* Simple barrier */}
      <mesh position={[0, 0.3, 1]}>
        <boxGeometry args={[8, 0.05, 0.05]} />
        <meshBasicMaterial color="#333" />
      </mesh>

      {/* Simplified photographers - just 3 */}
      {[-2, 0, 2].map((x, i) => (
        <SimplePhotographer key={i} position={[x, 0, -0.5]} />
      ))}

      <Text position={[0, 0.6, 0.8]} fontSize={0.1} color={themeData.accentColor} anchorX="center">
        PRESS
      </Text>
    </group>
  );
}

function SimplePhotographer({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.5, 0]}>
        <capsuleGeometry args={[0.1, 0.35, 4, 8]} />
        <meshBasicMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#c4a080" />
      </mesh>
      {/* Camera */}
      <mesh position={[0, 0.7, 0.1]}>
        <boxGeometry args={[0.08, 0.06, 0.06]} />
        <meshBasicMaterial color="#111" />
      </mesh>
    </group>
  );
}

// ============================================
// CAMERA CONTROLLER
// ============================================

function CameraController({ playerZ, isPlaying, isPosing }: { playerZ: number; isPlaying: boolean; isPosing: boolean }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { set } = useThree();

  useEffect(() => {
    if (cameraRef.current) {
      set({ camera: cameraRef.current });
    }
  }, [set]);

  useFrame(() => {
    if (cameraRef.current) {
      if (isPosing) {
        // Dramatic pose camera
        cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, 2, 0.03);
        cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 1.5, 0.03);
        cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, playerZ + 3, 0.03);
        cameraRef.current.lookAt(0, 1.2, playerZ);
      } else if (isPlaying) {
        // Follow camera
        cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, 0, 0.04);
        cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 2.8, 0.04);
        cameraRef.current.position.z = THREE.MathUtils.lerp(cameraRef.current.position.z, playerZ + 5, 0.04);
        cameraRef.current.lookAt(0, 1, playerZ - 4);
      }
    }
  });

  return <perspectiveCamera ref={cameraRef} position={[0, 3, 5]} fov={55} />;
}

// ============================================
// MAIN GAME SCENE
// ============================================

function GameScene({
  gameState,
  setGameState,
  obstacles,
  gems,
  setGems,
  poseStations,
  setPoseStations,
  walkFrame,
}: {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  obstacles: Obstacle[];
  gems: GemObject[];
  setGems: React.Dispatch<React.SetStateAction<GemObject[]>>;
  poseStations: PoseStation[];
  setPoseStations: React.Dispatch<React.SetStateAction<PoseStation[]>>;
  walkFrame: number;
}) {
  const theme = gameState.currentTheme;
  const themeData = RUNWAY_THEMES[theme];
  const playerX = (gameState.lane - 1) * LANE_WIDTH;
  const playerZ = -gameState.distance;

  return (
    <>
      {/* Lighting - simplified */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 15, 5]} intensity={1} />

      {/* Themed atmosphere - reduced particles */}
      <Sparkles
        count={30}
        scale={[10, 4, RUNWAY_LENGTH]}
        position={[0, 3, -RUNWAY_LENGTH / 2]}
        size={2}
        speed={0.3}
        color={themeData.accentColor}
      />

      {/* Runway */}
      <ThemedRunway theme={theme} />

      {/* Audience */}
      <Audience theme={theme} />

      {/* Media pit */}
      <MediaPit theme={theme} />

      {/* Obstacles */}
      {obstacles.map((obs) => (
        <ObstacleMesh key={obs.id} obstacle={obs} theme={theme} />
      ))}

      {/* Gems */}
      {gems.map((gem) => (
        <GemMesh key={gem.id} gem={gem} theme={theme} />
      ))}

      {/* Pose stations */}
      {poseStations.map((station) => (
        <PoseStationMesh key={station.id} station={station} playerZ={playerZ} />
      ))}

      {/* Character */}
      <ModelCharacter
        position={[playerX, 0, playerZ]}
        walkFrame={walkFrame}
        isWalking={gameState.phase === "walking"}
        isPosing={gameState.phase === "posing"}
        theme={theme}
      />

      {/* Camera */}
      <CameraController playerZ={playerZ} isPlaying={gameState.phase === "walking"} isPosing={gameState.phase === "posing"} />

      {/* Environment */}
      <Environment preset="night" />

      {/* Fog */}
      <fog attach="fog" args={[themeData.fogColor, 15, 80]} />
    </>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function CatwalkGame3D() {
  const [gameState, setGameState] = useState<GameState>({
    phase: "idle",
    distance: 0,
    lane: 1,
    targetLane: 1,
    walkScore: 100,
    styleScore: 0,
    gemsCollected: 0,
    combo: 0,
    beatHits: 0,
    obstaclesAvoided: 0,
    perfectPoses: 0,
    currentTheme: "studio",
  });

  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [gems, setGems] = useState<GemObject[]>([]);
  const [poseStations, setPoseStations] = useState<PoseStation[]>([]);
  const [walkFrame, setWalkFrame] = useState(0);
  const [gemBalance, setGemBalance] = useState(0);
  const [saving, setSaving] = useState(false);

  const gameLoopRef = useRef<number | null>(null);
  const theme = RUNWAY_THEMES[gameState.currentTheme];

  // Initialize game objects based on theme
  const initializeGame = useCallback((themeId: ThemeId) => {
    const newObstacles: Obstacle[] = [];
    const newGems: GemObject[] = [];
    const newPoseStations: PoseStation[] = [];

    // Generate obstacles based on theme
    const obstacleTypes: Record<ThemeId, Obstacle["type"][]> = {
      studio: ["cart", "luggage"],
      supermarket: ["cart", "cart", "luggage"],
      beach: ["wave", "wave", "luggage"],
      airport: ["luggage", "luggage", "cart"],
      space: ["ice", "leaves", "cart"],
      casino: ["cards", "cards", "cart"],
      forest: ["leaves", "leaves", "luggage"],
      ice: ["ice", "ice", "wave"],
    };

    const types = obstacleTypes[themeId];

    // Obstacles spread across runway - starts easy, gets denser
    for (let i = 0; i < 10; i++) {
      newObstacles.push({
        id: i,
        z: 12 + i * 7, // Start after some distance, even spacing
        lane: Math.floor(Math.random() * 3),
        type: types[Math.floor(Math.random() * types.length)],
        hit: false,
      });
    }

    // Gems distributed throughout runway
    const gemTypes: GemObject["type"][] = ["normal", "normal", "normal", "gold", "diamond"];
    for (let i = 0; i < 16; i++) {
      const type = gemTypes[Math.floor(Math.random() * gemTypes.length)];
      newGems.push({
        id: i,
        z: 5 + i * 4.5, // Well distributed
        lane: Math.floor(Math.random() * 3),
        collected: false,
        type,
        value: type === "diamond" ? 50 : type === "gold" ? 25 : 10,
      });
    }

    // Pose stations at key points
    for (let i = 0; i < 4; i++) {
      newPoseStations.push({
        id: i,
        z: 18 + i * 17, // Well spaced for dramatic moments
        completed: false,
        score: 0,
      });
    }

    setObstacles(newObstacles);
    setGems(newGems);
    setPoseStations(newPoseStations);
  }, []);

  const startGame = useCallback(() => {
    initializeGame(gameState.currentTheme);
    setGameState((prev) => ({
      ...prev,
      phase: "walking",
      distance: 0,
      lane: 1,
      targetLane: 1,
      walkScore: 100,
      styleScore: 0,
      gemsCollected: 0,
      combo: 0,
      beatHits: 0,
      obstaclesAvoided: 0,
      perfectPoses: 0,
    }));
    setWalkFrame(0);
  }, [initializeGame, gameState.currentTheme]);

  // Game loop with progressive speed
  useEffect(() => {
    if (gameState.phase !== "walking") return;

    let lastTime = performance.now();

    const gameLoop = () => {
      const currentTime = performance.now();
      const deltaTime = Math.min((currentTime - lastTime) / 16.67, 2); // Normalize to ~60fps, cap at 2x
      lastTime = currentTime;

      setWalkFrame((prev) => prev + 1);

      setGameState((prev) => {
        // Progressive speed: starts slow, gradually increases
        const progress = prev.distance / RUNWAY_LENGTH;
        const currentSpeed = BASE_WALK_SPEED + (MAX_WALK_SPEED - BASE_WALK_SPEED) * Math.min(progress * 1.5, 1);
        const newDistance = prev.distance + currentSpeed * deltaTime;

        if (newDistance >= RUNWAY_LENGTH) {
          return { ...prev, phase: "results", distance: RUNWAY_LENGTH };
        }

        // Smooth lane switching
        let newLane = prev.lane;
        if (prev.lane !== prev.targetLane) {
          const laneStep = LANE_SWITCH_SPEED * deltaTime;
          newLane = prev.lane < prev.targetLane
            ? Math.min(prev.lane + laneStep, prev.targetLane)
            : Math.max(prev.lane - laneStep, prev.targetLane);
        }

        return { ...prev, distance: newDistance, lane: newLane };
      });

      // Check obstacle collision
      setObstacles((prevObs) =>
        prevObs.map((obs) => {
          if (obs.hit) return obs;
          const distance = Math.abs(obs.z - gameState.distance);
          if (distance < 0.8 && Math.round(gameState.lane) === obs.lane) {
            setGameState((s) => ({
              ...s,
              walkScore: Math.max(0, s.walkScore - 15),
              combo: 0,
            }));
            return { ...obs, hit: true };
          }
          return obs;
        })
      );

      // Check gem collection
      setGems((prevGems) =>
        prevGems.map((gem) => {
          if (gem.collected) return gem;
          const distance = Math.abs(gem.z - gameState.distance);
          if (distance < 1 && Math.round(gameState.lane) === gem.lane) {
            setGameState((s) => ({
              ...s,
              gemsCollected: s.gemsCollected + gem.value,
              combo: s.combo + 1,
              styleScore: s.styleScore + gem.value * (1 + s.combo * 0.1),
            }));
            return { ...gem, collected: true };
          }
          return gem;
        })
      );

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState.phase, gameState.distance, gameState.lane]);

  // Pose action
  const doPose = useCallback(() => {
    setPoseStations((prev) =>
      prev.map((station) => {
        if (station.completed) return station;
        const distance = Math.abs(station.z - gameState.distance);
        if (distance < 2) {
          const score = distance < 0.5 ? 100 : distance < 1 ? 75 : 50;
          setGameState((s) => ({
            ...s,
            styleScore: s.styleScore + score,
            perfectPoses: s.perfectPoses + (score === 100 ? 1 : 0),
          }));
          return { ...station, completed: true, score };
        }
        return station;
      })
    );
  }, [gameState.distance]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.phase !== "walking") return;

      switch (e.key) {
        case "ArrowLeft":
        case "a":
        case "A":
          setGameState((prev) => ({ ...prev, targetLane: Math.max(0, prev.targetLane - 1) }));
          break;
        case "ArrowRight":
        case "d":
        case "D":
          setGameState((prev) => ({ ...prev, targetLane: Math.min(2, prev.targetLane + 1) }));
          break;
        case " ":
        case "ArrowUp":
        case "w":
        case "W":
          doPose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState.phase, doPose]);

  // Save score
  const saveScore = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/games/catwalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          runwayId: gameState.currentTheme,
          walkScore: gameState.walkScore,
          poseScore: Math.round(gameState.styleScore / 10),
          gemsCollected: gameState.gemsCollected,
          perfectWalks: gameState.perfectPoses,
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

  const resetGame = () => {
    setGameState((prev) => ({
      ...prev,
      phase: "idle",
      distance: 0,
      lane: 1,
      targetLane: 1,
      walkScore: 100,
      styleScore: 0,
      gemsCollected: 0,
      combo: 0,
      beatHits: 0,
      obstaclesAvoided: 0,
      perfectPoses: 0,
    }));
    setObstacles([]);
    setGems([]);
    setPoseStations([]);
  };

  useEffect(() => {
    fetch("/api/games/catwalk")
      .then((res) => res.json())
      .then((data) => {
        if (data.gemBalance) setGemBalance(data.gemBalance);
      })
      .catch(console.error);
  }, []);

  const totalScore = gameState.walkScore + Math.round(gameState.styleScore);

  return (
    <div className="space-y-4">
      {/* HUD */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 gap-1">
            <Gem className="h-3 w-3" />
            {gemBalance}
          </Badge>
          {gameState.phase === "walking" && (
            <>
              <Badge variant="secondary" className="bg-pink-500/20 text-pink-400">
                Walk: {gameState.walkScore}
              </Badge>
              <Badge variant="secondary" className="bg-purple-500/20 text-purple-400">
                Style: {Math.round(gameState.styleScore)}
              </Badge>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                Combo: {gameState.combo}x
              </Badge>
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Gem className="h-3 w-3 mr-1" />
                {gameState.gemsCollected}
              </Badge>
            </>
          )}
        </div>

        {gameState.phase === "idle" && (
          <div className="flex items-center gap-2">
            <select
              className="bg-gray-800 text-white text-sm rounded px-3 py-2 border border-gray-700"
              value={gameState.currentTheme}
              onChange={(e) => setGameState((prev) => ({ ...prev, currentTheme: e.target.value as ThemeId }))}
            >
              {Object.entries(RUNWAY_THEMES).map(([id, t]) => (
                <option key={id} value={id}>
                  {t.name} {t.unlockCost > 0 ? `(${t.unlockCost} gems)` : "(Free)"}
                </option>
              ))}
            </select>
            <Button onClick={startGame} className="bg-pink-600 hover:bg-pink-700">
              <Play className="h-4 w-4 mr-2" />
              Walk the Runway
            </Button>
          </div>
        )}
      </div>

      {/* Theme info */}
      {gameState.phase === "idle" && (
        <div className="text-center py-2">
          <p className="text-lg font-semibold" style={{ color: theme.accentColor }}>
            {theme.name}
          </p>
          <p className="text-sm text-gray-400">{theme.description}</p>
          <p className="text-xs text-gray-500 mt-1">Gem Multiplier: {theme.gemMultiplier}x</p>
        </div>
      )}

      {/* 3D Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-gray-800" style={{ height: "550px" }}>
        <Canvas camera={{ position: [0, 3, 5], fov: 55 }} shadows gl={{ antialias: true }}>
          <GameScene
            gameState={gameState}
            setGameState={setGameState}
            obstacles={obstacles}
            gems={gems}
            setGems={setGems}
            poseStations={poseStations}
            setPoseStations={setPoseStations}
            walkFrame={walkFrame}
          />
        </Canvas>

        {/* Mobile controls */}
        {gameState.phase === "walking" && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 md:hidden">
            <Button
              size="lg"
              variant="secondary"
              className="h-16 w-16 rounded-full bg-gray-800/80"
              onClick={() => setGameState((prev) => ({ ...prev, targetLane: Math.max(0, prev.targetLane - 1) }))}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
            <Button size="lg" variant="secondary" className="h-16 w-16 rounded-full bg-pink-600/80" onClick={doPose}>
              <SparklesIcon className="h-8 w-8" />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="h-16 w-16 rounded-full bg-gray-800/80"
              onClick={() => setGameState((prev) => ({ ...prev, targetLane: Math.min(2, prev.targetLane + 1) }))}
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
                className="h-full transition-all"
                style={{
                  width: `${(gameState.distance / RUNWAY_LENGTH) * 100}%`,
                  background: `linear-gradient(90deg, ${theme.accentColor}, #ec4899)`,
                }}
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
              <h2 className="text-2xl font-bold text-white">Magnifique!</h2>
              <p className="text-gray-400">{theme.name} Complete</p>

              <div className="grid grid-cols-4 gap-4 py-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-400">{totalScore}</p>
                  <p className="text-xs text-gray-400">Total Score</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-cyan-400">{gameState.gemsCollected}</p>
                  <p className="text-xs text-gray-400">Gems</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-400">{Math.round(gameState.styleScore)}</p>
                  <p className="text-xs text-gray-400">Style</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{gameState.perfectPoses}</p>
                  <p className="text-xs text-gray-400">Perfect Poses</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center">
                <Button onClick={resetGame} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Walk Again
                </Button>
                <Button onClick={saveScore} className="bg-pink-600 hover:bg-pink-700" disabled={saving}>
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
                <span>Strike a pose</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-cyan-400" />
                <span>Collect gems</span>
              </div>
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-4 w-4 text-yellow-400" />
                <span>Avoid obstacles</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
