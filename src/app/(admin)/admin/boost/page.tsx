"use client";

import { useState, useEffect, useCallback } from "react";
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

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      // Use the optimized API endpoint instead of client-side queries
      const params = new URLSearchParams({
        chartPeriod,
        sessionsPage: sessionsPage.toString(),
        sessionsPageSize: sessionsPageSize.toString(),
      });

      const response = await fetch(`/api/admin/boost-stats?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch stats");
      }

      const data = await response.json();

      setTotalSessions(data.totalSessions || 0);
      setActiveModelCards(data.activeModelCards || 0);

      setStats({
        today: data.today,
        monthly: data.monthly,
        all: data.all,
        dailyData: data.dailyData,
        topModels: data.topModels,
        recentSessions: data.recentSessions,
      });
    } catch (error) {
      console.error("Failed to fetch boost stats:", error);
    } finally {
      setLoading(false);
    }
  }, [chartPeriod, sessionsPage, sessionsPageSize]);

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
