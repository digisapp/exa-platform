"use client";

import { useState, useEffect, useCallback } from "react";
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
  Trophy,
  Loader2,
  RefreshCw,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PeriodStats {
  sessions: number;
  signedIn: number;
  votes: number;
  likes: number;
  boosts: number;
}

interface BoostStats {
  today: PeriodStats;
  monthly: PeriodStats;
  all: PeriodStats;
  dailyData: { date: string; sessions: number; votes: number; boosts: number }[];
  topModels: { model_id: string; username: string; first_name: string | null; profile_photo_url: string | null; points: number; likes: number; boosts: number }[];
  recentSessions: { id: string; user_id: string | null; created_at: string; completed_at: string | null; models_swiped: number; total_votes: number; fan_display_name: string | null }[];
}

export default function AdminBoostPage() {
  const [stats, setStats] = useState<BoostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartPeriod, setChartPeriod] = useState<"7d" | "30d" | "all">("7d");
  const [statsPeriod, setStatsPeriod] = useState<"today" | "monthly" | "all">("today");
  const [sessionsPage, setSessionsPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const [activeModelCards, setActiveModelCards] = useState(0);
  const sessionsPageSize = 20;
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate monthly date (30 days ago)
      const monthlyDate = new Date();
      monthlyDate.setDate(monthlyDate.getDate() - 30);

      // Calculate date range based on chart period
      const startDate = new Date();
      if (chartPeriod === "7d") {
        startDate.setDate(startDate.getDate() - 7);
      } else if (chartPeriod === "30d") {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setFullYear(2020); // Far back for "all"
      }

      // Fetch all stats in parallel
      const [
        // All-time counts
        { count: totalSessionsCount },
        { count: totalSignedIn },
        { count: totalVotes },
        { count: totalLikes },
        { count: totalBoosts },
        // Today counts
        { count: todaySessions },
        { count: todaySignedIn },
        { count: todayVotes },
        { count: todayLikes },
        { count: todayBoosts },
        // Monthly counts
        { count: monthlySessions },
        { count: monthlySignedIn },
        { count: monthlyVotes },
        { count: monthlyLikes },
        { count: monthlyBoosts },
        // Chart and other data
        { data: sessionsData },
        { data: votesData },
        { data: topModelsData },
        { data: recentSessionsData },
        // Active model cards count
        { count: activeCardsCount },
      ] = await Promise.all([
        // All-time counts
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }),
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).not("user_id", "is", null),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).eq("vote_type", "like"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).eq("is_boosted", true),
        // Today counts
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).not("user_id", "is", null),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("vote_type", "like"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()).eq("is_boosted", true),
        // Monthly counts
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()),
        supabase.from("top_model_sessions").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).not("user_id", "is", null),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).eq("vote_type", "like"),
        supabase.from("top_model_votes").select("*", { count: "exact", head: true }).gte("created_at", monthlyDate.toISOString()).eq("is_boosted", true),
        // Sessions for chart
        supabase.from("top_model_sessions").select("created_at").gte("created_at", startDate.toISOString()).order("created_at", { ascending: true }),
        // Votes for chart
        supabase.from("top_model_votes").select("created_at, is_boosted").gte("created_at", startDate.toISOString()).order("created_at", { ascending: true }),
        // Top models from leaderboard (matches public /boost page)
        (supabase as any).from("top_model_leaderboard").select(`
          model_id,
          total_points,
          total_likes,
          total_boosts,
          models!inner (
            id,
            first_name,
            username,
            profile_photo_url
          )
        `).gt("total_points", 0).order("total_points", { ascending: false }).limit(10),
        // Recent sessions with pagination
        supabase.from("top_model_sessions").select("id, user_id, created_at, completed_at, models_swiped").order("created_at", { ascending: false }).range((sessionsPage - 1) * sessionsPageSize, sessionsPage * sessionsPageSize - 1),
        // Count of active model cards (approved models with profile pictures)
        supabase.from("models").select("*", { count: "exact", head: true }).eq("is_approved", true).not("profile_photo_url", "is", null),
      ]);

      setTotalSessions(totalSessionsCount || 0);
      setActiveModelCards(activeCardsCount || 0);

      // Process daily data - first aggregate the raw data
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

      // Fill in all days in the range (including days with zero activity)
      const dailyData: { date: string; sessions: number; votes: number; boosts: number }[] = [];
      const endDate = new Date();
      endDate.setHours(0, 0, 0, 0);
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        const existing = dailyMap.get(dateStr);
        dailyData.push({
          date: dateStr,
          sessions: existing?.sessions || 0,
          votes: existing?.votes || 0,
          boosts: existing?.boosts || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Process top models from leaderboard (already sorted by total_points)
      const topModels: BoostStats["topModels"] = (topModelsData || []).map((entry: any) => ({
        model_id: entry.model_id,
        username: entry.models?.username || "Unknown",
        first_name: entry.models?.first_name || null,
        profile_photo_url: entry.models?.profile_photo_url || null,
        points: entry.total_points || 0,
        likes: entry.total_likes || 0,
        boosts: entry.total_boosts || 0,
      }));

      // Get user names for recent sessions (could be fans or models)
      const userIds = (recentSessionsData || [])
        .filter((s: any) => s.user_id)
        .map((s: any) => s.user_id);

      const fanNames = new Map<string, string>();
      if (userIds.length > 0) {
        // Get actor IDs from user IDs
        const { data: actors } = await supabase
          .from("actors")
          .select("id, user_id, type")
          .in("user_id", userIds);

        const actorIds = (actors || []).map((a: any) => a.id);
        const userToActor = new Map((actors || []).map((a: any) => [a.user_id, { id: a.id, type: a.type }]));

        if (actorIds.length > 0) {
          // Look up fans (fans.id = actors.id)
          const { data: fans } = await supabase
            .from("fans")
            .select("id, display_name, username")
            .in("id", actorIds);

          const fanLookup = new Map((fans || []).map((f: any) => [f.id, f]));

          // Also look up models (models.user_id = actors.user_id)
          const { data: models } = await supabase
            .from("models")
            .select("user_id, first_name, username")
            .in("user_id", userIds);

          const modelLookup = new Map((models || []).map((m: any) => [m.user_id, m]));

          // For each user, determine their display name
          for (const [userId, actorInfo] of userToActor) {
            const actorId = actorInfo.id;
            const actorType = actorInfo.type;

            // Check if they're a model first
            const model = modelLookup.get(userId);
            if (model || actorType === "model") {
              const name = model?.username || model?.first_name;
              if (name) {
                fanNames.set(userId, name);
                continue;
              }
            }

            // Check if they're a fan
            const fan = fanLookup.get(actorId);
            if (fan || actorType === "fan") {
              const name = fan?.username || fan?.display_name;
              if (name) {
                fanNames.set(userId, name);
                continue;
              }
            }

            // Fallback based on actor type
            fanNames.set(userId, actorType === "model" ? "Model" : "Fan");
          }
        }
      }

      // Get vote counts for each session
      const sessionIds = (recentSessionsData || []).map((s: any) => s.id);
      const sessionVoteCounts = new Map<string, number>();
      if (sessionIds.length > 0) {
        const { data: voteCounts } = await supabase
          .from("top_model_votes")
          .select("session_id")
          .in("session_id", sessionIds);

        (voteCounts || []).forEach((v: any) => {
          sessionVoteCounts.set(v.session_id, (sessionVoteCounts.get(v.session_id) || 0) + 1);
        });
      }

      const recentSessions = (recentSessionsData || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        created_at: s.created_at,
        completed_at: s.completed_at,
        models_swiped: Array.isArray(s.models_swiped) ? s.models_swiped.length : 0,
        total_votes: sessionVoteCounts.get(s.id) || 0,
        fan_display_name: s.user_id ? fanNames.get(s.user_id) || "Signed In" : null,
      }));

      setStats({
        today: {
          sessions: todaySessions || 0,
          signedIn: todaySignedIn || 0,
          votes: todayVotes || 0,
          likes: todayLikes || 0,
          boosts: todayBoosts || 0,
        },
        monthly: {
          sessions: monthlySessions || 0,
          signedIn: monthlySignedIn || 0,
          votes: monthlyVotes || 0,
          likes: monthlyLikes || 0,
          boosts: monthlyBoosts || 0,
        },
        all: {
          sessions: totalSessionsCount || 0,
          signedIn: totalSignedIn || 0,
          votes: totalVotes || 0,
          likes: totalLikes || 0,
          boosts: totalBoosts || 0,
        },
        dailyData,
        topModels,
        recentSessions,
      });
    } catch (error) {
      console.error("Failed to fetch boost stats:", error);
    } finally {
      setLoading(false);
    }
  }, [chartPeriod, sessionsPage, sessionsPageSize, supabase]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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

      {/* Stats with Period Toggle */}
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/5 to-pink-500/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Stats
            </CardTitle>
            <Tabs value={statsPeriod} onValueChange={(v) => setStatsPeriod(v as any)}>
              <TabsList className="h-8">
                <TabsTrigger value="today" className="text-xs px-3">Today</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs px-3">30D</TabsTrigger>
                <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <Users className="h-5 w-5 mx-auto mb-2 text-cyan-400" />
              <p className="text-3xl font-bold text-cyan-400">{activeModelCards.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Models</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Users className="h-5 w-5 mx-auto mb-2 text-blue-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.[statsPeriod]?.sessions.toLocaleString() ?? 0}</p>
              <p className="text-sm text-muted-foreground">Players</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <UserPlus className="h-5 w-5 mx-auto mb-2 text-green-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.[statsPeriod]?.signedIn.toLocaleString() ?? 0}</p>
              <p className="text-sm text-muted-foreground">Signed In</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Eye className="h-5 w-5 mx-auto mb-2 text-purple-400" />
              <p className="text-3xl font-bold text-orange-400">{((stats?.[statsPeriod]?.sessions || 0) - (stats?.[statsPeriod]?.signedIn || 0)).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Anonymous</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <ThumbsUp className="h-5 w-5 mx-auto mb-2 text-pink-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.[statsPeriod]?.votes.toLocaleString() ?? 0}</p>
              <p className="text-sm text-muted-foreground">Votes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Heart className="h-5 w-5 mx-auto mb-2 text-red-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.[statsPeriod]?.likes.toLocaleString() ?? 0}</p>
              <p className="text-sm text-muted-foreground">Likes</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
              <Flame className="h-5 w-5 mx-auto mb-2 text-orange-400" />
              <p className="text-3xl font-bold text-orange-400">{stats?.[statsPeriod]?.boosts.toLocaleString() ?? 0}</p>
              <p className="text-sm text-muted-foreground">Boosts</p>
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
              <Tabs value={chartPeriod} onValueChange={(v) => setChartPeriod(v as any)}>
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
                    <span className="flex items-center gap-1 text-yellow-400 font-semibold">
                      <Trophy className="h-3 w-3" />
                      {model.points} pts
                    </span>
                    <span className="flex items-center gap-1 text-pink-400 text-xs">
                      <Heart className="h-3 w-3" />
                      {model.likes}
                    </span>
                    <span className="flex items-center gap-1 text-orange-400 text-xs">
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
                <TableHead className="text-right">Models Swiped</TableHead>
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
                  <TableCell className="text-right">{session.models_swiped}</TableCell>
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

          {/* Pagination */}
          {totalSessions > sessionsPageSize && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {sessionsPage} of {Math.ceil(totalSessions / sessionsPageSize)} ({totalSessions.toLocaleString()} total sessions)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSessionsPage((p) => Math.max(1, p - 1))}
                  disabled={sessionsPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSessionsPage((p) => Math.min(Math.ceil(totalSessions / sessionsPageSize), p + 1))}
                  disabled={sessionsPage === Math.ceil(totalSessions / sessionsPageSize)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
