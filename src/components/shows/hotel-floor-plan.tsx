"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Room {
  id: string;
  name: string;
  dimensions?: string;
  sqft?: number;
  ceilingHeight?: string;
  capacity?: {
    reception?: number;
    rounds?: number;
    theatre?: number;
    school?: number;
    uShape?: number;
    hollowSquare?: number;
    conference?: number;
  };
  // SVG coordinates (percentage-based for responsiveness)
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  textColor?: string;
  labelSize?: "sm" | "md" | "lg";
  // For non-rectangular shapes
  type?: "rect" | "ellipse" | "path";
  path?: string;
  rx?: number;
  ry?: number;
}

const ROOMS: Room[] = [
  // === INDOOR SPACES ===
  {
    id: "mezzanine",
    name: "Mezzanine",
    dimensions: "24' × 68'",
    sqft: 1632,
    ceilingHeight: "9'",
    capacity: { reception: 200 },
    x: 3,
    y: 12,
    width: 10,
    height: 22,
    color: "rgba(168,85,247,0.35)",
    labelSize: "sm",
  },
  {
    id: "ladies-room",
    name: "Ladies Room",
    dimensions: undefined,
    x: 14,
    y: 8,
    width: 7,
    height: 8,
    color: "rgba(168,85,247,0.2)",
    labelSize: "sm",
  },
  {
    id: "boardroom",
    name: "Boardroom",
    dimensions: "21' × 25'",
    sqft: 525,
    ceilingHeight: "8'6\"",
    capacity: { reception: 40, rounds: 40, theatre: 45, school: 25, uShape: 24, hollowSquare: 30, conference: 16 },
    x: 22,
    y: 8,
    width: 10,
    height: 10,
    color: "rgba(59,130,246,0.35)",
    labelSize: "sm",
  },
  {
    id: "silan-restaurant",
    name: "Silan Kosher Restaurant",
    dimensions: "39' × 63'8\"",
    sqft: 1233,
    ceilingHeight: "8'",
    capacity: { reception: 90, rounds: 76, theatre: 95, school: 60, uShape: 45, hollowSquare: 55, conference: 48 },
    x: 22,
    y: 19,
    width: 16,
    height: 12,
    color: "rgba(234,179,8,0.3)",
  },
  {
    id: "orchid-ballroom",
    name: "Orchid Ballroom",
    dimensions: "58' × 84'",
    sqft: 4872,
    ceilingHeight: "12' / 11.5'",
    capacity: { reception: 400, rounds: 300, theatre: 420, school: 250 },
    x: 14,
    y: 32,
    width: 24,
    height: 24,
    color: "rgba(236,72,153,0.3)",
    labelSize: "lg",
  },
  {
    id: "orchid-parlor",
    name: "Orchid Parlor",
    dimensions: "18' × 35'",
    sqft: 630,
    capacity: { reception: 75, uShape: 24, conference: 24 },
    x: 40,
    y: 8,
    width: 12,
    height: 10,
    color: "rgba(236,72,153,0.25)",
    labelSize: "sm",
  },
  {
    id: "sky-lounge",
    name: "Sky Lounge",
    dimensions: "35' × 39'",
    sqft: 1365,
    x: 42,
    y: 19,
    width: 14,
    height: 12,
    color: "rgba(6,182,212,0.3)",
  },
  // === OUTDOOR SPACES ===
  {
    id: "orchid-patio",
    name: "Orchid Patio",
    dimensions: undefined,
    x: 22,
    y: 57,
    width: 12,
    height: 10,
    color: "rgba(34,197,94,0.25)",
    labelSize: "sm",
  },
  {
    id: "sky-patio",
    name: "Sky Patio",
    dimensions: undefined,
    x: 36,
    y: 57,
    width: 12,
    height: 10,
    color: "rgba(34,197,94,0.25)",
    labelSize: "sm",
  },
  {
    id: "orchid-terrace",
    name: "Orchid Terrace",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 10,
    y: 68,
    width: 20,
    height: 16,
    color: "rgba(34,197,94,0.3)",
  },
  {
    id: "sky-deck",
    name: "Sky Deck",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 50,
    y: 32,
    width: 14,
    height: 16,
    color: "rgba(6,182,212,0.25)",
  },
  // === POOL AREA ===
  {
    id: "lower-pool",
    name: "Lower Pool",
    x: 66,
    y: 14,
    width: 12,
    height: 14,
    color: "rgba(56,189,248,0.35)",
    type: "rect",
    labelSize: "sm",
  },
  {
    id: "pool-bar",
    name: "Pool Bar",
    x: 66,
    y: 30,
    width: 12,
    height: 8,
    color: "rgba(249,115,22,0.3)",
    labelSize: "sm",
  },
  {
    id: "heated-pool",
    name: "Heated Adult Saltwater Pool",
    x: 66,
    y: 40,
    width: 14,
    height: 18,
    color: "rgba(56,189,248,0.4)",
    labelSize: "sm",
  },
  // === CABANAS / BEACH ===
  {
    id: "cabanas",
    name: "Cabanas",
    x: 58,
    y: 2,
    width: 14,
    height: 10,
    color: "rgba(251,146,60,0.25)",
    labelSize: "sm",
  },
  {
    id: "ocean-front-deck",
    name: "Ocean Front Deck",
    dimensions: undefined,
    sqft: 20000,
    x: 32,
    y: 70,
    width: 28,
    height: 14,
    color: "rgba(6,182,212,0.2)",
  },
  {
    id: "beach",
    name: "Beach / Oceanfront",
    x: 32,
    y: 86,
    width: 50,
    height: 10,
    color: "rgba(251,191,36,0.15)",
  },
];

// Lobby / staircase marker
const LOBBY = { x: 52, y: 8, r: 4 };

export function HotelFloorPlan() {
  const [selected, setSelected] = useState<Room | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full">
      {/* Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20">
          <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold">Hotel Alexander — Venue Map</h2>
          <p className="text-sm text-muted-foreground">Total capacity: 2,200 — Tap any space for details</p>
        </div>
      </div>

      {/* SVG Map */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/80 backdrop-blur-sm">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-auto"
          style={{ aspectRatio: "100/100" }}
        >
          {/* Background grid pattern */}
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.1" />
            </pattern>
            {/* Glow filter for selected/hovered rooms */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />

          {/* Ocean / beach gradient at bottom */}
          <defs>
            <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(6,182,212,0.1)" />
              <stop offset="100%" stopColor="rgba(6,182,212,0.02)" />
            </linearGradient>
          </defs>

          {/* Rooms */}
          {ROOMS.map((room) => {
            const isHovered = hovered === room.id;
            const isSelected = selected?.id === room.id;
            return (
              <g
                key={room.id}
                className="cursor-pointer transition-all duration-200"
                onClick={() => setSelected(isSelected ? null : room)}
                onMouseEnter={() => setHovered(room.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx={0.8}
                  fill={room.color}
                  stroke={isSelected ? "rgba(236,72,153,0.8)" : isHovered ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)"}
                  strokeWidth={isSelected ? 0.4 : 0.2}
                  filter={isSelected || isHovered ? "url(#glow)" : undefined}
                  style={{ transition: "all 0.2s ease" }}
                />
                {/* Room label */}
                <text
                  x={room.x + room.width / 2}
                  y={room.y + room.height / 2 - (room.sqft ? 0.8 : 0)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="white"
                  fontSize={room.labelSize === "lg" ? 1.8 : room.labelSize === "sm" ? 1.1 : 1.4}
                  fontWeight="600"
                  style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.8)" }}
                >
                  {room.name}
                </text>
                {room.sqft && (
                  <text
                    x={room.x + room.width / 2}
                    y={room.y + room.height / 2 + (room.labelSize === "lg" ? 2.2 : 1.6)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.6)"
                    fontSize={room.labelSize === "lg" ? 1.2 : 0.9}
                    style={{ pointerEvents: "none" }}
                  >
                    {room.sqft.toLocaleString()} sq ft
                  </text>
                )}
              </g>
            );
          })}

          {/* Lobby / Staircase circle */}
          <circle
            cx={LOBBY.x}
            cy={LOBBY.y}
            r={LOBBY.r}
            fill="rgba(168,85,247,0.15)"
            stroke="rgba(168,85,247,0.3)"
            strokeWidth={0.2}
          />
          <text
            x={LOBBY.x}
            y={LOBBY.y - 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.7)"
            fontSize={1}
            fontWeight="500"
          >
            Lobby
          </text>
          <text
            x={LOBBY.x}
            y={LOBBY.y + 1}
            textAnchor="middle"
            dominantBaseline="central"
            fill="rgba(255,255,255,0.4)"
            fontSize={0.7}
          >
            Staircase
          </text>

          {/* Compass / Ocean label */}
          <text
            x={82}
            y={92}
            textAnchor="middle"
            fill="rgba(6,182,212,0.4)"
            fontSize={1.8}
            fontWeight="700"
            letterSpacing={0.3}
          >
            ATLANTIC OCEAN →
          </text>
        </svg>

        {/* Detail panel - shown when a room is selected */}
        {selected && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-white/10 p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4 text-zinc-400" />
            </button>
            <h3 className="text-lg font-bold text-white mb-1">{selected.name}</h3>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-zinc-400">
              {selected.dimensions && (
                <span>Dimensions: <span className="text-white">{selected.dimensions}</span></span>
              )}
              {selected.sqft && (
                <span>Area: <span className="text-white">{selected.sqft.toLocaleString()} sq ft</span></span>
              )}
              {selected.ceilingHeight && (
                <span>Ceiling: <span className="text-white">{selected.ceilingHeight}</span></span>
              )}
            </div>
            {selected.capacity && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.capacity.reception && (
                  <span className="px-2.5 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-medium">
                    Reception: {selected.capacity.reception}
                  </span>
                )}
                {selected.capacity.theatre && (
                  <span className="px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium">
                    Theatre: {selected.capacity.theatre}
                  </span>
                )}
                {selected.capacity.rounds && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium">
                    Rounds: {selected.capacity.rounds}
                  </span>
                )}
                {selected.capacity.school && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                    School: {selected.capacity.school}
                  </span>
                )}
                {selected.capacity.uShape && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                    U-Shape: {selected.capacity.uShape}
                  </span>
                )}
                {selected.capacity.conference && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">
                    Conference: {selected.capacity.conference}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(236,72,153,0.4)" }} />
          <span>Indoor Venues</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(34,197,94,0.35)" }} />
          <span>Outdoor Spaces</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(56,189,248,0.4)" }} />
          <span>Pool Area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(6,182,212,0.25)" }} />
          <span>Oceanfront</span>
        </div>
      </div>
    </div>
  );
}
