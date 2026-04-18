"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { X, MapPin, Sparkles, Maximize2, Minimize2 } from "lucide-react";

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
  gradient: string; // gradient ID reference
  labelSize?: "xs" | "sm" | "md" | "lg";
  shape?: "rect" | "pool";
  verticalLabel?: boolean;
  icon?: string;
  description?: string;
  sponsorNote?: string;
}

const ROOMS: Room[] = [
  {
    id: "collins-ave", name: "Collins Ave", shortName: "Collins Ave — Miami Beach",
    x: 0, y: 1, width: 5, height: 55, gradient: "roadGrad", labelSize: "sm", verticalLabel: true,
    description: "The iconic Collins Avenue — Miami Beach's most famous boulevard. Guests arrive by luxury vehicles, rideshare, and limousine directly to the hotel's front entrance.",
    sponsorNote: "Sponsor opportunity: Branded rideshare codes, vehicle wraps, or arrival lounge signage visible to all guests.",
  },
  {
    id: "valet", name: "Valet Drop-Off", shortName: "Valet 🚗",
    x: 5.5, y: 1, width: 5, height: 55, gradient: "valetGrad", labelSize: "md", verticalLabel: true,
    description: "White-glove valet service where every guest gets the VIP treatment from the moment they step out of their vehicle. First impressions start here.",
    sponsorNote: "Sponsor opportunity: Branded valet tickets, welcome gift bags, or a featured luxury vehicle display.",
  },
  {
    id: "grand-entrance", name: "Grand Entrance — Outdoor Arrival Area", shortName: " ",
    x: 11, y: 1, width: 10, height: 55, gradient: "entranceGrad", labelSize: "lg", icon: "🎪",
    description: "A show-stopping outdoor arrival experience. Guests walk the 20ft red carpet past a photo wall lined with paparazzi and media photographers. This is where the magic begins — every arrival is a moment.",
    sponsorNote: "Sponsor opportunity: Step-and-repeat branding, red carpet naming rights, branded photo moments shared across social media by 150+ models and influencers.",
  },
  {
    id: "cabanas", name: "Cabanas", shortName: "☀️ Cabanas",
    x: 67, y: 1, width: 20, height: 6, gradient: "cabanasGrad", labelSize: "sm",
    description: "Private poolside cabanas offering shade, bottle service, and an exclusive retreat for VIP guests, designers, and talent between shows.",
    sponsorNote: "Sponsor opportunity: Branded cabana takeover with custom décor, product sampling, or an exclusive gifting suite for top-tier guests.",
  },
  {
    id: "mezzanine", name: "Mezzanine (Upstairs)", shortName: "Mezzanine\n⬆ Upstairs",
    dimensions: "24' × 68'", sqft: 1632, ceilingHeight: "9'", capacity: { reception: 200 },
    x: 22, y: 3, width: 8, height: 22, gradient: "mezzGrad", labelSize: "sm",
    description: "An elevated indoor lounge overlooking the property. The Mezzanine hosts VIP receptions, designer meet-and-greets, and intimate pre-show cocktail hours for up to 200 guests.",
    sponsorNote: "Sponsor opportunity: Exclusive naming rights, branded cocktail menu, or a VIP lounge takeover with your brand front and center.",
  },
  {
    id: "silan-restaurant", name: "Silan Restaurant", shortName: "Silan\nRestaurant 🍽️",
    dimensions: "39' × 63'8\"", sqft: 1233, ceilingHeight: "8'",
    capacity: { reception: 90, rounds: 76, theatre: 95, school: 60, uShape: 45, hollowSquare: 55, conference: 48 },
    x: 32, y: 3, width: 16, height: 14, gradient: "restaurantGrad",
    description: "The hotel's signature restaurant transformed into an exclusive dining experience during Swim Week. Host a private dinner for designers, buyers, or press — where deals are made over world-class cuisine.",
    sponsorNote: "Sponsor opportunity: Branded dinner series, menu integration, table centerpiece branding, or a full restaurant buyout for an invite-only event.",
  },
  {
    id: "designer-showroom", name: "Designer Showroom + Live Shopping", shortName: "Designer Showroom\n+ Live Shopping 🛍️",
    dimensions: "35' × 39'", sqft: 1365,
    x: 50, y: 3, width: 14, height: 14, gradient: "hqGrad",
    description: "An exclusive showroom where designers display their collections and fans can shop live. Browse runway pieces up close, meet the designers, and purchase directly — with live-streamed shopping events throughout the week.",
    sponsorNote: "Sponsor opportunity: Branded showroom displays, live shopping integrations, product placement, or a pop-up retail activation alongside top designers.",
  },
  {
    id: "backstage-digis", name: "EXA Models HQ — Check-In + Shows Backstage + Digis Media", shortName: "EXA Models HQ\nCheck-In\n+ Shows Backstage\n+ Digis Media 🎬",
    dimensions: "58' × 84'", sqft: 4872, ceilingHeight: "12' / 11.5'",
    capacity: { reception: 400, rounds: 300, theatre: 420, school: 250 },
    x: 22, y: 28, width: 16, height: 24, gradient: "ballroomGrad", labelSize: "lg",
    description: "The nerve center of EXA operations. Every model, designer, and VIP checks in here. Hair, makeup, styling, and last-minute fittings happen backstage while Digis Media captures exclusive behind-the-scenes content — the footage brands dream of being part of.",
    sponsorNote: "Sponsor opportunity: Welcome gift bags for every model, branded check-in experience, official hair/makeup/skincare sponsor station, branded styling mirrors, product placement in all BTS content reaching 1M+ social impressions.",
  },
  {
    id: "wellness-activation", name: "Wellness Activation Space", shortName: "Wellness\nActivation 🧘‍♀️",
    sqft: 3690, capacity: { reception: 400, rounds: 260, theatre: 300, school: 200 },
    x: 40, y: 30, width: 29, height: 16, gradient: "wellnessGrad",
    description: "A 3,690 sq ft open-air activation zone designed for wellness, beauty, and lifestyle brands to create immersive experiences. Think: yoga sessions at sunrise, IV drip lounges, skincare demos, smoothie bars, and interactive brand pop-ups — all attended by models, influencers, and Swim Week's most stylish crowd.",
    sponsorNote: "Sponsor opportunity: Full activation buildout, branded experiences, product launches, sampling stations, or a multi-day pop-up shop. This is your canvas.",
  },
  {
    id: "lower-pool", name: "Lower Pool", shortName: "Lower\nPool 💧",
    x: 68, y: 9, width: 16, height: 16, gradient: "poolGrad", labelSize: "sm", shape: "pool",
    description: "A stunning resort-style pool surrounded by lounge chairs and tropical landscaping. The daytime social hub where models, guests, and influencers gather between shows.",
    sponsorNote: "Sponsor opportunity: Branded pool floats, towel wraps, poolside sampling, or a sponsored pool party with DJ and branded wristbands.",
  },
  {
    id: "exa-bar", name: "EXA Tiki Bar", shortName: "🍹 EXA Tiki Bar 🌴",
    x: 70, y: 26, width: 14, height: 6, gradient: "barGrad", labelSize: "sm",
    description: "The EXA Tiki Bar — a tropical open-air bar serving handcrafted cocktails, cold brews, and island vibes. Steps from both pools, this is where everyone ends up. The perfect spot for a signature cocktail collab.",
    sponsorNote: "Sponsor opportunity: Signature branded cocktail, bar naming rights, custom branded cups, or a liquor/beverage brand takeover for the full week.",
  },
  {
    id: "heated-pool", name: "Upper Adult Pool", shortName: "Upper\nAdult Pool 🌊",
    x: 69, y: 36, width: 18, height: 18, gradient: "poolGrad", shape: "pool",
    description: "A heated saltwater pool perfect for evening soirées and sunset gatherings. The warm, luxurious water and ambient lighting create an unforgettable atmosphere after dark.",
    sponsorNote: "Sponsor opportunity: Evening pool party sponsor, underwater lighting branding, branded robes, or a sunset cocktail hour activation.",
  },
  // EXA Swim Shows is rendered as a static background — chairs/VIP are the clickable elements
  {
    id: "boardwalk", name: "Miami Beach Boardwalk",
    x: 103.5, y: 1, width: 3, height: 55, gradient: "boardwalkGrad", labelSize: "xs", verticalLabel: true,
    description: "The famous Miami Beach Boardwalk running along the oceanfront. Thousands of beachgoers and tourists walk past daily — organic exposure for any activation visible from this path.",
    sponsorNote: "Sponsor opportunity: Branded signage, banners, or a sampling station catching high foot traffic from the public boardwalk.",
  },
  {
    id: "sand-beach", name: "Sand Beach", shortName: "Beach",
    x: 107, y: 1, width: 7.5, height: 55, gradient: "sandGrad", labelSize: "lg", verticalLabel: true,
    description: "White sand beach and swaying palm trees with the Atlantic Ocean as the backdrop. The ultimate setting for content creation, lifestyle photography, and brand storytelling that screams Miami.",
    sponsorNote: "Sponsor opportunity: Beach activation zone, branded beach chairs/umbrellas, sand sculptures, or a sunrise yoga session presented by your brand.",
  },
];

export function HotelFloorPlan() {
  const [selected, setSelected] = useState<Room | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // On mobile (non-fullscreen), tapping the map should enlarge it, not open room popups
  const handleRoomClick = useCallback((room: Room, isAlreadySelected: boolean) => {
    if (!isFullscreen && isMobile) {
      setIsFullscreen(true);
      return;
    }
    setSelected(isAlreadySelected ? null : room);
  }, [isFullscreen, isMobile]);

  const renderShape = (room: Room, isHovered: boolean, isSelected: boolean) => {
    const stroke = isSelected ? "url(#pinkNeon)" : isHovered ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.12)";
    const sw = isSelected ? 0.5 : isHovered ? 0.25 : 0.12;
    const filter = isSelected ? "url(#neonGlow)" : isHovered ? "url(#glow)" : undefined;

    if (room.shape === "pool") {
      const cx = room.x + room.width / 2, cy = room.y + room.height / 2;
      const rx = room.width / 2 - 0.5, ry = room.height / 2 - 0.5;
      return (
        <>
          <path
            d={`M ${cx - rx * 0.3} ${cy - ry} C ${cx + rx * 0.6} ${cy - ry * 1.15}, ${cx + rx * 1.1} ${cy - ry * 0.4}, ${cx + rx * 0.85} ${cy + ry * 0.1} C ${cx + rx * 0.6} ${cy + ry * 0.6}, ${cx + rx * 0.9} ${cy + ry * 1.1}, ${cx + rx * 0.1} ${cy + ry} C ${cx - rx * 0.5} ${cy + ry * 0.9}, ${cx - rx * 1.1} ${cy + ry * 0.5}, ${cx - rx * 0.95} ${cy - ry * 0.1} C ${cx - rx * 0.8} ${cy - ry * 0.7}, ${cx - rx * 0.9} ${cy - ry * 0.95}, ${cx - rx * 0.3} ${cy - ry} Z`}
            fill={`url(#${room.gradient})`}
            stroke={stroke}
            strokeWidth={sw}
            filter={filter}
            style={{ transition: "all 0.3s ease" }}
          />
          {/* Water ripple animation */}
          <circle cx={cx - 1} cy={cy} r={0} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={0.08}>
            <animate attributeName="r" from="0" to={rx * 0.6} dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.3" to="0" dur="3s" repeatCount="indefinite" />
          </circle>
          <circle cx={cx + 1} cy={cy + 1} r={0} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.06}>
            <animate attributeName="r" from="0" to={rx * 0.5} dur="4s" begin="1.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" from="0.2" to="0" dur="4s" begin="1.5s" repeatCount="indefinite" />
          </circle>
        </>
      );
    }

    return (
      <rect x={room.x} y={room.y} width={room.width} height={room.height} rx={0.8}
        fill={`url(#${room.gradient})`} stroke={stroke} strokeWidth={sw} filter={filter}
        style={{ transition: "all 0.3s ease" }}
      />
    );
  };

  return (
    <div className="relative w-full">
      {/* Premium Title */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 border border-white/10">
          <MapPin className="h-6 w-6 text-pink-400" />
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
            EXA Venue: Hotel Alexander Miami Beach
          </h2>
          <p className="text-sm text-zinc-500">5225 Collins Ave, Miami Beach, FL 33140</p>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm" onClick={() => { setIsFullscreen(false); setSelected(null); }} />
      )}

      {/* Map Container with neon border */}
      <div className={`relative rounded-2xl overflow-hidden bg-zinc-950/90 backdrop-blur-sm ${isFullscreen ? "fixed inset-4 z-50 overflow-y-auto" : ""}`}
        style={{ boxShadow: "0 0 40px rgba(255,50,130,0.08), 0 0 80px rgba(0,210,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)" }}
      >
        {/* Animated gradient border */}
        <div className="absolute inset-0 rounded-2xl p-[1px] pointer-events-none"
          style={{ background: "linear-gradient(135deg, rgba(255,50,130,0.3), rgba(168,85,247,0.2), rgba(0,210,255,0.3), rgba(0,230,118,0.2), rgba(255,50,130,0.3))", backgroundSize: "300% 300%", animation: "gradientBorder 8s ease infinite" }}
        />

        {/* Expand / Collapse button */}
        <button
          onClick={() => { if (isFullscreen) setSelected(null); setIsFullscreen(!isFullscreen); }}
          className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 hover:border-pink-500/40 transition-all"
          title={isFullscreen ? "Exit fullscreen" : "Enlarge map"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4 text-white/70" />
          ) : (
            <Maximize2 className="h-4 w-4 text-white/70" />
          )}
        </button>

        {/* Mobile tap-to-enlarge hint */}
        {!isFullscreen && (
          <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none md:hidden">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 border border-white/10 text-xs text-white/70 backdrop-blur-sm">
              <Maximize2 className="h-3 w-3" /> Tap to enlarge map
            </span>
          </div>
        )}

        <svg viewBox="-12 0 139 58" className="w-full h-auto relative"
          onClick={(e) => {
            // If clicking SVG background on mobile (not fullscreen), enlarge
            if (!isFullscreen && isMobile && e.target === e.currentTarget) {
              setIsFullscreen(true);
            }
          }}
        >
          <defs>
            {/* === GRADIENTS === */}
            {/* MIAMI BEACH COLORS — bright, sexy, pop */}
            <linearGradient id="roadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(100,100,110,0.5)" />
              <stop offset="100%" stopColor="rgba(80,80,90,0.4)" />
            </linearGradient>
            <linearGradient id="valetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,210,0,0.5)" />
              <stop offset="100%" stopColor="rgba(255,180,0,0.4)" />
            </linearGradient>
            <linearGradient id="entranceGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(200,50,255,0.35)" />
              <stop offset="100%" stopColor="rgba(255,50,150,0.3)" />
            </linearGradient>
            <linearGradient id="cabanasGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,160,0,0.6)" />
              <stop offset="100%" stopColor="rgba(255,100,0,0.5)" />
            </linearGradient>
            <linearGradient id="mezzGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(180,60,255,0.65)" />
              <stop offset="100%" stopColor="rgba(140,40,220,0.5)" />
            </linearGradient>
            <linearGradient id="restaurantGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,200,0,0.6)" />
              <stop offset="100%" stopColor="rgba(255,170,0,0.5)" />
            </linearGradient>
            <linearGradient id="hqGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(0,220,255,0.6)" />
              <stop offset="100%" stopColor="rgba(0,180,240,0.5)" />
            </linearGradient>
            <linearGradient id="ballroomGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,30,120,0.6)" />
              <stop offset="100%" stopColor="rgba(255,0,90,0.45)" />
            </linearGradient>
            <linearGradient id="wellnessGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(0,255,130,0.55)" />
              <stop offset="100%" stopColor="rgba(0,220,100,0.4)" />
            </linearGradient>
            <linearGradient id="poolGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(0,200,255,0.7)" />
              <stop offset="50%" stopColor="rgba(0,170,250,0.6)" />
              <stop offset="100%" stopColor="rgba(0,150,230,0.65)" />
            </linearGradient>
            <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,100,0,0.7)" />
              <stop offset="100%" stopColor="rgba(255,60,0,0.55)" />
            </linearGradient>
            <linearGradient id="showsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,50,130,0.15)" />
              <stop offset="50%" stopColor="rgba(255,30,100,0.08)" />
              <stop offset="100%" stopColor="rgba(255,50,130,0.15)" />
            </linearGradient>
            <linearGradient id="boardwalkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(210,160,130,0.7)" />
              <stop offset="50%" stopColor="rgba(190,140,110,0.6)" />
              <stop offset="100%" stopColor="rgba(220,170,140,0.65)" />
            </linearGradient>
            {/* Coral stone pattern for boardwalk */}
            <pattern id="coralStones" x="0" y="0" width="3" height="3" patternUnits="userSpaceOnUse">
              <rect width="3" height="3" fill="none" />
              <rect x="0.1" y="0.1" width="1.3" height="1.3" rx="0.3" fill="rgba(230,180,150,0.3)" stroke="rgba(200,150,120,0.4)" strokeWidth="0.08" />
              <rect x="1.6" y="0.1" width="1.2" height="1.2" rx="0.25" fill="rgba(220,170,140,0.25)" stroke="rgba(190,140,110,0.35)" strokeWidth="0.08" />
              <rect x="0.3" y="1.6" width="1.1" height="1.2" rx="0.3" fill="rgba(240,190,160,0.28)" stroke="rgba(210,160,130,0.4)" strokeWidth="0.08" />
              <rect x="1.7" y="1.5" width="1.2" height="1.3" rx="0.25" fill="rgba(225,175,145,0.3)" stroke="rgba(195,145,115,0.35)" strokeWidth="0.08" />
            </pattern>
            <linearGradient id="sandGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,220,120,0.65)" />
              <stop offset="100%" stopColor="rgba(245,200,100,0.55)" />
            </linearGradient>
            <linearGradient id="pinkNeon" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,50,130,1)" />
              <stop offset="100%" stopColor="rgba(0,210,255,1)" />
            </linearGradient>
            <linearGradient id="runwayTextGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
              <stop offset="40%" stopColor="rgba(220,180,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.95)" />
            </linearGradient>
            <linearGradient id="oceanGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,180,255,0.35)" />
              <stop offset="100%" stopColor="rgba(0,120,200,0.55)" />
            </linearGradient>
            <linearGradient id="intracoastalGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(0,100,180,0.5)" />
              <stop offset="50%" stopColor="rgba(0,140,200,0.4)" />
              <stop offset="100%" stopColor="rgba(0,160,220,0.35)" />
            </linearGradient>

            {/* === FILTERS === */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="neonGlow">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="spotGlow">
              <feGaussianBlur stdDeviation="2" />
            </filter>

            {/* Wave pattern */}
            <pattern id="waves" x="0" y="0" width="6" height="3" patternUnits="userSpaceOnUse">
              <path d="M 0 1.5 Q 1.5 0.3, 3 1.5 Q 4.5 2.7, 6 1.5" fill="none" stroke="rgba(0,210,255,0.45)" strokeWidth="0.3">
                <animateTransform attributeName="transform" type="translate" from="0 0" to="-6 0" dur="2.5s" repeatCount="indefinite" />
              </path>
            </pattern>

            {/* Road lane markings */}
            <pattern id="roadMarks" x="0" y="0" width="1.5" height="4" patternUnits="userSpaceOnUse">
              <rect x="0.65" y="0" width="0.2" height="2" rx="0.1" fill="rgba(255,255,255,0.15)" />
            </pattern>

          </defs>

          {/* Background */}
          <rect x="-12" width="139" height="58" fill="rgba(15,15,20,1)" />

          {/* Subtle grid */}
          <g opacity="0.4">
            {Array.from({ length: 24 }).map((_, i) => (
              <line key={`gv-${i}`} x1={i * 5} y1={0} x2={i * 5} y2={58} stroke="rgba(255,255,255,0.02)" strokeWidth="0.05" />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`gh-${i}`} x1={0} y1={i * 5} x2={120} y2={i * 5} stroke="rgba(255,255,255,0.02)" strokeWidth="0.05" />
            ))}
          </g>

          {/* === ATLANTIC OCEAN === */}
          <g>
            <rect x="115" y="0" width="12" height="58" fill="url(#oceanGrad)" />
            <rect x="115" y="0" width="12" height="58" fill="url(#waves)" opacity="0.9" />
            <path d="M 118 0 Q 117.4 5, 118 10 Q 118.6 15, 118 20 Q 117.4 25, 118 30 Q 118.6 35, 118 40 Q 117.4 45, 118 50 Q 118.6 55, 118 58" fill="none" stroke="rgba(0,210,255,0.3)" strokeWidth="0.2">
              <animate attributeName="d" dur="3.5s" repeatCount="indefinite" values="M 111 0 Q 110.4 5, 111 10 Q 111.6 15, 111 20 Q 110.4 25, 111 30 Q 111.6 35, 111 40 Q 110.4 45, 111 50 Q 111.6 55, 111 58;M 111 0 Q 111.6 5, 111 10 Q 110.4 15, 111 20 Q 111.6 25, 111 30 Q 110.4 35, 111 40 Q 111.6 45, 111 50 Q 110.4 55, 111 58;M 111 0 Q 110.4 5, 111 10 Q 111.6 15, 111 20 Q 110.4 25, 111 30 Q 111.6 35, 111 40 Q 110.4 45, 111 50 Q 111.6 55, 111 58" />
            </path>
            <path d="M 122 0 Q 121.4 4, 122 8 Q 122.6 12, 122 16 Q 121.4 20, 122 24 Q 122.6 28, 122 32 Q 121.4 36, 122 40 Q 122.6 44, 122 48 Q 121.4 52, 122 58" fill="none" stroke="rgba(0,210,255,0.2)" strokeWidth="0.15">
              <animate attributeName="d" dur="4.5s" repeatCount="indefinite" values="M 115 0 Q 114.4 4, 115 8 Q 115.6 12, 115 16 Q 114.4 20, 115 24 Q 115.6 28, 115 32 Q 114.4 36, 115 40 Q 115.6 44, 115 48 Q 114.4 52, 115 58;M 115 0 Q 115.6 4, 115 8 Q 114.4 12, 115 16 Q 115.6 20, 115 24 Q 114.4 28, 115 32 Q 115.6 36, 115 40 Q 114.4 44, 115 48 Q 115.6 52, 115 58;M 115 0 Q 114.4 4, 115 8 Q 115.6 12, 115 16 Q 114.4 20, 115 24 Q 115.6 28, 115 32 Q 114.4 36, 115 40 Q 115.6 44, 115 48 Q 114.4 52, 115 58" />
            </path>
            <text x="121" y="29" textAnchor="middle" fill="rgba(0,210,255,0.7)" fontSize="1.8" fontWeight="900" letterSpacing="0.5" transform="rotate(90, 121, 29)">ATLANTIC OCEAN</text>
          </g>

          {/* === EXA SWIM SHOWS — clickable → opens tickets popup === */}
          <rect x={87} y={1} width={16} height={55} rx={0.8} fill="url(#showsGrad)" stroke="rgba(255,255,255,0.12)" strokeWidth={0.12} style={{ pointerEvents: "none" }} />

          {/* === INTRACOASTAL WATERWAY === */}
          <g>
            <rect x={-12} y={0} width={12} height={58} fill="url(#intracoastalGrad)" />
            <rect x={-12} y={0} width={12} height={58} fill="url(#waves)" opacity="0.5" />
            {/* Yachts */}
            <g style={{ pointerEvents: "none" }}>
              {/* Yacht 1 */}
              <text x={-8} y={12} textAnchor="middle" dominantBaseline="central" fontSize={2.5}>🛥️</text>
              {/* Yacht 2 */}
              <text x={-5} y={28} textAnchor="middle" dominantBaseline="central" fontSize={2.2}>⛵</text>
              {/* Yacht 3 */}
              <text x={-8.5} y={42} textAnchor="middle" dominantBaseline="central" fontSize={2.5}>🛥️</text>
            </g>
            <text x={-6} y={29} textAnchor="middle" fill="rgba(0,180,255,0.6)" fontSize={1.4} fontWeight="900" letterSpacing={0.3} transform="rotate(90, -6, 29)">INTRACOASTAL</text>
            <text x={-6} y={52} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize={0.5} fontWeight="600">Yacht Rentals</text>
            <text x={-6} y={53.5} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={0.4}>Brand Photoshoots</text>
          </g>

          {/* === ROAD LANE MARKINGS on Collins Ave === */}
          <rect x="0" y="1" width="3" height="55" fill="url(#roadMarks)" />

          {/* === Rooms === */}
          {ROOMS.map((room) => {
            const isH = hovered === room.id;
            const isS = selected?.id === room.id;
            const fs = room.labelSize === "lg" ? 1.6 : room.labelSize === "xs" ? 0.75 : room.labelSize === "sm" ? 1.0 : 1.2;
            const label = room.shortName || room.name;
            const lines = label.split("\n");
            const hasSqft = !!room.sqft;

            return (
              <g key={room.id} className="cursor-pointer"
                onClick={() => handleRoomClick(room, isS)}
                onMouseEnter={() => setHovered(room.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {renderShape(room, isH, isS)}

                {room.verticalLabel ? (
                  <text x={room.x + room.width / 2} y={room.y + room.height / 2}
                    textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.65)"
                    fontSize={fs} fontWeight="600"
                    transform={`rotate(90, ${room.x + room.width / 2}, ${room.y + room.height / 2})`}
                    style={{ pointerEvents: "none" }}
                  >{label.replace("\n", " — ")}</text>
                ) : (
                  <>
                    {lines.map((line, i) => {
                      const totalH = lines.length * fs * 1.3 + (hasSqft ? fs * 1.2 : 0);
                      const startY = room.y + room.height / 2 - totalH / 2 + fs * 0.6;
                      return (
                        <text key={i} x={room.x + room.width / 2} y={startY + i * fs * 1.3}
                          textAnchor="middle" dominantBaseline="central" fill="white"
                          fontSize={fs} fontWeight="700"
                          style={{ pointerEvents: "none", textShadow: "0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.5)" }}
                        >{line}</text>
                      );
                    })}
                    {hasSqft && (
                      <text x={room.x + room.width / 2}
                        y={room.y + room.height / 2 + lines.length * fs * 0.5 + fs * 0.5}
                        textAnchor="middle" dominantBaseline="central"
                        fill="rgba(255,255,255,0.45)" fontSize={fs * 0.65}
                        style={{ pointerEvents: "none" }}
                      >{room.sqft!.toLocaleString()} sq ft</text>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* === CORAL STONE OVERLAY on boardwalk === */}
          <rect x={103.5} y={1} width={3} height={55} fill="url(#coralStones)" style={{ pointerEvents: "none" }} />

          {/* === RED CARPET — top 40% of Grand Entrance (y:1 to y:23) === */}
          <g style={{ pointerEvents: "none" }}>
            {/* Glow behind */}
            <rect x={10.5} y={0.5} width={11} height={23} rx={1} fill="rgba(220,20,20,0.05)" filter="url(#spotGlow)" />
            {/* Red carpet surface — top 40% */}
            <rect x={11} y={1} width={10} height={22} rx={0.5} fill="rgba(200,20,20,0.5)" stroke="rgba(255,60,60,0.5)" strokeWidth={0.12} />
            {/* Gold trim top & bottom */}
            <line x1={11} y1={1} x2={21} y2={1} stroke="rgba(255,200,50,0.7)" strokeWidth={0.18} />
            <line x1={11} y1={23} x2={21} y2={23} stroke="rgba(255,200,50,0.7)" strokeWidth={0.18} />
            {/* Gold trim sides */}
            <line x1={11} y1={1} x2={11} y2={23} stroke="rgba(255,200,50,0.5)" strokeWidth={0.12} />
            <line x1={21} y1={1} x2={21} y2={23} stroke="rgba(255,200,50,0.5)" strokeWidth={0.12} />
            {/* Camera flash bursts */}
            <circle cx={13} cy={5} r={0.5} fill="rgba(255,255,255,0.15)">
              <animate attributeName="opacity" values="0;0.6;0" dur="2s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx={19} cy={7} r={0.4} fill="rgba(255,255,255,0.15)">
              <animate attributeName="opacity" values="0;0.5;0" dur="2.5s" begin="0.7s" repeatCount="indefinite" />
            </circle>
            <circle cx={14} cy={18} r={0.45} fill="rgba(255,255,255,0.15)">
              <animate attributeName="opacity" values="0;0.5;0" dur="1.8s" begin="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={18} cy={15} r={0.35} fill="rgba(255,255,255,0.15)">
              <animate attributeName="opacity" values="0;0.4;0" dur="2.2s" begin="0.3s" repeatCount="indefinite" />
            </circle>
            {/* Animated sparkles */}
            <text x={12.5} y={9} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={0.8}>✦
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="1.5s" repeatCount="indefinite" />
            </text>
            <text x={19.5} y={13} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={0.7}>✦
              <animate attributeName="opacity" values="0.1;0.7;0.1" dur="2s" begin="0.5s" repeatCount="indefinite" />
            </text>
            <text x={13} y={20} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={0.6}>✦
              <animate attributeName="opacity" values="0.15;0.6;0.15" dur="1.8s" begin="1s" repeatCount="indefinite" />
            </text>
            <text x={18.5} y={4} textAnchor="middle" fill="rgba(255,200,50,0.5)" fontSize={0.7}>✨
              <animate attributeName="opacity" values="0.1;0.9;0.1" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
            </text>
            <text x={14} y={16} textAnchor="middle" fill="rgba(255,200,50,0.5)" fontSize={0.6}>✨
              <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2s" begin="1.2s" repeatCount="indefinite" />
            </text>
            {/* Shimmer overlay */}
            <rect x={11} y={1} width={10} height={22} rx={0.5} fill="rgba(255,255,255,0.05)">
              <animate attributeName="opacity" values="0;0.12;0" dur="3s" repeatCount="indefinite" />
            </rect>
            {/* Main label */}
            <text x={16} y={10} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.95)" fontSize={1.1} fontWeight="900" letterSpacing={0.2}>
              RED CARPET
            </text>
            <text x={16} y={12.5} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.6)" fontSize={0.6} fontWeight="600">
              📸 Photo Wall • Glamour
            </text>
            {/* Arrow W→E */}
            <path d="M 19 16 L 20.5 16 M 20 15.3 L 20.5 16 L 20 16.7" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={0.12} strokeLinecap="round" />
            <text x={16} y={16} textAnchor="middle" dominantBaseline="central" fill="rgba(255,200,50,0.6)" fontSize={0.45} fontWeight="600">20ft wide • W → E</text>
          </g>

          {/* === "Grand Entrance" label — bottom 60% of entrance, below red carpet === */}
          <g style={{ pointerEvents: "none" }}>
            <text x={16} y={38} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={1.6} fontWeight="700"
              style={{ textShadow: "0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.5)" }}>
              Grand
            </text>
            <text x={16} y={40.5} textAnchor="middle" dominantBaseline="central" fill="white" fontSize={1.6} fontWeight="700"
              style={{ textShadow: "0 0 6px rgba(0,0,0,1), 0 0 12px rgba(0,0,0,0.5)" }}>
              Entrance
            </text>
          </g>

          {/* === MODEL TOUCH-UP TENT — north of stage === */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={88} y={3} width={14} height={7} rx={0.6}
              fill="rgba(168,85,247,0.15)" stroke="rgba(168,85,247,0.3)" strokeWidth={0.1} />
            <text x={95} y={5.5} textAnchor="middle" dominantBaseline="central"
              fill="rgba(255,255,255,0.6)" fontSize={0.65} fontWeight="700">
              💄 Model Touch-Up Tent
            </text>
            <text x={95} y={7.5} textAnchor="middle" dominantBaseline="central"
              fill="rgba(255,255,255,0.35)" fontSize={0.45}>
              Hair • Makeup • Final Fittings
            </text>
          </g>

          {/* === 50ft RUNWAY with stage lights === */}
          <g style={{ pointerEvents: "none" }}>
            {/* Spotlight cones from stage */}
            <polygon points="92.0,13 86.0,29 88.0,29" fill="rgba(255,255,255,0.03)" />
            <polygon points="98.0,13 102.0,29 104.0,29" fill="rgba(255,255,255,0.03)" />
            {/* Stage platform — wider */}
            <rect x={89.5} y={12} width={11} height={3.5} rx={0.5} fill="rgba(255,255,255,0.6)" stroke="rgba(255,255,255,0.8)" strokeWidth={0.15} />
            <text x={95.0} y={13.8} textAnchor="middle" dominantBaseline="central" fill="rgba(60,60,60,0.9)" fontSize={0.7} fontWeight="800">STAGE</text>
            {/* Runway glow */}
            <rect x={93.0} y={15} width={4} height={33.5} rx={0.5} fill="rgba(255,255,255,0.08)" />
            {/* Runway surface — WHITE, attached to stage bottom (15.5) down to media pit (48.5) */}
            <rect x={93.5} y={15.5} width={3} height={33} rx={0.4} fill="rgba(255,255,255,0.55)" stroke="rgba(255,255,255,0.7)" strokeWidth={0.15} />
            {/* Runway edge lights */}
            {Array.from({ length: 10 }).map((_, i) => (
              <g key={`rl-${i}`}>
                <circle cx={93.5} cy={16.5 + i * 3.4} r={0.2} fill="rgba(255,50,130,0.7)" />
                <circle cx={96.5} cy={16.5 + i * 3.4} r={0.2} fill="rgba(0,210,255,0.7)" />
              </g>
            ))}
            {/* Center line */}
            <line x1={95.0} y1={16.5} x2={95.0} y2={48} stroke="rgba(200,200,200,0.3)" strokeWidth={0.1} strokeDasharray="1 0.8" />
            <text x={95.0} y={33} textAnchor="middle" fill="url(#runwayTextGrad)" fontSize={0.95} fontWeight="900" letterSpacing={0.4} fontStyle="italic" transform="rotate(90, 95.0, 33)" filter="url(#neonGlow)">EXA Swim Shows Runway</text>
          </g>

          {/* === MEDIA PIT === */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={91.5} y={49} width={7} height={6} rx={0.5} fill="rgba(255,50,130,0.25)" stroke="rgba(255,50,130,0.5)" strokeWidth={0.12} strokeDasharray="0.5 0.3" />
            {[0, 1, 2].map((row) => [0, 1, 2, 3].map((col) => (
              <rect key={`m-${row}-${col}`} x={92.2 + col * 1.4} y={49.8 + row * 1.6} width={0.8} height={0.8} rx={0.2} fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)" strokeWidth={0.05} />
            )))}
            <text x={95.0} y={52} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.95)" fontSize={2.5}>📸</text>
          </g>

          {/* === SEATING — East Row 2 === */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={98.3} y={15.5} width={1.6} height={33} rx={0.3} fill="rgba(255,255,255,0.05)" />
            {Array.from({ length: 30 }).map((_, i) => (
              <rect key={`e2-${i}`} x={98.5} y={16 + i * 1.07} width={1.0} height={0.7} rx={0.15} fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.6)" strokeWidth={0.05} />
            ))}
          </g>

          {/* === SEATING — East Row 1 / Front Row === */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={96.3} y={15.5} width={1.6} height={33} rx={0.3} fill="rgba(255,255,255,0.05)" />
            {Array.from({ length: 30 }).map((_, i) => (
              <rect key={`e1-${i}`} x={96.7} y={16 + i * 1.07} width={1.0} height={0.7} rx={0.15} fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.6)" strokeWidth={0.05} />
            ))}
          </g>

          {/* === SEATING — West / Front Row === */}
          <g style={{ pointerEvents: "none" }}>
            <rect x={92} y={15.5} width={1.6} height={33} rx={0.3} fill="rgba(255,255,255,0.05)" />
            {Array.from({ length: 30 }).map((_, i) => (
              <rect key={`w-${i}`} x={92.5} y={16 + i * 1.07} width={1.0} height={0.7} rx={0.15} fill="rgba(255,255,255,0.45)" stroke="rgba(255,255,255,0.6)" strokeWidth={0.05} />
            ))}
          </g>

          {/* === VIP BOOTHS === */}
          {[0, 1, 2, 3].map((i) => {
            const by = 18 + i * 7;
            return (
              <g key={`vip-link-${i}`} style={{ pointerEvents: "none" }}>
                <g>
                  <rect x={88} y={by} width={3.5} height={5.5} rx={0.4} fill="rgba(255,200,50,0.15)" stroke="rgba(255,200,50,0.5)" strokeWidth={0.1} />
                  <rect x={89} y={by + 1.2} width={1.6} height={2.5} rx={0.25} fill="rgba(255,255,255,0.35)" stroke="rgba(255,200,50,0.6)" strokeWidth={0.08} />
                  <rect x={88.2} y={by + 1} width={0.5} height={3} rx={0.15} fill="rgba(255,255,255,0.3)" stroke="rgba(168,85,247,0.5)" strokeWidth={0.06} />
                  <rect x={91} y={by + 1} width={0.3} height={3} rx={0.1} fill="rgba(255,255,255,0.25)" stroke="rgba(168,85,247,0.4)" strokeWidth={0.05} />
                  <text x={89.8} y={by + 0.5} textAnchor="middle" dominantBaseline="central" fill="rgba(255,200,50,0.9)" fontSize={0.4} fontWeight="800">VIP {i + 1} 🎟️</text>
                </g>
              </g>
            );
          })}

          {/* === BEACH ENTRANCE — star + palm before "Beach", palm + star after "Entrance" === */}
          <g style={{ pointerEvents: "none" }}>
            {/* Star + Palm before "Beach" */}
            <text x={100.8} y={26.5} textAnchor="middle" dominantBaseline="central" fontSize={1.4}>⭐</text>
            <text x={101.2} y={29} textAnchor="middle" dominantBaseline="central" fontSize={3}>🌴</text>
            {/* "Beach Entrance" vertical text between emojis */}
            <text x={103.5} y={29} textAnchor="middle" fill="rgba(255,255,255,0.95)" fontSize={0.85} fontWeight="900" letterSpacing={0.18}
              transform="rotate(90, 103.5, 29)">Beach Entrance</text>
            {/* Palm + Star after "Entrance" */}
            <text x={105.8} y={29} textAnchor="middle" dominantBaseline="central" fontSize={3}>🌴</text>
            <text x={106.2} y={26.5} textAnchor="middle" dominantBaseline="central" fontSize={1.4}>⭐</text>
          </g>

          {/* === COMPASS ROSE === */}
          <g transform="translate(3.5, 57)" style={{ pointerEvents: "none" }}>
            <circle cx={0} cy={0} r={1.8} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.1)" strokeWidth={0.08} />
            <text x={0} y={-1.0} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.5)" fontSize={0.5} fontWeight="700">N</text>
            <text x={0} y={1.0} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.3)" fontSize={0.4}>S</text>
            <text x={-1.2} y={0} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.3)" fontSize={0.4}>W</text>
            <text x={1.2} y={0} textAnchor="middle" dominantBaseline="central" fill="rgba(255,255,255,0.3)" fontSize={0.4}>E</text>
          </g>

        </svg>

        {/* Detail panel */}
        {selected && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-zinc-900 via-zinc-900/98 to-zinc-900/90 backdrop-blur-xl border-t border-pink-500/20 p-4 md:p-6 animate-in slide-in-from-bottom-4 duration-300">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-white/5">
                <Sparkles className="h-4 w-4 text-pink-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                {selected.description && (
                  <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{selected.description}</p>
                )}
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-400 mt-3">
                  {selected.dimensions && <span>📐 <span className="text-white">{selected.dimensions}</span></span>}
                  {selected.sqft && <span>📏 <span className="text-white">{selected.sqft.toLocaleString()} sq ft</span></span>}
                  {selected.ceilingHeight && <span>📐 Ceiling: <span className="text-white">{selected.ceilingHeight}</span></span>}
                </div>
                {selected.capacity && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selected.capacity.reception && <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-xs font-medium">Reception: {selected.capacity.reception}</span>}
                    {selected.capacity.theatre && <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium">Theatre: {selected.capacity.theatre}</span>}
                    {selected.capacity.rounds && <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-medium">Rounds: {selected.capacity.rounds}</span>}
                    {selected.capacity.school && <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">School: {selected.capacity.school}</span>}
                    {selected.capacity.uShape && <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium">U-Shape: {selected.capacity.uShape}</span>}
                    {selected.capacity.conference && <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium">Conference: {selected.capacity.conference}</span>}
                  </div>
                )}
                {selected.sponsorNote && (
                  <div className="mt-3 px-3 py-2 rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                    <p className="text-xs text-pink-300 font-semibold mb-0.5">💡 Brand & Sponsor Opportunity</p>
                    <p className="text-xs text-zinc-400 leading-relaxed">{selected.sponsorNote}</p>
                    <Link href="/sponsors/miami-swim-week" className="inline-block mt-2 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors">
                      Become a Sponsor →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* CSS animation for gradient border */}
      <style jsx>{`
        @keyframes gradientBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
