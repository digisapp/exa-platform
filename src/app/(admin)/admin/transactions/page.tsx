import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Heart,
  MessageCircle,
  Lock,
  Gift,
  Crown,
  DollarSign,
} from "lucide-react";

interface Transaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface TopPurchaser {
  actor_id: string;
  email: string;
  name: string;
  type: string;
  total_purchased: number;
  purchase_count: number;
}

export default async function TransactionsPage() {
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

  // Get transaction stats
  const { data: allTransactions } = await supabase
    .from("coin_transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200) as { data: Transaction[] | null };

  const transactions = allTransactions || [];

  // Calculate stats
  const purchases = transactions.filter(t => t.action === "purchase");
  const tips = transactions.filter(t => t.action === "tip_sent" || t.action === "tip_received");
  const contentSales = transactions.filter(t => t.action === "content_sale" || t.action === "content_unlock");
  const messageCosts = transactions.filter(t => t.action === "message_sent" || t.action === "message_received");

  const totalPurchased = purchases.reduce((sum, t) => sum + t.amount, 0);
  const totalTipped = tips.filter(t => t.action === "tip_sent").reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalContentSales = contentSales.filter(t => t.action === "content_sale").reduce((sum, t) => sum + t.amount, 0);

  // Get coin balances
  const { data: modelBalances } = await supabase
    .from("models")
    .select("coin_balance") as { data: { coin_balance: number }[] | null };

  const { data: fanBalances } = await supabase
    .from("fans")
    .select("coin_balance") as { data: { coin_balance: number }[] | null };

  const totalModelCoins = modelBalances?.reduce((sum, m) => sum + (m.coin_balance || 0), 0) || 0;
  const totalFanCoins = fanBalances?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0;
  const totalCoinsInCirculation = totalModelCoins + totalFanCoins;

  // Get fan count
  const { count: totalFans } = await supabase
    .from("fans")
    .select("*", { count: "exact", head: true });

  // Get all purchase transactions with actor info for top purchasers
  const { data: purchaseTransactions } = await supabase
    .from("coin_transactions")
    .select("actor_id, amount, created_at, metadata")
    .eq("action", "purchase")
    .order("created_at", { ascending: false }) as { data: { actor_id: string; amount: number; created_at: string; metadata: Record<string, unknown> }[] | null };

  // Get actor info for purchases
  const actorIds = [...new Set(purchaseTransactions?.map(p => p.actor_id) || [])];

  const { data: actors } = await supabase
    .from("actors")
    .select("id, user_id, type")
    .in("id", actorIds.length > 0 ? actorIds : ["none"]) as { data: { id: string; user_id: string; type: string }[] | null };

  const actorMap = new Map(actors?.map(a => [a.id, a]) || []);

  // Get fan info
  const fanUserIds = actors?.filter(a => a.type === "fan").map(a => a.user_id) || [];
  const { data: fans } = await supabase
    .from("fans")
    .select("user_id, email, display_name")
    .in("user_id", fanUserIds.length > 0 ? fanUserIds : ["none"]) as { data: { user_id: string; email: string; display_name: string | null }[] | null };

  const fanMap = new Map(fans?.map(f => [f.user_id, f]) || []);

  // Get model info
  const modelUserIds = actors?.filter(a => a.type === "model").map(a => a.user_id) || [];
  const { data: models } = await supabase
    .from("models")
    .select("user_id, email, first_name, last_name")
    .in("user_id", modelUserIds.length > 0 ? modelUserIds : ["none"]) as { data: { user_id: string; email: string; first_name: string | null; last_name: string | null }[] | null };

  const modelMap = new Map(models?.map(m => [m.user_id, m]) || []);

  // Calculate top purchasers
  const purchaserStats = new Map<string, { total: number; count: number }>();
  purchaseTransactions?.forEach(p => {
    const current = purchaserStats.get(p.actor_id) || { total: 0, count: 0 };
    purchaserStats.set(p.actor_id, {
      total: current.total + p.amount,
      count: current.count + 1,
    });
  });

  const topPurchasers: TopPurchaser[] = Array.from(purchaserStats.entries())
    .map(([actorId, stats]) => {
      const actor = actorMap.get(actorId);
      let email = "";
      let name = "";

      if (actor?.type === "fan") {
        const fan = fanMap.get(actor.user_id);
        email = fan?.email || "";
        name = fan?.display_name || "";
      } else if (actor?.type === "model") {
        const model = modelMap.get(actor.user_id);
        email = model?.email || "";
        name = [model?.first_name, model?.last_name].filter(Boolean).join(" ");
      }

      return {
        actor_id: actorId,
        email,
        name: name || email.split("@")[0],
        type: actor?.type || "unknown",
        total_purchased: stats.total,
        purchase_count: stats.count,
      };
    })
    .sort((a, b) => b.total_purchased - a.total_purchased)
    .slice(0, 20);

  // Recent purchases with user info
  const recentPurchases = (purchaseTransactions || []).slice(0, 50).map(p => {
    const actor = actorMap.get(p.actor_id);
    let email = "";
    let name = "";

    if (actor?.type === "fan") {
      const fan = fanMap.get(actor.user_id);
      email = fan?.email || "";
      name = fan?.display_name || "";
    } else if (actor?.type === "model") {
      const model = modelMap.get(actor.user_id);
      email = model?.email || "";
      name = [model?.first_name, model?.last_name].filter(Boolean).join(" ");
    }

    return {
      ...p,
      email,
      name: name || email.split("@")[0],
      type: actor?.type || "unknown",
    };
  });

  // Calculate total revenue (coins * $0.01 per coin)
  const totalRevenue = (purchaseTransactions || []).reduce((sum, p) => sum + p.amount, 0) * 0.01;

  const getActionIcon = (action: string) => {
    switch (action) {
      case "purchase":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      case "tip_sent":
      case "tip_received":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "content_sale":
      case "content_unlock":
        return <Lock className="h-4 w-4 text-purple-500" />;
      case "message_sent":
      case "message_received":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "bonus":
      case "signup_bonus":
        return <Gift className="h-4 w-4 text-yellow-500" />;
      default:
        return <Coins className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "purchase":
        return "Coin Purchase";
      case "tip_sent":
        return "Tip Sent";
      case "tip_received":
        return "Tip Received";
      case "content_sale":
        return "Content Sale";
      case "content_unlock":
        return "Content Unlock";
      case "message_sent":
        return "Message Sent";
      case "message_received":
        return "Message Payment";
      case "bonus":
      case "signup_bonus":
        return "Bonus";
      default:
        return action.replace(/_/g, " ");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View all coin transactions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{totalCoinsInCirculation.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalPurchased.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Purchased</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{totalTipped.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tipped</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalContentSales.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Content Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalModelCoins.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Model Coins</p>
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
                <p className="text-xs text-muted-foreground">Fan Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="top-purchasers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="top-purchasers">
            <Crown className="h-4 w-4 mr-2" />
            Top Purchasers
          </TabsTrigger>
          <TabsTrigger value="purchases">
            <CreditCard className="h-4 w-4 mr-2" />
            Recent Purchases
          </TabsTrigger>
          <TabsTrigger value="all">
            <Coins className="h-4 w-4 mr-2" />
            All Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="top-purchasers">
          <Card>
            <CardHeader>
              <CardTitle>Top Coin Purchasers</CardTitle>
              <CardDescription>Users who have bought the most coins</CardDescription>
            </CardHeader>
            <CardContent>
              {topPurchasers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Crown className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchases yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topPurchasers.map((purchaser, index) => (
                    <div
                      key={purchaser.actor_id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0 ? "bg-yellow-500 text-black" :
                          index === 1 ? "bg-gray-300 text-black" :
                          index === 2 ? "bg-amber-600 text-white" :
                          "bg-muted-foreground/20 text-muted-foreground"
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold">{purchaser.name}</p>
                          <p className="text-sm text-muted-foreground">{purchaser.email}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {purchaser.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-500 text-lg">
                          {purchaser.total_purchased.toLocaleString()} coins
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {purchaser.purchase_count} purchase{purchaser.purchase_count !== 1 ? "s" : ""} · ${(purchaser.total_purchased * 0.01).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases">
          <Card>
            <CardHeader>
              <CardTitle>Recent Purchases</CardTitle>
              <CardDescription>Last 50 coin purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {recentPurchases.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No purchases yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPurchases.map((purchase, index) => (
                    <div
                      key={`${purchase.actor_id}-${purchase.created_at}-${index}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-green-500/10">
                          <CreditCard className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium">{purchase.name}</p>
                          <p className="text-xs text-muted-foreground">{purchase.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {purchase.type}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-500">+{purchase.amount.toLocaleString()} coins</p>
                        <p className="text-xs text-muted-foreground">{formatDate(purchase.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Last 200 coin transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-background">
                          {getActionIcon(tx.action)}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{getActionLabel(tx.action)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {tx.actor_id.slice(0, 8)}...
                        </Badge>
                        <span className={`flex items-center gap-1 font-semibold ${tx.amount >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {tx.amount >= 0 ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                          {tx.amount >= 0 ? "+" : ""}{tx.amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
