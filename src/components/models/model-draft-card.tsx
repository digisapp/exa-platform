"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Plus, Star, Zap } from "lucide-react";

// ─── Tier config keyed by admin_rating (1-5) ─────────────────────────────────

const TIERS = {
  5: {
    label: "ELITE",
    gradient: "from-yellow-300 to-amber-500",
    badge: "bg-gradient-to-r from-yellow-300 to-amber-500 text-black",
    text: "text-yellow-300",
    pickedShadow: "0 0 40px rgba(251,191,36,0.65), 0 0 80px rgba(251,191,36,0.2)",
    hoverShadow: "0 0 20px rgba(251,191,36,0.35)",
    stars: 5,
  },
  4: {
    label: "GOLD",
    gradient: "from-amber-400 to-yellow-600",
    badge: "bg-gradient-to-r from-amber-400 to-yellow-500 text-black",
    text: "text-amber-400",
    pickedShadow: "0 0 30px rgba(245,158,11,0.55), 0 0 60px rgba(245,158,11,0.15)",
    hoverShadow: "0 0 16px rgba(245,158,11,0.3)",
    stars: 4,
  },
  3: {
    label: "SILVER",
    gradient: "from-slate-300 to-cyan-400",
    badge: "bg-gradient-to-r from-slate-300 to-cyan-300 text-black",
    text: "text-slate-300",
    pickedShadow: "0 0 25px rgba(148,163,184,0.5), 0 0 50px rgba(34,211,238,0.15)",
    hoverShadow: "0 0 14px rgba(148,163,184,0.3)",
    stars: 3,
  },
  2: {
    label: "BRONZE",
    gradient: "from-orange-500 to-amber-800",
    badge: "bg-gradient-to-r from-orange-500 to-amber-700 text-white",
    text: "text-orange-500",
    pickedShadow: "0 0 20px rgba(234,88,12,0.45)",
    hoverShadow: "0 0 12px rgba(234,88,12,0.25)",
    stars: 2,
  },
  1: {
    label: "BASE",
    gradient: "from-zinc-500 to-zinc-700",
    badge: "bg-zinc-600 text-white",
    text: "text-zinc-400",
    pickedShadow: "0 0 15px rgba(161,161,170,0.3)",
    hoverShadow: "0 0 8px rgba(161,161,170,0.15)",
    stars: 1,
  },
} as const;

const UNRANKED = {
  label: "ROSTER",
  gradient: "from-zinc-700 to-zinc-800",
  badge: "bg-zinc-800 border border-zinc-700 text-zinc-400",
  text: "text-zinc-500",
  pickedShadow: "0 0 12px rgba(161,161,170,0.2)",
  hoverShadow: "0 0 6px rgba(161,161,170,0.1)",
  stars: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ovrColor(score: number | null) {
  if (score === null) return "text-zinc-500";
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-amber-400";
  if (score >= 60) return "text-orange-400";
  return "text-red-400";
}

function fmtFollowers(n: number | null): string | null {
  if (!n) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

const FOCUS_LABELS: Record<string, string> = {
  fashion: "Fashion", commercial: "Comm", fitness: "Fitness", athlete: "Athlete",
  swimwear: "Swim", beauty: "Beauty", editorial: "Edit",
  ecommerce: "E-Comm", promo: "Promo", luxury: "Luxury", lifestyle: "Life",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DraftModelData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_photo_url: string | null;
  height: string | null;
  dress_size: string | null;
  instagram_followers: number | null;
  city: string | null;
  state: string | null;
  admin_rating: number | null;
  reliability_score: number | null;
  focus_tags?: string[] | null;
}

interface ModelDraftCardProps {
  model: DraftModelData;
  isPicked: boolean;
  onPick: () => void;
  isLoading?: boolean;
  assignedCount?: number;
  variant?: "roster" | "pool";
}

// ─── Pool variant (compact, used in admin shows sidebar) ──────────────────────

function PoolCard({ model, isPicked, onPick, isLoading, assignedCount = 0 }: ModelDraftCardProps) {
  const tier = model.admin_rating ? TIERS[model.admin_rating as keyof typeof TIERS] : UNRANKED;
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.12 }}
      className={`p-[1.5px] rounded-xl bg-gradient-to-br ${tier.gradient}`}
      style={{ boxShadow: isPicked ? tier.pickedShadow : undefined }}
    >
      <button
        onClick={onPick}
        disabled={isLoading}
        className="w-full flex items-center gap-2.5 p-2.5 rounded-[calc(0.75rem-1.5px)] bg-zinc-950 hover:bg-zinc-900 transition-colors text-left"
      >
        <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0">
          {model.profile_photo_url ? (
            <Image src={model.profile_photo_url} alt={model.first_name || ""} fill className="object-cover object-top" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-xs text-white/30">
              {model.first_name?.[0]}{model.last_name?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 truncate">{model.first_name} {model.last_name}</p>
          <p className="text-[10px] text-white/35 truncate">
            {model.height && `${model.height}`}{model.dress_size && ` · Sz ${model.dress_size}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {model.reliability_score !== null && (
            <span className={`text-xs font-black tabular-nums ${ovrColor(model.reliability_score)}`}>
              {model.reliability_score}
            </span>
          )}
          {assignedCount > 0 && (
            <span className="text-[10px] font-bold bg-pink-500/20 text-pink-300 rounded-full px-1.5 py-0.5 leading-none">
              {assignedCount}×
            </span>
          )}
          {isPicked ? (
            <Check className="h-4 w-4 text-pink-400" />
          ) : (
            <Plus className="h-4 w-4 text-white/25" />
          )}
        </div>
      </button>
    </motion.div>
  );
}

// ─── Roster variant (full card, used in draft room) ───────────────────────────

export function ModelDraftCard({ model, isPicked, onPick, isLoading = false, assignedCount = 0, variant = "roster" }: ModelDraftCardProps) {
  if (variant === "pool") {
    return <PoolCard model={model} isPicked={isPicked} onPick={onPick} isLoading={isLoading} assignedCount={assignedCount} />;
  }

  const tier = model.admin_rating ? TIERS[model.admin_rating as keyof typeof TIERS] : UNRANKED;
  const ovr = model.reliability_score;
  const ig = fmtFollowers(model.instagram_followers);
  const primaryFocus = model.focus_tags?.[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      whileHover={{ scale: 1.03, y: -5 }}
      transition={{ duration: 0.18 }}
      className={`p-[2px] rounded-2xl bg-gradient-to-br ${tier.gradient} select-none`}
      style={{ boxShadow: isPicked ? tier.pickedShadow : undefined }}
    >
      <div className="rounded-[calc(1rem-2px)] bg-zinc-950 overflow-hidden">

        {/* ── Portrait + badges ── */}
        <div className="aspect-[3/4] relative">
          {model.profile_photo_url ? (
            <Image
              src={model.profile_photo_url}
              alt={`${model.first_name} ${model.last_name}`}
              fill
              className="object-cover object-top"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px"
            />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-15 flex items-center justify-center`}>
              <span className="text-5xl font-black text-white/20">
                {model.first_name?.[0]}{model.last_name?.[0]}
              </span>
            </div>
          )}

          {/* Gradient fade to stats panel */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent" />

          {/* Top-left: tier badge */}
          <div className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-[0.15em] shadow-lg ${tier.badge}`}>
            {tier.label}
          </div>

          {/* Top-right: OVR badge */}
          {ovr !== null && (
            <div className="absolute top-2.5 right-2.5 flex flex-col items-center bg-black/65 backdrop-blur-sm rounded-xl px-2.5 py-1.5 border border-white/10">
              <span className="text-[8px] font-bold tracking-[0.2em] text-white/40 uppercase flex items-center gap-0.5">
                <Zap className="h-2 w-2" /> OVR
              </span>
              <span className={`text-2xl font-black leading-none tabular-nums ${ovrColor(ovr)}`}>
                {ovr}
              </span>
            </div>
          )}

          {/* Assignment count (admin only) */}
          {assignedCount > 0 && (
            <div className="absolute bottom-14 left-2.5">
              <span className="text-[10px] font-bold bg-pink-500/25 border border-pink-500/30 text-pink-300 rounded-full px-2 py-0.5">
                {assignedCount}× in lineup
              </span>
            </div>
          )}

          {/* Picked overlay */}
          {isPicked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="absolute top-1/3 right-3 bg-emerald-500 rounded-full p-1.5 shadow-lg shadow-emerald-500/40"
              >
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* ── Stats panel ── */}
        <div className="px-3 pt-2.5 pb-3 space-y-2.5">

          {/* Name + stars */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-black text-[15px] leading-tight text-white tracking-tight truncate">
                {model.first_name}{" "}
                <span className={tier.text}>{model.last_name}</span>
              </h3>
              <p className="text-[10px] text-white/35 truncate">
                @{model.username}{model.city ? ` · ${model.city}` : ""}
              </p>
            </div>
            {model.admin_rating !== null && (
              <div className="flex gap-0.5 shrink-0 pt-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-2.5 w-2.5 ${i < (model.admin_rating ?? 0) ? `fill-current ${tier.text}` : "text-white/12"}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {model.height && <StatRow label="HT" value={model.height} />}
            {model.dress_size && <StatRow label="DRESS" value={model.dress_size} />}
            {ig && <StatRow label="IG" value={ig} />}
            {primaryFocus && <StatRow label="FOCUS" value={FOCUS_LABELS[primaryFocus] ?? primaryFocus} />}
          </div>

          {/* Pick / Draft button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onPick}
            disabled={isLoading}
            className={`w-full py-2 rounded-xl text-[11px] font-black tracking-[0.12em] uppercase transition-all duration-200 flex items-center justify-center gap-1.5 ${
              isPicked
                ? `bg-gradient-to-r ${tier.gradient} text-black shadow-md`
                : "bg-white/[0.05] text-white/50 hover:bg-white/10 border border-white/[0.07] hover:border-white/15"
            }`}
          >
            {isLoading ? (
              <span className="animate-pulse text-white/40">···</span>
            ) : isPicked ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                Picked
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Draft
              </>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Micro component ──────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/30">{label}</span>
      <span className="text-[11px] font-semibold text-white/75">{value}</span>
    </div>
  );
}
