"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Room {
  id: string;
  name: string;
  shortName?: string;
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
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  labelSize?: "xs" | "sm" | "md" | "lg";
}

// Coordinates based on close-up floor plan photo — viewBox 0 0 100 58 (landscape)
// Layout: building on left/center, pool complex on right, beach far right
const ROOMS: Room[] = [
  // === TOP ROW (indoor, north wall) ===
  {
    id: "ladies-room",
    name: "Ladies Room",
    shortName: "Ladies\nRoom",
    x: 16,
    y: 3,
    width: 7,
    height: 6,
    color: "rgba(168,85,247,0.25)",
    labelSize: "xs",
  },
  {
    id: "mens-room",
    name: "Men's Room",
    shortName: "Men's",
    x: 16,
    y: 9.5,
    width: 5,
    height: 5,
    color: "rgba(168,85,247,0.25)",
    labelSize: "xs",
  },
  {
    id: "orchid-parlor",
    name: "Orchid Parlor",
    dimensions: "18' × 35'",
    sqft: 630,
    capacity: { reception: 75, uShape: 24, conference: 24 },
    x: 38,
    y: 2,
    width: 12,
    height: 8,
    color: "rgba(236,72,153,0.25)",
    labelSize: "sm",
  },
  {
    id: "cabanas",
    name: "Cabanas",
    x: 66,
    y: 1,
    width: 14,
    height: 9,
    color: "rgba(251,146,60,0.25)",
    labelSize: "sm",
  },

  // === SECOND ROW (main indoor rooms) ===
  {
    id: "mezzanine",
    name: "Mezzanine",
    dimensions: "24' × 68'",
    sqft: 1632,
    ceilingHeight: "9'",
    capacity: { reception: 200 },
    x: 5,
    y: 9,
    width: 8,
    height: 16,
    color: "rgba(168,85,247,0.35)",
    labelSize: "sm",
  },
  {
    id: "boardroom",
    name: "Boardroom",
    dimensions: "21' × 25'",
    sqft: 525,
    ceilingHeight: "8'6\"",
    capacity: { reception: 40, rounds: 40, theatre: 45, school: 25, uShape: 24, hollowSquare: 30, conference: 16 },
    x: 16,
    y: 15,
    width: 9,
    height: 7,
    color: "rgba(59,130,246,0.35)",
    labelSize: "sm",
  },
  {
    id: "silan-restaurant",
    name: "Silan Kosher Restaurant",
    shortName: "Silan Kosher\nRestaurant",
    dimensions: "39' × 63'8\"",
    sqft: 1233,
    ceilingHeight: "8'",
    capacity: { reception: 90, rounds: 76, theatre: 95, school: 60, uShape: 45, hollowSquare: 55, conference: 48 },
    x: 26,
    y: 10,
    width: 18,
    height: 14,
    color: "rgba(234,179,8,0.3)",
  },
  {
    id: "sky-lounge",
    name: "Sky Lounge",
    dimensions: "35' × 39'",
    sqft: 1365,
    x: 46,
    y: 10,
    width: 14,
    height: 14,
    color: "rgba(6,182,212,0.3)",
  },

  // === ORCHID BALCONY (vertical strip) ===
  {
    id: "orchid-balcony",
    name: "Orchid Balcony",
    shortName: "Orchid\nBalcony",
    x: 61,
    y: 3,
    width: 3,
    height: 36,
    color: "rgba(168,85,247,0.2)",
    labelSize: "xs",
  },

  // === OUTDOOR PATIOS (middle band) ===
  {
    id: "orchid-patio",
    name: "Orchid Patio",
    x: 22,
    y: 26,
    width: 14,
    height: 9,
    color: "rgba(34,197,94,0.25)",
    labelSize: "sm",
  },
  {
    id: "sky-patio",
    name: "Sky Patio",
    x: 38,
    y: 26,
    width: 14,
    height: 9,
    color: "rgba(34,197,94,0.25)",
    labelSize: "sm",
  },

  // === LOWER SECTION ===
  {
    id: "orchid-ballroom",
    name: "Orchid Ballroom",
    dimensions: "58' × 84'",
    sqft: 4872,
    ceilingHeight: "12' / 11.5'",
    capacity: { reception: 400, rounds: 300, theatre: 420, school: 250 },
    x: 1,
    y: 28,
    width: 16,
    height: 24,
    color: "rgba(236,72,153,0.3)",
    labelSize: "lg",
  },
  {
    id: "orchid-terrace",
    name: "Orchid Terrace",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 18,
    y: 37,
    width: 22,
    height: 15,
    color: "rgba(34,197,94,0.3)",
  },
  {
    id: "sky-deck",
    name: "Sky Deck",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 42,
    y: 36,
    width: 16,
    height: 16,
    color: "rgba(6,182,212,0.25)",
  },

  // === POOL COMPLEX (right side) ===
  {
    id: "lower-pool",
    name: "Lower Pool",
    x: 66,
    y: 12,
    width: 12,
    height: 12,
    color: "rgba(56,189,248,0.35)",
    labelSize: "sm",
  },
  {
    id: "pool-bar",
    name: "Top of the Falls\nPool Bar",
    shortName: "Pool Bar",
    x: 66,
    y: 26,
    width: 12,
    height: 8,
    color: "rgba(249,115,22,0.3)",
    labelSize: "sm",
  },
  {
    id: "heated-pool",
    name: "Heated Adult Saltwater Pool",
    shortName: "Heated\nSaltwater Pool",
    x: 64,
    y: 36,
    width: 16,
    height: 18,
    color: "rgba(56,189,248,0.4)",
  },

  // === BEACH (far right strip) ===
  {
    id: "beach",
    name: "Beachfront / Oceanfront",
    shortName: "Beach",
    x: 82,
    y: 1,
    width: 17,
    height: 55,
    color: "rgba(251,191,36,0.1)",
    labelSize: "sm",
  },
];

// Lobby / spiral staircase
const LOBBY = { cx: 11, cy: 5, r: 3 };

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

      {/* SVG Map — landscape ratio matching the actual floor plan */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-zinc-950/80 backdrop-blur-sm">
        <svg
          viewBox="0 0 100 58"
          className="w-full h-auto"
        >
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.08" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect width="100" height="58" fill="url(#grid)" />

          {/* Rooms */}
          {ROOMS.map((room) => {
            const isHovered = hovered === room.id;
            const isSelected = selected?.id === room.id;
            const fontSize =
              room.labelSize === "lg" ? 1.6
              : room.labelSize === "xs" ? 0.85
              : room.labelSize === "sm" ? 1.0
              : 1.2;
            const label = room.shortName || room.name;
            const lines = label.split("\n");
            const hasSqft = !!room.sqft;

            return (
              <g
                key={room.id}
                className="cursor-pointer"
                onClick={() => setSelected(isSelected ? null : room)}
                onMouseEnter={() => setHovered(room.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  rx={0.6}
                  fill={room.color}
                  stroke={
                    isSelected ? "rgba(236,72,153,0.8)"
                    : isHovered ? "rgba(255,255,255,0.5)"
                    : "rgba(255,255,255,0.15)"
                  }
                  strokeWidth={isSelected ? 0.35 : 0.15}
                  filter={isSelected || isHovered ? "url(#glow)" : undefined}
                  style={{ transition: "all 0.2s ease" }}
                />
                {/* Room label — multi-line support */}
                {lines.map((line, i) => {
                  const totalTextHeight = lines.length * fontSize * 1.3 + (hasSqft ? fontSize * 1.2 : 0);
                  const startY = room.y + room.height / 2 - totalTextHeight / 2 + fontSize * 0.6;
                  return (
                    <text
                      key={i}
                      x={room.x + room.width / 2}
                      y={startY + i * fontSize * 1.3}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="white"
                      fontSize={fontSize}
                      fontWeight="600"
                      style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.9)" }}
                    >
                      {line}
                    </text>
                  );
                })}
                {hasSqft && (
                  <text
                    x={room.x + room.width / 2}
                    y={room.y + room.height / 2 + lines.length * fontSize * 0.5 + fontSize * 0.5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.5)"
                    fontSize={fontSize * 0.7}
                    style={{ pointerEvents: "none" }}
                  >
                    {room.sqft!.toLocaleString()} sq ft
                  </text>
                )}
              </g>
            );
          })}

          {/* Lobby / Spiral Staircase */}
          <g>
            <circle
              cx={LOBBY.cx}
              cy={LOBBY.cy}
              r={LOBBY.r}
              fill="rgba(168,85,247,0.15)"
              stroke="rgba(168,85,247,0.3)"
              strokeWidth={0.15}
            />
            {/* Spiral hint */}
            <path
              d={`M ${LOBBY.cx} ${LOBBY.cy - 1.2} A 1.2 1.2 0 0 1 ${LOBBY.cx + 1.2} ${LOBBY.cy} A 1.2 1.2 0 0 1 ${LOBBY.cx} ${LOBBY.cy + 0.6}`}
              fill="none"
              stroke="rgba(168,85,247,0.4)"
              strokeWidth={0.15}
            />
            <text
              x={LOBBY.cx}
              y={LOBBY.cy - 0.3}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.6)"
              fontSize={0.85}
              fontWeight="500"
            >
              Lobby
            </text>
            <text
              x={LOBBY.cx}
              y={LOBBY.cy + 0.8}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.35)"
              fontSize={0.6}
            >
              Staircase
            </text>
          </g>

          {/* Ocean label on the beach strip */}
          <text
            x={91}
            y={30}
            textAnchor="middle"
            fill="rgba(6,182,212,0.3)"
            fontSize={1.1}
            fontWeight="700"
            letterSpacing={0.3}
            transform="rotate(90, 91, 30)"
          >
            ATLANTIC OCEAN
          </text>
        </svg>

        {/* Detail panel */}
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
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(251,191,36,0.2)" }} />
          <span>Beachfront</span>
        </div>
      </div>
    </div>
  );
}
