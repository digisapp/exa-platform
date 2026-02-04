import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Sparkles,
  Building2,
  Coins,
  CreditCard,
  Heart,
  UserPlus,
  BarChart3,
  Banknote,
  AtSign,
  Send,
  Calendar,
  GraduationCap,
  Phone,
  Flame,
  Trophy,
  ThumbsUp,
  ThumbsDown,
  Eye,
} from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  // Check if admin
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get stats
  const { count: totalModels } = await supabase.from("models").select("*", { count: "exact", head: true });
  const { count: totalFans } = await supabase.from("fans").select("*", { count: "exact", head: true });
  const { count: totalTransactions } = await supabase.from("coin_transactions").select("*", { count: "exact", head: true });
  const { count: pendingModelApps } = await (supabase.from("model_applications") as any).select("*", { count: "exact", head: true }).eq("status", "pending");
  const { count: pendingBrands } = await (supabase.from("brands") as any).select("*", { count: "exact", head: true }).eq("is_verified", false);
  const { count: pendingCalls } = await (supabase.from("call_requests") as any).select("*", { count: "exact", head: true }).eq("status", "pending");

  const { data: modelBalances } = await supabase.from("models").select("coin_balance") as { data: { coin_balance: number }[] | null };
  const { data: fanBalances } = await supabase.from("fans").select("coin_balance") as { data: { coin_balance: number }[] | null };

  const totalCoins = (modelBalances?.reduce((sum, m) => sum + (m.coin_balance || 0), 0) || 0) +
                     (fanBalances?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0);

  // EXA Boost stats
  const { count: boostSessions } = await (supabase as any)
    .from("top_model_sessions")
    .select("*", { count: "exact", head: true });

  const { count: boostSignedIn } = await (supabase as any)
    .from("top_model_sessions")
    .select("*", { count: "exact", head: true })
    .not("user_id", "is", null);

  const { count: boostVotes } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true });

  const { count: boostLikes } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true })
    .eq("vote_type", "like");

  const { count: boostPurchased } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true })
    .eq("is_boosted", true);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count: boostTodayPlayers } = await (supabase as any)
    .from("top_model_sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  const { count: boostTodaySignedIn } = await (supabase as any)
    .from("top_model_sessions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString())
    .not("user_id", "is", null);

  const { count: boostTodayVotes } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString());

  const { count: boostTodayLikes } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString())
    .eq("vote_type", "like");

  const { count: boostTodayPurchased } = await (supabase as any)
    .from("top_model_votes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", today.toISOString())
    .eq("is_boosted", true);

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalModels?.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Models</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-pink-500/10">
                <Heart className="h-6 w-6 text-pink-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalFans?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Coins className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCoins.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10">
                <CreditCard className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTransactions?.toLocaleString() || 0}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/community">
            <Users className="h-6 w-6 text-pink-500" />
            <span>Community</span>
            {((pendingModelApps || 0) + (pendingBrands || 0)) > 0 && (
              <span className="text-xs text-muted-foreground">
                {(pendingModelApps || 0) + (pendingBrands || 0)} pending
              </span>
            )}
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/traffic">
            <BarChart3 className="h-6 w-6 text-blue-500" />
            <span>Traffic</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/transactions">
            <Coins className="h-6 w-6 text-yellow-500" />
            <span>Purchases</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/payouts">
            <Banknote className="h-6 w-6 text-green-500" />
            <span>Payouts</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/usernames">
            <AtSign className="h-6 w-6 text-purple-500" />
            <span>Usernames</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/gigs">
            <Sparkles className="h-6 w-6 text-violet-500" />
            <span>Manage Gigs</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/offers">
            <Send className="h-6 w-6 text-cyan-500" />
            <span>Brand Offers</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/calendar">
            <Calendar className="h-6 w-6 text-orange-500" />
            <span>Calendar</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/workshops">
            <GraduationCap className="h-6 w-6 text-rose-500" />
            <span>Workshops</span>
          </Link>
        </Button>

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2">
          <Link href="/admin/crm">
            <Phone className="h-6 w-6 text-pink-500" />
            <span>Call Queue</span>
            {(pendingCalls || 0) > 0 && (
              <span className="text-xs text-muted-foreground">
                {pendingCalls} pending
              </span>
            )}
          </Link>
        </Button>
      </div>

      {/* EXA Boost Stats */}
      <Card className="border-orange-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-full bg-gradient-to-r from-orange-500/20 to-pink-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <span className="bg-gradient-to-r from-orange-400 to-pink-400 text-transparent bg-clip-text">
              EXA Boost
            </span>
            <Link href="/boost" target="_blank" className="text-xs text-muted-foreground hover:text-white ml-2">
              View Game →
            </Link>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Today's Stats */}
          <div>
            <p className="text-sm font-medium text-orange-400 mb-2 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Today
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <p className="text-xl font-bold text-orange-400">{(boostTodayPlayers || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <UserPlus className="h-4 w-4 mx-auto mb-1 text-green-400" />
                <p className="text-xl font-bold text-orange-400">{(boostTodaySignedIn || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Signed In</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <Eye className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                <p className="text-xl font-bold text-orange-400">{((boostTodayPlayers || 0) - (boostTodaySignedIn || 0)).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Anonymous</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-pink-400" />
                <p className="text-xl font-bold text-orange-400">{(boostTodayVotes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Votes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <Heart className="h-4 w-4 mx-auto mb-1 text-red-400" />
                <p className="text-xl font-bold text-orange-400">{(boostTodayLikes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20">
                <Flame className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                <p className="text-xl font-bold text-orange-400">{(boostTodayPurchased || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Boosts</p>
              </div>
            </div>
          </div>

          {/* All-Time Stats */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">All Time</p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Users className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <p className="text-xl font-bold">{(boostSessions || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Players</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <UserPlus className="h-4 w-4 mx-auto mb-1 text-green-400" />
                <p className="text-xl font-bold">{(boostSignedIn || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Signed In</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Eye className="h-4 w-4 mx-auto mb-1 text-purple-400" />
                <p className="text-xl font-bold">{((boostSessions || 0) - (boostSignedIn || 0)).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Anonymous</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <ThumbsUp className="h-4 w-4 mx-auto mb-1 text-pink-400" />
                <p className="text-xl font-bold">{(boostVotes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Votes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Heart className="h-4 w-4 mx-auto mb-1 text-red-400" />
                <p className="text-xl font-bold">{(boostLikes || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Likes</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/5">
                <Flame className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                <p className="text-xl font-bold">{(boostPurchased || 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Boosts</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Items Summary */}
      {((pendingModelApps || 0) > 0 || (pendingBrands || 0) > 0 || (pendingCalls || 0) > 0) && (
        <Card className="border-pink-500/30">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <p className="text-muted-foreground">Pending items:</p>
              {(pendingModelApps || 0) > 0 && (
                <Link href="/admin/community" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors">
                  <UserPlus className="h-4 w-4" />
                  {pendingModelApps} Model Applications
                </Link>
              )}
              {(pendingBrands || 0) > 0 && (
                <Link href="/admin/community" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors">
                  <Building2 className="h-4 w-4" />
                  {pendingBrands} Brand Inquiries
                </Link>
              )}
              {(pendingCalls || 0) > 0 && (
                <Link href="/admin/crm" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors">
                  <Phone className="h-4 w-4" />
                  {pendingCalls} Call Requests
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
