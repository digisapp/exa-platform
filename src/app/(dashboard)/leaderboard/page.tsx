import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, TrendingUp, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const levelIcons: Record<string, string> = {
  rising: "⭐",
  verified: "✓",
  pro: "💎",
  elite: "👑",
};

const levelColors: Record<string, string> = {
  rising: "bg-gray-500/10 text-gray-500",
  verified: "bg-blue-500/10 text-blue-500",
  pro: "bg-violet-500/10 text-violet-500",
  elite: "bg-amber-500/10 text-amber-500",
};

export default async function LeaderboardPage() {
  const supabase = await createClient();

  // Get top models by points
  const { data: topModels } = await supabase
    .from("models")
    .select("*")
    .eq("is_approved", true)
    .order("points_cached", { ascending: false })
    .limit(50) as { data: any[] | null };

  // Get weekly top (models who earned most this week)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { data: weeklyPoints } = await supabase
    .from("point_transactions")
    .select("model_id, points")
    .gte("created_at", oneWeekAgo.toISOString()) as { data: { model_id: string; points: number }[] | null };

  // Aggregate weekly points
  const weeklyTotals: Record<string, number> = {};
  weeklyPoints?.forEach((tx) => {
    weeklyTotals[tx.model_id] = (weeklyTotals[tx.model_id] || 0) + tx.points;
  });

  const weeklyTopIds = Object.entries(weeklyTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id]) => id);

  const { data: weeklyTopModels } = await supabase
    .from("models")
    .select("*")
    .in("id", weeklyTopIds) as { data: any[] | null };

  // Sort by weekly points
  const sortedWeeklyModels = weeklyTopModels?.sort(
    (a, b) => (weeklyTotals[b.id] || 0) - (weeklyTotals[a.id] || 0)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <Trophy className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <h1 className="text-3xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Top models on EXA</p>
      </div>

      <Tabs defaultValue="all-time" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all-time">All Time</TabsTrigger>
          <TabsTrigger value="weekly">This Week</TabsTrigger>
        </TabsList>

        <TabsContent value="all-time">
          <LeaderboardList models={topModels || []} />
        </TabsContent>

        <TabsContent value="weekly">
          <LeaderboardList
            models={sortedWeeklyModels || []}
            weeklyTotals={weeklyTotals}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardList({
  models,
  weeklyTotals,
}: {
  models: any[];
  weeklyTotals?: Record<string, number>;
}) {
  if (models.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0 divide-y">
        {models.map((model, index) => {
          const rank = index + 1;
          const points = weeklyTotals ? weeklyTotals[model.id] : model.points_cached;

          return (
            <Link
              key={model.id}
              href={`/models/${model.username}`}
              className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
            >
              {/* Rank */}
              <div className="w-10 text-center">
                {rank === 1 ? (
                  <span className="text-2xl">🥇</span>
                ) : rank === 2 ? (
                  <span className="text-2xl">🥈</span>
                ) : rank === 3 ? (
                  <span className="text-2xl">🥉</span>
                ) : (
                  <span className="text-xl font-bold text-muted-foreground">{rank}</span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="h-12 w-12">
                <AvatarImage src={model.avatar_url} alt={model.name} />
                <AvatarFallback className="bg-gradient-to-br from-pink-500 to-violet-500 text-white">
                  {model.name?.charAt(0) || model.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{model.name || model.username}</p>
                  <Badge className={cn("capitalize text-xs", levelColors[model.level_cached])}>
                    {levelIcons[model.level_cached]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>@{model.username}</span>
                  {model.city && model.state && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {model.city}, {model.state}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-bold text-lg">{points?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
