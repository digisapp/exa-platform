import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Sparkles,
  Users,
  MessageCircle,
  Camera,
  ArrowRight,
  TrendingUp,
  Calendar,
  Lock,
  Settings,
} from "lucide-react";

// Add progress component since we didn't add it earlier
import { cn } from "@/lib/utils";

function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full bg-muted rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

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


  // Get point transactions
  const { data: pointHistory } = await (supabase
    .from("point_transactions") as any)
    .select("*")
    .eq("model_id", model.id)
    .order("created_at", { ascending: false })
    .limit(5);

  // Calculate level progress
  const levelThresholds = { rising: 0, verified: 500, pro: 2000, elite: 5000 };
  const currentLevel = model.level_cached;
  const currentPoints = model.points_cached;
  const nextLevel = currentLevel === "rising" ? "verified" : currentLevel === "verified" ? "pro" : currentLevel === "pro" ? "elite" : null;
  const nextThreshold = nextLevel ? levelThresholds[nextLevel as keyof typeof levelThresholds] : 5000;
  const prevThreshold = levelThresholds[currentLevel as keyof typeof levelThresholds];
  const progress = nextLevel ? ((currentPoints - prevThreshold) / (nextThreshold - prevThreshold)) * 100 : 100;

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

      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Level Progress
          </CardTitle>
          <CardDescription>
            {nextLevel
              ? `${nextThreshold - currentPoints} more points to reach ${nextLevel}`
              : "You've reached the highest level!"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{currentLevel} {levelIcons[currentLevel]}</span>
              {nextLevel && <span className="capitalize">{nextLevel} {levelIcons[nextLevel]}</span>}
            </div>
            <ProgressBar value={progress} />
            <p className="text-xs text-muted-foreground text-center">
              {currentPoints} / {nextThreshold} points
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Point History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pointHistory && pointHistory.length > 0 ? (
            <div className="space-y-4">
              {pointHistory.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium capitalize">{tx.action.replace(/_/g, " ")}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-green-500 font-bold">+{tx.points}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Start earning points!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Things you can do to earn more points</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link href="/profile" className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all text-center">
              <Settings className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="font-medium">Settings</p>
              <p className="text-xs text-muted-foreground">Edit profile</p>
            </Link>
            <Link href="/profile#photos" className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-pink-500" />
              <p className="font-medium">Portfolio</p>
              <p className="text-xs text-muted-foreground">+10 points each</p>
            </Link>
            <Link href="/content" className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all text-center">
              <Lock className="h-8 w-8 mx-auto mb-2 text-violet-500" />
              <p className="font-medium">PPV Content</p>
              <p className="text-xs text-muted-foreground">Earn coins</p>
            </Link>
            <Link href="/messages" className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all text-center">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="font-medium">Messages</p>
              <p className="text-xs text-muted-foreground">Chat with fans</p>
            </Link>
            <Link href="/earnings" className="p-4 rounded-lg border border-border/40 hover:border-primary/50 transition-all text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium">Earnings</p>
              <p className="text-xs text-muted-foreground">Track income</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
