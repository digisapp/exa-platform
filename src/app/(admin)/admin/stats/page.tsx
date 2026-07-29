"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Coins,
  Eye,
  Heart,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  RefreshCw,
  Trophy,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface LeaderboardEntry {
  id: string;
  username: string;
  name: string;
  profile_photo_url: string | null;
  value: number;
}

type Leaderboards = Record<string, LeaderboardEntry[]>;

const BOARDS: {
  key: string;
  title: string;
  icon: React.ElementType;
  accent: string;
  format?: (v: number) => string;
  sub?: (v: number) => string;
}[] = [
  { key: "earned", title: "Top Earned", icon: Coins, accent: "text-yellow-400", format: (v) => `${v.toLocaleString()} coins`, sub: (v) => `$${(v * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
  { key: "views", title: "Top Profile Views", icon: Eye, accent: "text-sky-400", format: (v) => v.toLocaleString() },
  { key: "favorites", title: "Top Favorites", icon: Heart, accent: "text-pink-400" },
  { key: "paid", title: "Top Paid Content", icon: Lock, accent: "text-purple-400" },
  { key: "pics", title: "Top Pics", icon: ImageIcon, accent: "text-emerald-400" },
  { key: "vids", title: "Top Vids", icon: Video, accent: "text-violet-400" },
  { key: "referrals", title: "Top Referrals", icon: Users, accent: "text-blue-400" },
  // Entry-point profile landings ≈ bio-link taps; data starts 2026-07-29
  { key: "landings", title: "Bio-Link Landings", icon: Link2, accent: "text-cyan-400" },
  // Lifetime coins spent by the fans each model referred (admin-only — never surface to models)
  { key: "referredSpend", title: "Referred Fan Spend", icon: Wallet, accent: "text-orange-400", format: (v) => `${v.toLocaleString()} coins`, sub: (v) => `$${(v * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
];

const RANK_STYLES: Record<number, string> = {
  0: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  1: "bg-zinc-400/20 text-zinc-300 border-zinc-400/40",
  2: "bg-amber-700/20 text-amber-500 border-amber-700/40",
};

function EntryAvatar({ url, name }: { url: string | null; name: string }) {
  const [error, setError] = useState(false);
  if (url && !error) {
    return (
      <Image
        src={url}
        alt={name}
        width={56}
        height={56}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center text-xs font-bold">
      {name?.charAt(0)?.toUpperCase() || "?"}
    </div>
  );
}

export default function AdminStatsPage() {
  const [boards, setBoards] = useState<Leaderboards>({});
  const [modelCount, setModelCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats/leaderboards");
      if (!res.ok) throw new Error("Failed to fetch leaderboards");
      const data = await res.json();
      setBoards(data.leaderboards || {});
      setModelCount(data.modelCount || 0);
    } catch (err) {
      console.error("Error loading leaderboards:", err);
      toast.error("Failed to load leaderboards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="h-7 w-7 text-yellow-400" />
              Model Leaderboards
            </h1>
            <p className="text-muted-foreground">
              Top 30 across {modelCount.toLocaleString()} claimed models · all-time
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {BOARDS.map((board) => {
            const entries = boards[board.key] || [];
            const Icon = board.icon;
            return (
              <Card key={board.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Icon className={`h-5 w-5 ${board.accent}`} />
                    {board.title}
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      {entries.length} models
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">No data yet</p>
                  ) : (
                    <div className="max-h-[420px] overflow-y-auto pr-1 space-y-1">
                      {entries.map((entry, i) => (
                        <Link
                          key={entry.id}
                          href={`/admin/models/${entry.id}`}
                          className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors"
                        >
                          <span
                            className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full text-xs font-bold border ${
                              RANK_STYLES[i] || "border-transparent text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                            <EntryAvatar url={entry.profile_photo_url} name={entry.name} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{entry.name}</p>
                            <p className="text-xs text-muted-foreground truncate">@{entry.username}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`text-sm font-semibold ${board.accent}`}>
                              {board.format ? board.format(entry.value) : entry.value.toLocaleString()}
                            </p>
                            {board.sub && (
                              <p className="text-xs text-muted-foreground">{board.sub(entry.value)}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
