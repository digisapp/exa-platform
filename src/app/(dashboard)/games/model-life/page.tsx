"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Gem,
  ArrowLeft,
  Loader2,
  Flame,
  Clock,
  Trophy,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface Activity {
  type: string;
  name: string;
  emoji: string;
  gemsEarned: number;
  cooldownHours: number;
  description: string;
  available: boolean;
  nextAvailable: string | null;
  lastDone: string | null;
}

interface Stats {
  current_streak: number;
  longest_streak: number;
  total_workouts: number;
  total_content: number;
  total_events: number;
  total_wellness: number;
}

interface HistoryItem {
  id: string;
  activity_type: string;
  gems_change: number;
  created_at: string;
}

const ACTIVITY_EMOJIS: Record<string, string> = {
  workout: "💪",
  coffee: "☕",
  content: "📸",
  event: "🎉",
  wellness: "🧘",
  network: "🤝",
};

export default function ModelLifePage() {
  const [gemBalance, setGemBalance] = useState<number>(0);
  const [modelName, setModelName] = useState<string>("Model");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [doingActivity, setDoingActivity] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<{ emoji: string; gems: number } | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setActivities((prev) =>
        prev.map((activity) => {
          if (activity.nextAvailable) {
            const now = new Date();
            const next = new Date(activity.nextAvailable);
            if (now >= next) {
              return { ...activity, available: true, nextAvailable: null };
            }
          }
          return activity;
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function fetchStatus() {
    try {
      const response = await fetch("/api/games/model-life");
      if (response.ok) {
        const data = await response.json();
        setGemBalance(data.gemBalance);
        setModelName(data.modelName);
        setProfilePhoto(data.profilePhoto);
        setActivities(data.activities);
        setStats(data.stats);
        setTodayEarnings(data.todayEarnings);
        setHistory(data.history);
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleActivity(activityType: string) {
    if (doingActivity) return;

    const activity = activities.find((a) => a.type === activityType);
    if (!activity || !activity.available) return;

    // Check if can afford
    if (activity.gemsEarned < 0 && gemBalance < Math.abs(activity.gemsEarned)) {
      toast.error("Not enough gems!");
      return;
    }

    setDoingActivity(activityType);

    try {
      const response = await fetch("/api/games/model-life", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityType }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to complete activity");
        setDoingActivity(null);
        return;
      }

      const result = await response.json();

      // Show success animation
      setShowSuccess({
        emoji: result.activity.emoji,
        gems: result.activity.gemsChange,
      });

      setTimeout(() => setShowSuccess(null), 2000);

      setGemBalance(result.newBalance);

      // Update activity status
      setActivities((prev) =>
        prev.map((a) =>
          a.type === activityType
            ? {
                ...a,
                available: false,
                nextAvailable: new Date(
                  Date.now() + a.cooldownHours * 60 * 60 * 1000
                ).toISOString(),
                lastDone: new Date().toISOString(),
              }
            : a
        )
      );

      // Update today's earnings
      setTodayEarnings((prev) => prev + result.activity.gemsChange);

      const gemText = result.activity.gemsChange > 0
        ? `+${result.activity.gemsChange}`
        : result.activity.gemsChange;

      toast.success(`${result.activity.emoji} ${result.activity.name} complete! ${gemText} gems`);

      // Refresh full status for updated stats
      setTimeout(() => fetchStatus(), 500);
    } catch (error) {
      console.error("Activity error:", error);
      toast.error("Something went wrong");
    } finally {
      setDoingActivity(null);
    }
  }

  function formatTimeRemaining(isoString: string): string {
    const next = new Date(isoString);
    const now = new Date();
    const diffMs = next.getTime() - now.getTime();

    if (diffMs <= 0) return "Ready!";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  const availableCount = activities.filter((a) => a.available).length;

  return (
    <div className="container px-4 md:px-8 py-8 max-w-5xl mx-auto">
      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-bounce text-center">
            <div className="text-8xl mb-4">{showSuccess.emoji}</div>
            <Badge
              className={`text-2xl px-6 py-3 ${
                showSuccess.gems > 0
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                  : "bg-gradient-to-r from-pink-500 to-rose-500"
              }`}
            >
              {showSuccess.gems > 0 ? "+" : ""}
              {showSuccess.gems} gems
            </Badge>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/games">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-pink-500" />
            Model Life
          </h1>
          <p className="text-muted-foreground">
            Live your best model lifestyle and earn gems!
          </p>
        </div>
      </div>

      {/* Profile & Balance Card */}
      <Card className="mb-6 bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-pink-500/50">
              <AvatarImage src={profilePhoto || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xl">
                {modelName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-lg">Hey, {modelName}!</p>
              <p className="text-sm text-muted-foreground">
                {availableCount > 0
                  ? `${availableCount} activities ready`
                  : "Activities recharging..."}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <Gem className="h-5 w-5 text-cyan-400" />
                <span className="font-bold text-xl text-cyan-400">
                  {gemBalance.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Today: {todayEarnings >= 0 ? "+" : ""}
                {todayEarnings} gems
              </p>
            </div>
          </div>

          {/* Streak Display */}
          {stats && stats.current_streak > 0 && (
            <div className="mt-4 flex items-center gap-2 text-orange-500">
              <Flame className="h-5 w-5" />
              <span className="font-medium">{stats.current_streak} day streak!</span>
              {stats.current_streak >= stats.longest_streak && stats.current_streak > 1 && (
                <Badge variant="secondary" className="text-xs">Personal Best!</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Activities Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-pink-500" />
            Daily Activities
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {activities.map((activity) => (
              <Card
                key={activity.type}
                className={`transition-all ${
                  activity.available
                    ? "hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 cursor-pointer"
                    : "opacity-60"
                }`}
                onClick={() => activity.available && handleActivity(activity.type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">{activity.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold">{activity.name}</p>
                        <Badge
                          variant={activity.gemsEarned > 0 ? "default" : "secondary"}
                          className={
                            activity.gemsEarned > 0
                              ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                              : "bg-pink-500/20 text-pink-400 border-pink-500/30"
                          }
                        >
                          {activity.gemsEarned > 0 ? "+" : ""}
                          {activity.gemsEarned}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {activity.description}
                      </p>

                      {activity.available ? (
                        <Button
                          size="sm"
                          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                          disabled={doingActivity === activity.type}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivity(activity.type);
                          }}
                        >
                          {doingActivity === activity.type ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Doing...
                            </>
                          ) : (
                            <>
                              {activity.gemsEarned > 0 ? "Do It!" : "Treat Yourself"}
                            </>
                          )}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {activity.nextAvailable
                              ? formatTimeRemaining(activity.nextAvailable)
                              : "Recharging..."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Your Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-orange-500">
                    {stats?.current_streak || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-violet-500">
                    {stats?.longest_streak || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Best Streak</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>💪 Workouts</span>
                  <span className="font-medium">{stats?.total_workouts || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>📸 Content Created</span>
                  <span className="font-medium">{stats?.total_content || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>🎉 Events Attended</span>
                  <span className="font-medium">{stats?.total_events || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>🧘 Self-Care</span>
                  <span className="font-medium">{stats?.total_wellness || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No activities yet. Start your day!
                </p>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.slice(0, 15).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 text-sm border-b border-border/50 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <span>{ACTIVITY_EMOJIS[item.activity_type] || "✨"}</span>
                        <span className="text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span
                        className={`font-medium ${
                          item.gems_change > 0 ? "text-cyan-400" : "text-pink-400"
                        }`}
                      >
                        {item.gems_change > 0 ? "+" : ""}
                        {item.gems_change}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
