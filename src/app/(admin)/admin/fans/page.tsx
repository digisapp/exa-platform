import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Users,
  Coins,
  Mail,
  Calendar,
} from "lucide-react";

interface Fan {
  id: string;
  user_id: string;
  display_name: string | null;
  coin_balance: number;
  created_at: string;
  updated_at: string;
}

export default async function FansPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Check if admin
  const { data: actor } = await supabase
    .from("actors")
    .select("id, type")
    .eq("user_id", user.id)
    .single() as { data: { id: string; type: string } | null };

  if (!actor || actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get all fans
  const { data: fans } = await supabase
    .from("fans")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100) as { data: Fan[] | null };

  // Get fan stats
  const { count: totalFans } = await supabase
    .from("fans")
    .select("*", { count: "exact", head: true });

  const totalFanCoins = fans?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0;

  // Get fans with most coins
  const topFans = [...(fans || [])].sort((a, b) => b.coin_balance - a.coin_balance).slice(0, 10);

  // Get user emails for fans
  const fanUserIds = fans?.map(f => f.user_id) || [];
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const userMap = new Map(
    authUsers?.users?.map(u => [u.id, u.email]) || []
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Fans</h1>
          <p className="text-muted-foreground">Manage fan accounts</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{totalFans || 0}</p>
                <p className="text-xs text-muted-foreground">Total Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{totalFanCoins.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Fan Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {fans && fans.length > 0 ? Math.round(totalFanCoins / fans.length) : 0}
                </p>
                <p className="text-xs text-muted-foreground">Avg Coins/Fan</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold">
                  {fans?.filter(f => f.coin_balance > 0).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">With Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Fans */}
      {topFans.length > 0 && topFans[0].coin_balance > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Fans by Coins</CardTitle>
            <CardDescription>Fans with the highest coin balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topFans.filter(f => f.coin_balance > 0).map((fan, index) => (
                <div
                  key={fan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">
                        {fan.display_name || userMap.get(fan.user_id) || "Fan"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined {formatDate(fan.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500 font-semibold">
                    <Coins className="h-4 w-4" />
                    {fan.coin_balance.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Fans */}
      <Card>
        <CardHeader>
          <CardTitle>All Fans</CardTitle>
          <CardDescription>Recent fan signups (last 100)</CardDescription>
        </CardHeader>
        <CardContent>
          {!fans || fans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fans yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fans.map((fan) => (
                <div
                  key={fan.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/50 to-violet-500/50 flex items-center justify-center text-white font-bold">
                      {(fan.display_name || userMap.get(fan.user_id) || "F")?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">
                        {fan.display_name || "Fan"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {userMap.get(fan.user_id) && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {userMap.get(fan.user_id)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Coins className="h-4 w-4" />
                      <span className="font-semibold">{fan.coin_balance}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(fan.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
