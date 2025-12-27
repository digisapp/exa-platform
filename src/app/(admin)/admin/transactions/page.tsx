import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface Transaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default async function TransactionsPage() {
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
    <div className="container py-8 space-y-8">
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
      </div>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
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
    </div>
  );
}
