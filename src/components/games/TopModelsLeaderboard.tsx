"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trophy, Flame, TrendingUp, Crown, Medal, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  rank: number;
  modelId: string;
  points: number;
  totalLikes: number;
  totalBoosts: number;
  model: {
    id: string;
    firstName: string | null;
    username: string;
    profilePhotoUrl: string;
    city: string | null;
    state: string | null;
    isVerified: boolean;
    isFeatured: boolean;
  };
}

interface TopModelsLeaderboardProps {
  initialPeriod?: "today" | "week" | "all";
  className?: string;
  compact?: boolean;
}

export function TopModelsLeaderboard({
  initialPeriod = "today",
  className,
  compact = false,
}: TopModelsLeaderboardProps) {
  const [period, setPeriod] = useState<"today" | "week" | "all">(initialPeriod);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/games/boost/leaderboard?period=${period}&limit=30`);
        if (res.ok) {
          const data = await res.json();
          setLeaderboard(data.leaderboard || []);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, [period]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="relative">
            <Crown className="h-6 w-6 text-yellow-400 drop-shadow-lg" />
            <span className="absolute inset-0 blur-sm bg-yellow-400/50 rounded-full" />
          </div>
        );
      case 2:
        return <Medal className="h-5 w-5 text-gray-300 drop-shadow" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-500 drop-shadow" />;
      default:
        return (
          <span className="text-sm font-bold text-muted-foreground w-6 text-center">
            {rank}
          </span>
        );
    }
  };

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-yellow-500/20 border-yellow-500/40 shadow-lg shadow-yellow-500/10";
      case 2:
        return "bg-gradient-to-r from-gray-400/15 to-gray-300/15 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/15 to-orange-600/15 border-amber-600/30";
      default:
        return "bg-white/5 border-white/10 hover:border-white/20";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header - hidden on mobile/compact since parent shows it */}
      {!compact && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Trophy className="h-5 w-5 text-yellow-400" />
              <span className="absolute inset-0 blur-md bg-yellow-400/40 animate-pulse" />
            </div>
            <h3 className="font-bold text-lg bg-gradient-to-r from-yellow-200 to-yellow-400 text-transparent bg-clip-text">
              Leaderboard
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-green-400">
            <TrendingUp className="h-3.5 w-3.5 animate-pulse" />
            <span>Live</span>
          </div>
        </div>
      )}

      {/* Period Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/10">
        {(["today", "week", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-2.5 px-3 text-sm rounded-lg transition-all",
              period === p
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white font-semibold shadow-lg shadow-pink-500/25"
                : "text-muted-foreground hover:text-white hover:bg-white/10"
            )}
          >
            {p === "today" ? "Today" : p === "week" ? "Week" : "All Time"}
          </button>
        ))}
      </div>

      {/* Leaderboard List */}
      <div className="space-y-2">
        {loading ? (
          // Enhanced loading skeleton
          Array.from({ length: compact ? 5 : 30 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white/10 to-white/5" />
              <div className="w-11 h-11 rounded-full bg-gradient-to-r from-white/10 to-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 bg-gradient-to-r from-white/10 to-white/5 rounded" />
                {!compact && <div className="h-3 w-16 bg-white/5 rounded" />}
              </div>
              <div className="h-5 w-14 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded" />
            </div>
          ))
        ) : leaderboard.length === 0 ? (
          // Enhanced empty state
          <div className="text-center py-10 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-purple-500/5 to-orange-500/5 rounded-2xl" />
            <div className="relative">
              <div className="relative inline-block mb-3">
                <Trophy className="h-16 w-16 mx-auto text-white/10" />
                <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-400/50 animate-pulse" />
              </div>
              <p className="font-semibold text-white/60">No votes yet {period === "today" ? "today" : period === "week" ? "this week" : ""}!</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to vote</p>
            </div>
          </div>
        ) : (
          leaderboard.slice(0, compact ? 5 : 30).map((entry) => (
            <Link
              href={`/${entry.model?.username}`}
              key={entry.modelId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer",
                getRankStyles(entry.rank),
                entry.rank === 1 && "relative overflow-hidden"
              )}
            >
              {/* Shimmer effect for #1 */}
              {entry.rank === 1 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/10 to-transparent animate-shimmer" />
              )}

              {/* Rank */}
              <div className="w-8 flex items-center justify-center relative">
                {getRankIcon(entry.rank)}
              </div>

              {/* Photo */}
              <div className={cn(
                "relative w-11 h-11 rounded-full overflow-hidden bg-white/10",
                entry.rank === 1 && "ring-2 ring-yellow-400/50",
                entry.rank === 2 && "ring-2 ring-gray-300/30",
                entry.rank === 3 && "ring-2 ring-amber-500/30"
              )}>
                {entry.model?.profilePhotoUrl && (
                  <Image
                    src={entry.model.profilePhotoUrl}
                    alt={entry.model.firstName || entry.model.username}
                    fill
                    className="object-cover"
                    sizes="44px"
                  />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0 relative">
                <p className={cn(
                  "font-semibold truncate",
                  entry.rank === 1 && "text-yellow-200"
                )}>
                  {entry.model?.firstName || entry.model?.username}
                </p>
                {!compact && entry.model?.state && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.model.state}
                  </p>
                )}
              </div>

              {/* Points */}
              <div className="text-right relative">
                <p className={cn(
                  "font-bold",
                  entry.rank === 1
                    ? "text-lg bg-gradient-to-r from-yellow-300 to-orange-400 text-transparent bg-clip-text"
                    : "text-pink-400"
                )}>
                  {entry.points.toLocaleString()}
                </p>
                {!compact && entry.totalBoosts > 0 && (
                  <p className="text-xs text-orange-400 flex items-center justify-end gap-1">
                    <Flame className="h-3 w-3" />
                    {entry.totalBoosts}
                  </p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
