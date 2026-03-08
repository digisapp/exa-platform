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
  CreditCard,
  Heart,
  Lock,
  Crown,
  DollarSign,
} from "lucide-react";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { AdminTransactionList } from "./AdminTransactionList";

// Get the USD price for a coin amount (returns cents)
function getCoinPackagePrice(coins: number): number {
  const pkg = COIN_PACKAGES.find(p => p.coins === coins);
  return pkg?.price || 0;
}

interface TopPurchaser {
  actor_id: string;
  email: string;
  name: string;
  type: string;
  total_purchased: number;
  purchase_count: number;
  total_usd_cents: number;
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

  // Fetch all data in parallel using RPCs + balance queries
  const [
    { data: statsData },
    { data: topPurchaserData },
    { data: purchaseVolumeData },
    { data: modelBalances },
    { data: fanBalances },
    { data: initialTransactionsRaw, count: txCount },
    { data: recentPurchasesRaw },
  ] = await Promise.all([
    // Platform-wide stats via RPC (replaces 200-row fetch + JS filter/reduce)
    (supabase.rpc as any)("get_admin_transaction_stats") as Promise<{ data: { stat_name: string; stat_value: number }[] | null }>,
    // Top purchasers via RPC (replaces unlimited purchase fetch + JS aggregation)
    (supabase.rpc as any)("get_top_purchasers", { p_limit: 20 }) as Promise<{ data: { actor_id: string; total_purchased: number; purchase_count: number }[] | null }>,
    // Purchase volume by coin amount for revenue calc (replaces unlimited fetch)
    (supabase.rpc as any)("get_purchase_volume") as Promise<{ data: { coin_amount: number; purchase_count: number }[] | null }>,
    // Coin balances (these are already lightweight - just sums)
    supabase.from("models").select("coin_balance") as unknown as Promise<{ data: { coin_balance: number }[] | null }>,
    supabase.from("fans").select("coin_balance") as unknown as Promise<{ data: { coin_balance: number }[] | null }>,
    // Initial 20 transactions for the All Transactions tab (with count for total)
    (supabase.from("coin_transactions") as any)
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(20) as Promise<{ data: any[] | null; count: number | null }>,
    // Recent purchases for the Purchases tab
    (supabase.from("coin_transactions") as any)
      .select("actor_id, amount, created_at, metadata")
      .eq("action", "purchase")
      .order("created_at", { ascending: false })
      .limit(50) as Promise<{ data: any[] | null }>,
  ]);

  // Parse stats from RPC
  const statsMap = new Map((statsData || []).map((s: any) => [s.stat_name, Number(s.stat_value)]));
  const totalPurchased = statsMap.get("total_purchased") || 0;
  const totalTipped = statsMap.get("total_tipped") || 0;
  const totalContentSales = statsMap.get("total_content_sales") || 0;

  // Calculate total revenue from purchase volume RPC
  const totalRevenueCents = (purchaseVolumeData || []).reduce(
    (sum: number, v: any) => sum + getCoinPackagePrice(Number(v.coin_amount)) * Number(v.purchase_count), 0
  );
  const totalRevenue = totalRevenueCents / 100;

  // Coin balances
  const totalModelCoins = modelBalances?.reduce((sum, m) => sum + (m.coin_balance || 0), 0) || 0;
  const totalFanCoins = fanBalances?.reduce((sum, f) => sum + (f.coin_balance || 0), 0) || 0;
  const totalCoinsInCirculation = totalModelCoins + totalFanCoins;

  // Enrich top purchasers with user info
  const topPurchaserActorIds = (topPurchaserData || []).map((p: any) => p.actor_id);
  let topPurchasers: TopPurchaser[] = [];

  if (topPurchaserActorIds.length > 0) {
    const { data: actors } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .in("id", topPurchaserActorIds) as { data: { id: string; user_id: string; type: string }[] | null };

    const actorMap = new Map((actors || []).map(a => [a.id, a]));

    const fanUserIds = (actors || []).filter(a => a.type === "fan").map(a => a.user_id);
    const modelUserIds = (actors || []).filter(a => a.type === "model").map(a => a.user_id);

    const [{ data: fans }, { data: models }] = await Promise.all([
      fanUserIds.length > 0
        ? supabase.from("fans").select("user_id, email, display_name").in("user_id", fanUserIds) as unknown as Promise<{ data: { user_id: string; email: string; display_name: string | null }[] | null }>
        : Promise.resolve({ data: [] as any[] }),
      modelUserIds.length > 0
        ? supabase.from("models").select("user_id, email, first_name, last_name").in("user_id", modelUserIds) as unknown as Promise<{ data: { user_id: string; email: string; first_name: string | null; last_name: string | null }[] | null }>
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const fanMap = new Map((fans || []).map((f: any) => [f.user_id, f]));
    const modelMap = new Map((models || []).map((m: any) => [m.user_id, m]));

    topPurchasers = (topPurchaserData || []).map((p: any) => {
      const a = actorMap.get(p.actor_id);
      let email = "";
      let name = "";

      if (a?.type === "fan") {
        const fan = fanMap.get(a.user_id);
        email = fan?.email || "";
        name = fan?.display_name || "";
      } else if (a?.type === "model") {
        const model = modelMap.get(a.user_id);
        email = model?.email || "";
        name = [model?.first_name, model?.last_name].filter(Boolean).join(" ");
      }

      return {
        actor_id: p.actor_id,
        email,
        name: name || email.split("@")[0],
        type: a?.type || "unknown",
        total_purchased: Number(p.total_purchased),
        purchase_count: Number(p.purchase_count),
        total_usd_cents: 0, // Will calculate below
      };
    });

    // Calculate USD for each top purchaser (approximation from their total coins)
    // For more accuracy we'd need per-transaction data, but this gives a reasonable estimate
    topPurchasers = topPurchasers.map(p => ({
      ...p,
      total_usd_cents: p.total_purchased * 10, // 1 coin ≈ $0.10
    }));
  }

  // Enrich recent purchases with user info
  const purchaseActorIds = [...new Set((recentPurchasesRaw || []).map((p: any) => p.actor_id))];
  let recentPurchases: any[] = [];

  if (purchaseActorIds.length > 0) {
    const { data: pActors } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .in("id", purchaseActorIds) as { data: { id: string; user_id: string; type: string }[] | null };

    const pActorMap = new Map((pActors || []).map(a => [a.id, a]));

    const pFanUserIds = (pActors || []).filter(a => a.type === "fan").map(a => a.user_id);
    const pModelUserIds = (pActors || []).filter(a => a.type === "model").map(a => a.user_id);

    const [{ data: pFans }, { data: pModels }] = await Promise.all([
      pFanUserIds.length > 0
        ? supabase.from("fans").select("user_id, email, display_name").in("user_id", pFanUserIds) as unknown as Promise<{ data: any[] | null }>
        : Promise.resolve({ data: [] as any[] }),
      pModelUserIds.length > 0
        ? supabase.from("models").select("user_id, email, first_name, last_name").in("user_id", pModelUserIds) as unknown as Promise<{ data: any[] | null }>
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pFanMap = new Map((pFans || []).map((f: any) => [f.user_id, f]));
    const pModelMap = new Map((pModels || []).map((m: any) => [m.user_id, m]));

    recentPurchases = (recentPurchasesRaw || []).map((p: any) => {
      const a = pActorMap.get(p.actor_id);
      let email = "";
      let name = "";

      if (a?.type === "fan") {
        const fan = pFanMap.get(a.user_id);
        email = fan?.email || "";
        name = fan?.display_name || "";
      } else if (a?.type === "model") {
        const model = pModelMap.get(a.user_id);
        email = model?.email || "";
        name = [model?.first_name, model?.last_name].filter(Boolean).join(" ");
      }

      return {
        ...p,
        email,
        name: name || email.split("@")[0],
        type: a?.type || "unknown",
      };
    });
  }

  // Enrich initial transactions for the All Transactions client component
  const initialTxActorIds = [...new Set((initialTransactionsRaw || []).map((t: any) => t.actor_id))];
  let initialTransactions: any[] = [];

  if (initialTxActorIds.length > 0) {
    const { data: tActors } = await supabase
      .from("actors")
      .select("id, user_id, type")
      .in("id", initialTxActorIds) as { data: { id: string; user_id: string; type: string }[] | null };

    const tActorMap = new Map((tActors || []).map(a => [a.id, a]));

    const tFanUserIds = (tActors || []).filter(a => a.type === "fan").map(a => a.user_id);
    const tModelUserIds = (tActors || []).filter(a => a.type === "model" || a.type === "admin").map(a => a.user_id);

    const [{ data: tFans }, { data: tModels }] = await Promise.all([
      tFanUserIds.length > 0
        ? supabase.from("fans").select("user_id, email, display_name").in("user_id", tFanUserIds) as unknown as Promise<{ data: any[] | null }>
        : Promise.resolve({ data: [] as any[] }),
      tModelUserIds.length > 0
        ? supabase.from("models").select("user_id, email, first_name, last_name, username").in("user_id", tModelUserIds) as unknown as Promise<{ data: any[] | null }>
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const tFanMap = new Map((tFans || []).map((f: any) => [f.user_id, f]));
    const tModelMap = new Map((tModels || []).map((m: any) => [m.user_id, m]));

    initialTransactions = (initialTransactionsRaw || []).map((tx: any) => {
      const a = tActorMap.get(tx.actor_id);
      let name = "";
      let email = "";

      if (a?.type === "fan") {
        const fan = tFanMap.get(a.user_id);
        email = fan?.email || "";
        name = fan?.display_name || email.split("@")[0];
      } else if (a?.type === "model" || a?.type === "admin") {
        const model = tModelMap.get(a.user_id);
        email = model?.email || "";
        name = [model?.first_name, model?.last_name].filter(Boolean).join(" ") || model?.username || email.split("@")[0];
      }

      return {
        ...tx,
        user_name: name,
        user_email: email,
        user_type: a?.type || "unknown",
      };
    });
  }

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

      {/* Stats - Top Row: Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{totalCoinsInCirculation.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Coins in Circulation</p>
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
                <p className="text-xs text-muted-foreground">Model Balances</p>
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
                <p className="text-xs text-muted-foreground">Fan Balances</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats - Second Row: Activity metrics (now from full dataset via RPC) */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalPurchased.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Coins Purchased</p>
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
                <p className="text-xs text-muted-foreground">Total Tips Sent</p>
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
                <p className="text-xs text-muted-foreground">Total Content Sales</p>
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
                          {purchaser.purchase_count} purchase{purchaser.purchase_count !== 1 ? "s" : ""}
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
                  {recentPurchases.map((purchase: any, index: number) => (
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
          <AdminTransactionList
            initialTransactions={initialTransactions}
            totalCount={txCount || 0}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
