import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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

        <Button variant="outline" asChild className="h-auto py-4 flex-col gap-2 border-orange-500/30 hover:border-orange-500/50">
          <Link href="/admin/boost">
            <Flame className="h-6 w-6 text-orange-500" />
            <span className="bg-gradient-to-r from-orange-400 to-pink-400 text-transparent bg-clip-text">EXA Boost</span>
          </Link>
        </Button>
      </div>

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
