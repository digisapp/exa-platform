import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  ArrowRight,
  TrendingUp,
  Lock,
  Coins,
  Heart,
  Image,
  Activity,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get model data directly by user_id
  const { data: model } = await (supabase.from("models") as any)
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!model) redirect("/onboarding");


  // Get recent activity - combine point transactions and coin transactions
  const { data: pointHistory } = await (supabase
    .from("point_transactions") as any)
    .select("id, action, points, created_at")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: coinHistory } = await (supabase
    .from("coin_transactions") as any)
    .select("id, action, amount, created_at")
    .eq("actor_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Combine and sort all activity
  const recentActivity = [
    ...(pointHistory || []).map((tx: any) => ({
      id: tx.id,
      type: "points" as const,
      action: tx.action,
      value: tx.points,
      created_at: tx.created_at,
    })),
    ...(coinHistory || []).map((tx: any) => ({
      id: tx.id,
      type: "coins" as const,
      action: tx.action,
      value: tx.amount,
      created_at: tx.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  const levelIcons: Record<string, string> = {
    rising: "⭐",
    verified: "✓",
    pro: "💎",
    elite: "👑",
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {model.first_name || "Model"}!</h1>
          <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your profile</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link href={`/models/${model.username}`}>View Public Profile</Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500">
            <Link href="/opportunities">
              Browse Opportunities
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                <Trophy className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{model.points_cached}</p>
                <p className="text-sm text-muted-foreground">Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="text-3xl">{levelIcons[model.level_cached]}</div>
              <div>
                <p className="text-2xl font-bold capitalize">{model.level_cached}</p>
                <p className="text-sm text-muted-foreground">Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{model.instagram_followers || 0}</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      item.type === "coins"
                        ? "bg-yellow-500/20"
                        : "bg-pink-500/20"
                    }`}>
                      {item.type === "coins" ? (
                        item.action === "tip_received" ? (
                          <Heart className="h-4 w-4 text-pink-500" />
                        ) : item.action === "content_sale" ? (
                          <Lock className="h-4 w-4 text-violet-500" />
                        ) : (
                          <Coins className="h-4 w-4 text-yellow-500" />
                        )
                      ) : (
                        item.action === "photo_upload" ? (
                          <Image className="h-4 w-4 text-pink-500" />
                        ) : (
                          <Trophy className="h-4 w-4 text-pink-500" />
                        )
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize text-sm">{item.action.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${
                    item.value >= 0 ? "text-green-500" : "text-red-500"
                  }`}>
                    {item.type === "coins" ? (
                      <span className="flex items-center gap-1">
                        {item.value >= 0 ? "+" : ""}{item.value}
                        <Coins className="h-3 w-3" />
                      </span>
                    ) : (
                      `+${item.value} pts`
                    )}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
