"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Flame,
  Users,
  UserPlus,
  Eye,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  Loader2,
  RefreshCw,
  TrendingUp,
  Calendar,
  Coins,
  ExternalLink,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface BoostStats {
  totalSessions: number;
  signedInSessions: number;
  totalVotes: number;
  totalLikes: number;
  totalDislikes: number;
  totalBoosts: number;
  todaySessions: number;
  todaySignedIn: number;
  todayVotes: number;
  todayLikes: number;
  todayBoosts: number;
  dailyData: { date: string; sessions: number; votes: number; boosts: number }[];
  topModels: { model_id: string; username: string; first_name: string | null; profile_photo_url: string | null; likes: number; dislikes: number; boosts: number }[];
  recentSessions: { id: string; user_id: string | null; created_at: string; completed_at: string | null; models_shown: number; total_votes: number; fan_display_name: string | null }[];
}

export default function AdminBoostPage() {
  const [stats, setStats] = useState<BoostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");
  const supabase = createClient();

  const fetchStats = async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate date range based on period
      const startDate = new Date();
      if (period === "7d") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === "30d") {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setFullYear(2020); // Far back for "all"
      }

      // Fetch all stats in parallel
      const [
        { count: totalSessions },
        { count: signedInSessions },
        { count: totalVotes },
        { count: totalLikes },
        { count: totalDislikes },
        { count: totalBoosts },
        { count: todaySessions },
        { count: todaySignedIn },
        { count: todayVotes },
        { count: todayLikes },
        { count: todayBoosts },
        { data: sessionsData },
        { data: votesData },
        { data: topModelsData },
        { data: recentSessionsData },
      ] = await Promise.all([
        // All-time counts
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }),
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).eq("vote_type", "like"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).eq("vote_type", "dislike"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).eq("is_boosted", true),
        // Today counts
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).not("user_id", "is", null),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("vote_type", "like"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("is_boosted", true),
        // Sessions for chart
        supabase.from("top_model_sessions").select("created_at").gte("created_at", startDate.toISOString()).order("created_at", { ascending: true }),
        // Votes for chart
        supabase.from("top_model_votes").select("created_at, is_boosted").gte("created_at", startDate.toISOString()).order("created_at", { ascending: true }),
        // Top models by votes
        supabase.from("top_model_votes").select("model_id, vote_type, is_boosted"),
        // Recent sessions
        supabase.from("top_model_sessions").select("id, user_id, created_at, completed_at, models_shown, total_votes").order("created_at", { ascending: false }).limit(20),
      ]);

      // Process daily data
      const dailyMap = new Map<string, { sessions: number; votes: number; boosts: number }>();

      (sessionsData || []).forEach((s: any) => {
        const date = new Date(s.created_at).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { sessions: 0, votes: 0, boosts: 0 };
        existing.sessions++;
        dailyMap.set(date, existing);
      });

      (votesData || []).forEach((v: any) => {
        const date = new Date(v.created_at).toISOString().split("T")[0];
        const existing = dailyMap.get(date) || { sessions: 0, votes: 0, boosts: 0 };
        existing.votes++;
        if (v.is_boosted) existing.boosts++;
        dailyMap.set(date, existing);
      });

      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process top models
      const modelVotes = new Map<string, { likes: number; dislikes: number; boosts: number }>();
      (topModelsData || []).forEach((v: any) => {
        const existing = modelVotes.get(v.model_id) || { likes: 0, dislikes: 0, boosts: 0 };
        if (v.vote_type === "like") existing.likes++;
        if (v.vote_type === "dislike") existing.dislikes++;
        if (v.is_boosted) existing.boosts++;
        modelVotes.set(v.model_id, existing);
      });

      // Get model details for top 10
      const modelIds = Array.from(modelVotes.entries())
        .sort((a, b) => (b[1].likes + b[1].boosts * 2) - (a[1].likes + a[1].boosts * 2))
        .slice(0, 10)
        .map(([id]) => id);

      let topModels: BoostStats["topModels"] = [];
      if (modelIds.length > 0) {
        const { data: modelsInfo } = await supabase
          .from("models")
          .select("id, username, first_name, profile_photo_url")
          .in("id", modelIds);

        topModels = modelIds.map(id => {
          const model = (modelsInfo || []).find((m: any) => m.id === id);
          const votes = modelVotes.get(id) || { likes: 0, dislikes: 0, boosts: 0 };
          return {
            model_id: id,
            username: model?.username || "Unknown",
            first_name: model?.first_name || null,
            profile_photo_url: model?.profile_photo_url || null,
            ...votes,
          };
        });
      }

      // Get fan names for recent sessions
      const userIds = (recentSessionsData || [])
        .filter((s: any) => s.user_id)
        .map((s: any) => s.user_id);

      const fanNames = new Map<string, string>();
      if (userIds.length > 0) {
        // Get actor IDs from user IDs
        const { data: actors } = await supabase
          .from("actors")
          .select("id, user_id")
          .in("user_id", userIds);

        const actorIds = (actors || []).map((a: any) => a.id);
        const userToActor = new Map((actors || []).map((a: any) => [a.user_id, a.id]));

        if (actorIds.length > 0) {
          const { data: fans } = await supabase
            .from("fans")
            .select("id, display_name")
            .in("id", actorIds);

          (fans || []).forEach((f: any) => {
            // Find the user_id for this actor
            for (const [userId, actorId] of userToActor) {
              if (actorId === f.id) {
                fanNames.set(userId, f.display_name || "Fan");
                break;
              }
            }
          });
        }
      }

      const recentSessions = (recentSessionsData || []).map((s: any) => ({
        ...s,
        fan_display_name: s.user_id ? fanNames.get(s.user_id) || "Signed In" : null,
      }));

      setStats({
        totalSessions: totalSessions || 0,
        signedInSessions: signedInSessions || 0,
        totalVotes: totalVotes || 0,
        totalLikes: totalLikes || 0,
        totalDislikes: totalDislikes || 0,
        totalBoosts: totalBoosts || 0,
        todaySessions: todaySessions || 0,
        todaySignedIn: todaySignedIn || 0,
        todayVotes: todayVotes || 0,
        todayLikes: todayLikes || 0,
        todayBoosts: todayBoosts || 0,
        dailyData,
        topModels,
        recentSessions,
      });
    } catch (error) {
      console.error("Failed to fetch boost stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  const formatDate = (dateStr: unknown) => {
    if (typeof dateStr !== "string" && typeof dateStr !== "number") return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  if (loading && !stats) {
    return (
      <div className="container px-8 md:px-16 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20">
              <Flame className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-pink-400 text-transparent bg-clip-text">
                EXA Boost Analytics
              </h1>
              <p className="text-sm text-muted-foreground">Game performance and player insights</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/boost" target="_blank">
              <ExternalLink className="h-4 w-4 mr-2" />
              Play Game
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Today's Stats */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-pink-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Today
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Users className="h-5 w-5 mx-auto mb-2 text-blue-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.todaySessions.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <UserPlus className="h-5 w-5 mx-auto mb-2 text-green-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.todaySignedIn.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Signed In</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Eye className="h-5 w-5 mx-auto mb-2 text-purple-400" />
              <p className="text-3xl font-bold text-orange-400">{((stats?.todaySessions || 0) - (stats?.todaySignedIn || 0)).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Anonymous</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <ThumbsUp className="h-5 w-5 mx-auto mb-2 text-pink-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.todayVotes.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Votes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Flame className="h-5 w-5 mx-auto mb-2 text-orange-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.todayBoosts.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Boosts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All-Time Stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            All Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            <div className="text-center p-3 rounded-lg bg-white/5">
              <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold">{stats?.totalSessions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <UserPlus className="h-4 w-4 mx-auto mb-1 text-green-400" />
              <p className="text-2xl font-bold">{stats?.signedInSessions.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Signed In</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <Eye className="h-4 w-4 mx-auto mb-1 text-purple-400" />
              <p className="text-2xl font-bold">{((stats?.totalSessions || 0) - (stats?.signedInSessions || 0)).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Anonymous</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-pink-400" />
              <p className="text-2xl font-bold">{stats?.totalVotes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Votes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <Heart className="h-4 w-4 mx-auto mb-1 text-red-400" />
              <p className="text-2xl font-bold">{stats?.totalLikes.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white/5">
              <Flame className="h-4 w-4 mx-auto mb-1 text-orange-400" />
              <p className="text-2xl font-bold">{stats?.totalBoosts.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Boosts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Daily Activity</CardTitle>
              <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="7d" className="text-xs px-2">7D</TabsTrigger>
                  <TabsTrigger value="30d" className="text-xs px-2">30D</TabsTrigger>
                  <TabsTrigger value="all" className="text-xs px-2">All</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats?.dailyData || []}>
                  <defs>
                    <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="votesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" tick={{ fill: "#888", fontSize: 12 }} tickFormatter={formatDate} />
                  <YAxis tick={{ fill: "#888", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid #333" }}
                    labelFormatter={formatDate}
                  />
                  <Area type="monotone" dataKey="sessions" stroke="#f97316" fill="url(#sessionsGradient)" name="Sessions" />
                  <Area type="monotone" dataKey="votes" stroke="#ec4899" fill="url(#votesGradient)" name="Votes" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </CardTitle>
            <CardDescription>Most liked and boosted models</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.topModels.slice(0, 5).map((model, i) => (
                <div key={model.model_id} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                    {model.profile_photo_url ? (
                      <Image
                        src={model.profile_photo_url}
                        alt={model.username}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        {(model.first_name || model.username).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/${model.username}`}
                      target="_blank"
                      className="font-medium hover:text-orange-400 truncate block"
                    >
                      {model.first_name || model.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{model.username}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-pink-400">
                      <Heart className="h-3 w-3" />
                      {model.likes}
                    </span>
                    <span className="flex items-center gap-1 text-orange-400">
                      <Flame className="h-3 w-3" />
                      {model.boosts}
                    </span>
                  </div>
                </div>
              ))}
              {(!stats?.topModels || stats.topModels.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No votes yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Recent Sessions
          </CardTitle>
          <CardDescription>Latest game sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Models Shown</TableHead>
                <TableHead className="text-right">Votes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats?.recentSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    {session.user_id ? (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-green-400" />
                        <span>{session.fan_display_name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>Anonymous</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(session.created_at)}
                      <span className="text-muted-foreground ml-2">{formatTime(session.created_at)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {session.completed_at ? (
                      <Badge variant="outline" className="text-green-500 border-green-500/30">
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                        In Progress
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{session.models_shown}</TableCell>
                  <TableCell className="text-right">{session.total_votes}</TableCell>
                </TableRow>
              ))}
              {(!stats?.recentSessions || stats.recentSessions.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No sessions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
