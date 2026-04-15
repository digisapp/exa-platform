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
  shape?: "rect" | "pool";
  verticalLabel?: boolean;
}

// viewBox 0 0 100 58 (landscape) — Miami Beach vibes
const ROOMS: Room[] = [
  // === COLLINS AVE (road — cars pull up) ===
  {
    id: "collins-ave",
    name: "Collins Ave",
    shortName: "Collins Ave — 5225 Collins Ave, Miami Beach, FL",
    x: 0,
    y: 1,
    width: 3,
    height: 55,
    color: "rgba(120,120,130,0.25)",
    labelSize: "xs",
    verticalLabel: true,
  },

  // === VALET DROP-OFF ===
  {
    id: "valet",
    name: "Valet Drop-Off",
    shortName: "Valet 🚗",
    x: 3.5,
    y: 1,
    width: 3,
    height: 55,
    color: "rgba(255,200,50,0.25)",
    labelSize: "xs",
    verticalLabel: true,
  },

  // === GRAND ENTRANCE (large outdoor area) ===
  {
    id: "grand-entrance",
    name: "Grand Entrance — Outdoor Arrival Area",
    shortName: "Grand\nEntrance",
    x: 7,
    y: 1,
    width: 14,
    height: 55,
    color: "rgba(168,85,247,0.2)",
    labelSize: "lg",
  },

  // === TOP ROW ===
  {
    id: "cabanas",
    name: "Cabanas",
    x: 60,
    y: 1,
    width: 14,
    height: 9,
    color: "rgba(255,165,0,0.35)",
    labelSize: "sm",
  },

  // === MAIN INDOOR ROOMS ===
  {
    id: "mezzanine",
    name: "Mezzanine (Upstairs)",
    shortName: "Mezzanine\n⬆ Upstairs",
    dimensions: "24' × 68'",
    sqft: 1632,
    ceilingHeight: "9'",
    capacity: { reception: 200 },
    x: 15,
    y: 3,
    width: 8,
    height: 22,
    color: "rgba(168,85,247,0.45)",
    labelSize: "sm",
  },
  {
    id: "exa-restaurant",
    name: "EXA Restaurant",
    dimensions: "39' × 63'8\"",
    sqft: 1233,
    ceilingHeight: "8'",
    capacity: { reception: 90, rounds: 76, theatre: 95, school: 60, uShape: 45, hollowSquare: 55, conference: 48 },
    x: 25,
    y: 3,
    width: 16,
    height: 14,
    color: "rgba(255,200,50,0.35)",
  },
  {
    id: "exa-hq",
    name: "EXA Models HQ — Check-In",
    shortName: "EXA Models HQ\nCheck-In",
    dimensions: "35' × 39'",
    sqft: 1365,
    x: 43,
    y: 3,
    width: 14,
    height: 14,
    color: "rgba(0,210,255,0.35)",
  },

  // === LOWER SECTION ===
  {
    id: "orchid-ballroom",
    name: "Orchid Ballroom",
    dimensions: "58' × 84'",
    sqft: 4872,
    ceilingHeight: "12' / 11.5'",
    capacity: { reception: 400, rounds: 300, theatre: 420, school: 250 },
    x: 15,
    y: 28,
    width: 16,
    height: 24,
    color: "rgba(255,50,130,0.35)",
    labelSize: "lg",
  },
  {
    id: "orchid-terrace",
    name: "Orchid Terrace",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 33,
    y: 30,
    width: 16,
    height: 15,
    color: "rgba(0,230,118,0.35)",
  },
  {
    id: "sky-deck",
    name: "Sky Deck",
    dimensions: "44' × 55'",
    sqft: 1845,
    capacity: { reception: 200, rounds: 130, theatre: 150, school: 100 },
    x: 51,
    y: 30,
    width: 14,
    height: 16,
    color: "rgba(0,210,255,0.3)",
  },

  // === POOLS ===
  {
    id: "lower-pool",
    name: "Lower Pool",
    x: 63,
    y: 12,
    width: 12,
    height: 12,
    color: "rgba(0,180,255,0.45)",
    labelSize: "sm",
    shape: "pool",
  },
  {
    id: "exa-bar",
    name: "EXA Bar",
    shortName: "EXA Bar 🍹",
    x: 63,
    y: 26,
    width: 12,
    height: 8,
    color: "rgba(255,100,0,0.5)",
    labelSize: "sm",
  },
  {
    id: "heated-pool",
    name: "Heated Adult Saltwater Pool",
    shortName: "Heated\nSaltwater Pool",
    x: 62,
    y: 36,
    width: 18,
    height: 18,
    color: "rgba(0,180,255,0.5)",
    shape: "pool",
  },

  // === EXA SWIM SHOWS ===
  {
    id: "exa-swim-shows",
    name: "EXA Swim Shows",
    shortName: "EXA\nSwim Shows",
    x: 80,
    y: 1,
    width: 16,
    height: 55,
    color: "rgba(255,50,130,0.25)",
    labelSize: "lg",
  },
];

export function HotelFloorPlan() {
  const [selected, setSelected] = useState<Room | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const renderRoomShape = (room: Room, isHovered: boolean, isSelected: boolean) => {
    const stroke = isSelected
      ? "rgba(255,50,130,1)"
      : isHovered
      ? "rgba(255,255,255,0.6)"
      : "rgba(255,255,255,0.2)";
    const strokeWidth = isSelected ? 0.4 : 0.15;
    const filter = isSelected || isHovered ? "url(#glow)" : undefined;

    if (room.shape === "pool") {
      const cx = room.x + room.width / 2;
      const cy = room.y + room.height / 2;
      const rx = room.width / 2 - 0.5;
      const ry = room.height / 2 - 0.5;
      return (
        <path
          d={`
            M ${cx - rx * 0.3} ${cy - ry}
            C ${cx + rx * 0.6} ${cy - ry * 1.15}, ${cx + rx * 1.1} ${cy - ry * 0.4}, ${cx + rx * 0.85} ${cy + ry * 0.1}
            C ${cx + rx * 0.6} ${cy + ry * 0.6}, ${cx + rx * 0.9} ${cy + ry * 1.1}, ${cx + rx * 0.1} ${cy + ry}
            C ${cx - rx * 0.5} ${cy + ry * 0.9}, ${cx - rx * 1.1} ${cy + ry * 0.5}, ${cx - rx * 0.95} ${cy - ry * 0.1}
            C ${cx - rx * 0.8} ${cy - ry * 0.7}, ${cx - rx * 0.9} ${cy - ry * 0.95}, ${cx - rx * 0.3} ${cy - ry}
            Z
          `}
          fill={room.color}
          stroke={stroke}
          strokeWidth={strokeWidth}
          filter={filter}
          style={{ transition: "all 0.2s ease" }}
        />
      );
    }

    return (
      <rect
        x={room.x}
        y={room.y}
        width={room.width}
        height={room.height}
        rx={0.6}
        fill={room.color}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filter}
        style={{ transition: "all 0.2s ease" }}
      />
    );
  };

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
        <svg viewBox="0 0 100 58" className="w-full h-auto">
          <defs>
            <pattern id="grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.08" />
            </pattern>
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feFlood floodColor="rgba(255,50,130,0.3)" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="colorBlur" />
              <feMerge>
                <feMergeNode in="colorBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Wave pattern for ocean */}
            <pattern id="waves" x="0" y="0" width="6" height="3" patternUnits="userSpaceOnUse">
              <path d="M 0 1.5 Q 1.5 0.3, 3 1.5 Q 4.5 2.7, 6 1.5" fill="none" stroke="rgba(0,210,255,0.25)" strokeWidth="0.25">
                <animateTransform attributeName="transform" type="translate" from="0 0" to="-6 0" dur="2.5s" repeatCount="indefinite" />
              </path>
            </pattern>
            <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,180,255,0.04)" />
              <stop offset="100%" stopColor="rgba(0,180,255,0.12)" />
            </linearGradient>
          </defs>
          <rect width="100" height="58" fill="url(#grid)" />

          {/* === ATLANTIC OCEAN (right edge) === */}
          <g>
            <rect x="97" y="0" width="3" height="58" fill="url(#oceanGrad)" />
            <rect x="96" y="0" width="4" height="58" fill="url(#waves)" opacity="0.9" />
            {/* Animated wave lines */}
            <path d="M 99.3 0 Q 98.7 5, 99.3 10 Q 99.8 15, 99.3 20 Q 98.7 25, 99.3 30 Q 99.8 35, 99.3 40 Q 98.7 45, 99.3 50 Q 99.8 55, 99.3 58" fill="none" stroke="rgba(0,210,255,0.3)" strokeWidth="0.2">
              <animate attributeName="d" dur="3.5s" repeatCount="indefinite" values="
                M 99.3 0 Q 98.7 5, 99.3 10 Q 99.8 15, 99.3 20 Q 98.7 25, 99.3 30 Q 99.8 35, 99.3 40 Q 98.7 45, 99.3 50 Q 99.8 55, 99.3 58;
                M 99.3 0 Q 99.8 5, 99.3 10 Q 98.7 15, 99.3 20 Q 99.8 25, 99.3 30 Q 98.7 35, 99.3 40 Q 99.8 45, 99.3 50 Q 98.7 55, 99.3 58;
                M 99.3 0 Q 98.7 5, 99.3 10 Q 99.8 15, 99.3 20 Q 98.7 25, 99.3 30 Q 99.8 35, 99.3 40 Q 98.7 45, 99.3 50 Q 99.8 55, 99.3 58
              " />
            </path>
            <path d="M 98 0 Q 97.5 4, 98 8 Q 98.5 12, 98 16 Q 97.5 20, 98 24 Q 98.5 28, 98 32 Q 97.5 36, 98 40 Q 98.5 44, 98 48 Q 97.5 52, 98 58" fill="none" stroke="rgba(0,210,255,0.18)" strokeWidth="0.15">
              <animate attributeName="d" dur="4.5s" repeatCount="indefinite" values="
                M 98 0 Q 97.5 4, 98 8 Q 98.5 12, 98 16 Q 97.5 20, 98 24 Q 98.5 28, 98 32 Q 97.5 36, 98 40 Q 98.5 44, 98 48 Q 97.5 52, 98 58;
                M 98 0 Q 98.5 4, 98 8 Q 97.5 12, 98 16 Q 98.5 20, 98 24 Q 97.5 28, 98 32 Q 98.5 36, 98 40 Q 97.5 44, 98 48 Q 98.5 52, 98 58;
                M 98 0 Q 97.5 4, 98 8 Q 98.5 12, 98 16 Q 97.5 20, 98 24 Q 98.5 28, 98 32 Q 97.5 36, 98 40 Q 98.5 44, 98 48 Q 97.5 52, 98 58
              " />
            </path>
            <text x="99" y="29" textAnchor="middle" fill="rgba(0,210,255,0.3)" fontSize="0.9" fontWeight="700" letterSpacing="0.5" transform="rotate(90, 99, 29)">
              ATLANTIC OCEAN
            </text>
          </g>

          {/* Rooms */}
          {ROOMS.map((room) => {
            const isHovered = hovered === room.id;
            const isSelected = selected?.id === room.id;
            const fontSize =
              room.labelSize === "lg" ? 1.6
              : room.labelSize === "xs" ? 0.8
              : room.labelSize === "sm" ? 1.0
              : 1.2;
            const label = room.shortName || room.name;
            const lines = label.split("\n");
            const hasSqft = !!room.sqft;
            const isVertical = room.verticalLabel;

            return (
              <g
                key={room.id}
                className="cursor-pointer"
                onClick={() => setSelected(isSelected ? null : room)}
                onMouseEnter={() => setHovered(room.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {renderRoomShape(room, isHovered, isSelected)}

                {isVertical ? (
                  /* Vertical label for narrow tall strips */
                  <text
                    x={room.x + room.width / 2}
                    y={room.y + room.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="rgba(255,255,255,0.7)"
                    fontSize={fontSize}
                    fontWeight="600"
                    transform={`rotate(90, ${room.x + room.width / 2}, ${room.y + room.height / 2})`}
                    style={{ pointerEvents: "none", textShadow: "0 0 3px rgba(0,0,0,0.9)" }}
                  >
                    {label.replace("\n", " — ")}
                  </text>
                ) : (
                  <>
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
                          style={{ pointerEvents: "none", textShadow: "0 0 4px rgba(0,0,0,0.9)" }}
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
                  </>
                )}
              </g>
            );
          })}

          {/* === RED CARPET — 20ft wide, runs west→east through Grand Entrance === */}
          <g style={{ pointerEvents: "none" }}>
            {/* Red carpet glow */}
            <rect
              x={3.5}
              y={22}
              width={18}
              height={6}
              rx={0.3}
              fill="rgba(220,20,20,0.12)"
            />
            {/* Red carpet surface */}
            <rect
              x={4}
              y={23}
              width={17}
              height={4}
              rx={0.3}
              fill="rgba(220,20,20,0.45)"
              stroke="rgba(255,80,80,0.5)"
              strokeWidth={0.15}
            />
            {/* Gold trim edges */}
            <line x1={4} y1={23} x2={21} y2={23} stroke="rgba(255,200,50,0.5)" strokeWidth={0.15} />
            <line x1={4} y1={27} x2={21} y2={27} stroke="rgba(255,200,50,0.5)" strokeWidth={0.15} />
            {/* Direction arrow (west → east) */}
            <path d="M 18.5 25 L 20 25 L 19.3 24.3 M 20 25 L 19.3 25.7" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={0.12} />
            {/* Red carpet label */}
            <text
              x={12}
              y={24.6}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.7)"
              fontSize={0.75}
              fontWeight="700"
              letterSpacing={0.2}
            >
              RED CARPET — 20ft
            </text>
            <text
              x={12}
              y={25.7}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.45)"
              fontSize={0.55}
              fontWeight="500"
            >
              W → E
            </text>
          </g>

          {/* === PHOTO WALL — at the entrance === */}
          <g style={{ pointerEvents: "none" }}>
            <rect
              x={7.5}
              y={16}
              width={13}
              height={4}
              rx={0.4}
              fill="rgba(255,50,130,0.25)"
              stroke="rgba(255,50,130,0.4)"
              strokeWidth={0.12}
            />
            <text
              x={14}
              y={18}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.6)"
              fontSize={0.7}
              fontWeight="600"
            >
              📸 Photo Wall & Photographers
            </text>
          </g>

          {/* === 50ft RUNWAY — white stage down center of EXA Swim Shows === */}
          <g style={{ pointerEvents: "none" }}>
            {/* Runway shadow/glow */}
            <rect
              x={86.5}
              y={6}
              width={3}
              height={44}
              rx={0.4}
              fill="rgba(255,255,255,0.06)"
            />
            {/* Runway surface */}
            <rect
              x={87}
              y={7}
              width={2}
              height={42}
              rx={0.3}
              fill="rgba(255,255,255,0.25)"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth={0.15}
            />
            {/* Center line */}
            <line
              x1={88}
              y1={8}
              x2={88}
              y2={48}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={0.1}
              strokeDasharray="1 0.8"
            />
            {/* Stage end (wider platform at top) */}
            <rect
              x={85.5}
              y={5}
              width={5}
              height={3}
              rx={0.4}
              fill="rgba(255,255,255,0.2)"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={0.15}
            />
            {/* Label */}
            <text
              x={88}
              y={29}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize={0.7}
              fontWeight="700"
              letterSpacing={0.3}
              transform="rotate(90, 88, 29)"
            >
              50ft RUNWAY
            </text>
            {/* Stage label */}
            <text
              x={88}
              y={6.5}
              textAnchor="middle"
              dominantBaseline="central"
              fill="rgba(255,255,255,0.5)"
              fontSize={0.65}
              fontWeight="600"
            >
              STAGE
            </text>
          </g>
        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="absolute bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-md border-t border-pink-500/20 p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-300">
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
                  <span className="px-2.5 py-1 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 text-xs font-medium">
                    Reception: {selected.capacity.reception}
                  </span>
                )}
                {selected.capacity.theatre && (
                  <span className="px-2.5 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-xs font-medium">
                    Theatre: {selected.capacity.theatre}
                  </span>
                )}
                {selected.capacity.rounds && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-medium">
                    Rounds: {selected.capacity.rounds}
                  </span>
                )}
                {selected.capacity.school && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-medium">
                    School: {selected.capacity.school}
                  </span>
                )}
                {selected.capacity.uShape && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium">
                    U-Shape: {selected.capacity.uShape}
                  </span>
                )}
                {selected.capacity.conference && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium">
                    Conference: {selected.capacity.conference}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(255,50,130,0.5)" }} />
          <span>Indoor Venues</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(0,230,118,0.45)" }} />
          <span>Outdoor Spaces</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(0,180,255,0.55)" }} />
          <span>Pool Area</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: "rgba(0,210,255,0.3)" }} />
          <span>Atlantic Ocean</span>
        </div>
      </div>
    </div>
  );
}
