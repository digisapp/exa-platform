"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Trophy, Flame, TrendingUp, Crown, Medal } from "lucide-react";
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
        const res = await fetch(`/api/games/boost/leaderboard?period=${period}&limit=10`);
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
        return <Crown className="h-5 w-5 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 to-gray-300/20 border-gray-400/30";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-amber-600/30";
      default:
        return "bg-white/5 border-white/10";
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-400" />
          <h3 className="font-bold text-lg">Leaderboard</h3>
        </div>
        {!compact && (
          <TrendingUp className="h-4 w-4 text-green-400 animate-pulse" />
        )}
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        {(["today", "week", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-2 px-3 text-sm rounded-md transition-colors",
              period === p
                ? "bg-pink-500 text-white font-medium"
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
          // Loading skeleton
          Array.from({ length: compact ? 5 : 10 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 animate-pulse"
            >
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-white/10 rounded" />
              </div>
              <div className="h-4 w-12 bg-white/10 rounded" />
            </div>
          ))
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-2 opacity-20" />
            <p>No votes yet today!</p>
            <p className="text-sm">Be the first to vote</p>
          </div>
        ) : (
          leaderboard.slice(0, compact ? 5 : 10).map((entry) => (
            <div
              key={entry.modelId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-white/5",
                getRankBgColor(entry.rank)
              )}
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Photo */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/10">
                {entry.model?.profilePhotoUrl && (
                  <Image
                    src={entry.model.profilePhotoUrl}
                    alt={entry.model.firstName || entry.model.username}
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized={entry.model.profilePhotoUrl?.includes("cdninstagram.com")}
                  />
                )}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {entry.model?.firstName || entry.model?.username}
                </p>
                {!compact && entry.model?.city && (
                  <p className="text-xs text-muted-foreground truncate">
                    {entry.model.city}
                  </p>
                )}
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-bold text-pink-400">{entry.points.toLocaleString()}</p>
                {!compact && entry.totalBoosts > 0 && (
                  <p className="text-xs text-orange-400 flex items-center justify-end gap-1">
                    <Flame className="h-3 w-3" />
                    {entry.totalBoosts}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
