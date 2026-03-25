"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VoteDialog } from "./VoteDialog";
import {
  Crown,
  Search,
  ArrowUpDown,
  Trophy,
  Medal,
  Heart,
  Users,
} from "lucide-react";

interface Contestant {
  id: string;
  model_id: string;
  tagline: string | null;
  tier: "standard" | "crown" | "elite";
  vote_count: number;
  created_at: string;
  model: {
    id: string;
    first_name: string;
    last_name: string;
    username: string;
    profile_photo_url: string | null;
    city: string | null;
    state: string | null;
  };
}

interface Competition {
  id: string;
  name: string;
  status: string;
}

interface ContestantsGridProps {
  initialContestants: Contestant[];
  competition: Competition | null;
  isLoggedIn: boolean;
}

const tierColors: Record<string, string> = {
  standard: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  crown:
    "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/30",
  elite:
    "bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-violet-300 border-violet-500/30",
};

const rankIcons = [
  { icon: Crown, color: "text-amber-400", bg: "bg-amber-500/20", label: "1st" },
  { icon: Medal, color: "text-zinc-300", bg: "bg-zinc-500/20", label: "2nd" },
  { icon: Medal, color: "text-orange-400", bg: "bg-orange-500/20", label: "3rd" },
];

export function ContestantsGrid({
  initialContestants,
  competition,
  isLoggedIn,
}: ContestantsGridProps) {
  const [contestants, setContestants] =
    useState<Contestant[]>(initialContestants);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"votes" | "newest">("votes");
  const [voteTarget, setVoteTarget] = useState<Contestant | null>(null);

  const sorted = useMemo(() => {
    const filtered = contestants.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const fullName =
        `${c.model.first_name} ${c.model.last_name}`.toLowerCase();
      return (
        fullName.includes(q) || c.model.username.toLowerCase().includes(q)
      );
    });

    if (sortBy === "votes") {
      filtered.sort((a, b) => b.vote_count - a.vote_count);
    } else {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    return filtered;
  }, [contestants, search, sortBy]);

  const handleVoteSuccess = useCallback(
    (contestantId: string, newVoteCount: number) => {
      setContestants((prev) =>
        prev.map((c) =>
          c.id === contestantId ? { ...c, vote_count: newVoteCount } : c
        )
      );
    },
    []
  );

  const refreshContestants = useCallback(async () => {
    try {
      const res = await fetch("/api/swimcrown/contestants");
      if (res.ok) {
        const data = await res.json();
        // Transform camelCase API response to snake_case for the grid
        const transformed = (data.contestants || []).map((c: any) => ({
          id: c.id,
          model_id: c.modelId,
          tagline: c.tagline,
          tier: c.tier,
          vote_count: c.voteCount,
          created_at: c.createdAt || new Date().toISOString(),
          model: c.model ? {
            id: c.model.id,
            first_name: c.model.firstName,
            last_name: c.model.lastName || "",
            username: c.model.username,
            profile_photo_url: c.model.profilePhotoUrl,
            city: c.model.city,
            state: c.model.state,
          } : null,
        }));
        setContestants(transformed);
      }
    } catch {
      // silently fail
    }
  }, []);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-zinc-700 text-muted-foreground shrink-0"
          onClick={() =>
            setSortBy((prev) => (prev === "votes" ? "newest" : "votes"))
          }
        >
          <ArrowUpDown className="mr-2 h-4 w-4" />
          {sortBy === "votes" ? "Most Votes" : "Newest"}
        </Button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {contestants.length} contestants
        </span>
        <span className="flex items-center gap-1.5">
          <Heart className="h-4 w-4 text-pink-400" />
          {contestants.reduce((sum, c) => sum + c.vote_count, 0).toLocaleString()}{" "}
          total votes
        </span>
      </div>

      {/* Grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <Crown className="mx-auto h-12 w-12 text-amber-500/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            {search
              ? "No contestants match your search"
              : "No contestants yet. Be the first to enter!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {sorted.map((contestant, index) => {
              // Determine rank (only when sorted by votes)
              const rank =
                sortBy === "votes" && index < 3 ? rankIcons[index] : null;

              return (
                <motion.div
                  key={contestant.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Card className="group relative overflow-hidden border-zinc-800 bg-zinc-900/50 hover:border-amber-500/30 transition-colors">
                    {/* Rank badge */}
                    {rank && (
                      <div
                        className={`absolute top-3 left-3 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${rank.bg} ${rank.color} backdrop-blur-sm`}
                      >
                        <rank.icon className="h-3.5 w-3.5" />
                        {rank.label}
                      </div>
                    )}

                    {/* Tier badge */}
                    <div className="absolute top-3 right-3 z-10">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wider ${tierColors[contestant.tier]}`}
                      >
                        {contestant.tier}
                      </Badge>
                    </div>

                    {/* Photo */}
                    <div className="relative aspect-[3/4] bg-zinc-800">
                      {contestant.model.profile_photo_url ? (
                        <Image
                          src={contestant.model.profile_photo_url}
                          alt={`${contestant.model.first_name} ${contestant.model.last_name}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Crown className="h-12 w-12 text-zinc-700" />
                        </div>
                      )}
                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    </div>

                    {/* Info */}
                    <div className="relative p-4 -mt-16 z-10">
                      <h3 className="text-base sm:text-lg font-bold text-white truncate">
                        {contestant.model.first_name}{" "}
                        {contestant.model.last_name}
                      </h3>
                      {(contestant.model.city || contestant.model.state) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[contestant.model.city, contestant.model.state]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {contestant.tagline && (
                        <p className="mt-1 text-xs text-amber-300/70 italic line-clamp-2">
                          &ldquo;{contestant.tagline}&rdquo;
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400">
                          <Crown className="h-4 w-4" />
                          <span className="font-bold text-sm">
                            {contestant.vote_count.toLocaleString()}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            votes
                          </span>
                        </div>
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-xs px-3 h-8"
                          onClick={() => setVoteTarget(contestant)}
                        >
                          <Heart className="mr-1 h-3 w-3" />
                          Vote
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Vote Dialog */}
      <VoteDialog
        contestant={voteTarget}
        open={!!voteTarget}
        onOpenChange={(open) => {
          if (!open) setVoteTarget(null);
        }}
        onVoteSuccess={(contestantId, newVoteCount) => {
          handleVoteSuccess(contestantId, newVoteCount);
          refreshContestants();
        }}
        isLoggedIn={isLoggedIn}
      />
    </div>
  );
}
