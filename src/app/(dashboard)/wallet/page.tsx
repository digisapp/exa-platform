"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Coins,
  Wallet,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Heart,
  Lock,
  MessageCircle,
  Plus,
  Building,
} from "lucide-react";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  action: string;
  created_at: string;
}

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<number | null>(null);
  const [coinBalance, setCoinBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [thisMonthEarnings, setThisMonthEarnings] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function loadWallet() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get actor
      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor) return;

      // Get coin balance based on actor type
      if (actor.type === "model" || actor.type === "admin") {
        // Models are linked via user_id, not actor.id
        const { data: model } = await supabase
          .from("models")
          .select("coin_balance")
          .eq("user_id", user.id)
          .single() as { data: { coin_balance: number } | null };
        setCoinBalance(model?.coin_balance || 0);
      } else if (actor.type === "fan") {
        // Fans use actor.id as their id
        const { data: fan } = await supabase
          .from("fans")
          .select("coin_balance")
          .eq("id", actor.id)
          .single() as { data: { coin_balance: number } | null };
        setCoinBalance(fan?.coin_balance || 0);
      }

      // Get transactions
      const { data: txs } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("actor_id", actor.id)
        .order("created_at", { ascending: false })
        .limit(20) as { data: Transaction[] | null };

      setTransactions(txs || []);

      // Calculate earnings (positive amounts)
      const earnings = (txs || []).filter(t => t.amount > 0);
      const total = earnings.reduce((sum, t) => sum + t.amount, 0);
      setTotalEarnings(total);

      // This month
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const thisMonth = earnings
        .filter(t => new Date(t.created_at) >= oneMonthAgo)
        .reduce((sum, t) => sum + t.amount, 0);
      setThisMonthEarnings(thisMonth);

      setLoading(false);
    }

    loadWallet();
  }, [supabase]);

  const handlePurchase = async (coins: number) => {
    setPurchasing(coins);
    try {
      const response = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
    } finally {
      setPurchasing(null);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "tip_received":
      case "tip_sent":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "content_sale":
      case "content_unlock":
        return <Lock className="h-4 w-4 text-violet-500" />;
      case "message_received":
      case "message_sent":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "purchase":
        return <CreditCard className="h-4 w-4 text-green-500" />;
      default:
        return <Coins className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "tip_received": return "Tip Received";
      case "tip_sent": return "Tip Sent";
      case "content_sale": return "Content Sale";
      case "content_unlock": return "Content Unlock";
      case "message_received": return "Message Payment";
      case "message_sent": return "Message";
      case "purchase": return "Coin Purchase";
      default: return action.replace(/_/g, " ");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20">
          <Wallet className="h-6 w-6 text-pink-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Wallet</h1>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
              <div className="flex items-center gap-2">
                <Coins className="h-8 w-8 text-pink-500" />
                <span className="text-4xl font-bold">{coinBalance.toLocaleString()}</span>
                <span className="text-muted-foreground">coins</span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-pink-500 to-violet-500">
                  <Plus className="mr-2 h-4 w-4" />
                  Buy Coins
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Buy Coins</DialogTitle>
                  <DialogDescription>
                    Choose a package to add coins to your wallet
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  {COIN_PACKAGES.map((pack, index) => {
                    const isPopular = index === 2;
                    return (
                      <div
                        key={pack.coins}
                        className={cn(
                          "relative p-4 rounded-lg border transition-all hover:shadow-md",
                          isPopular && "border-pink-500 ring-2 ring-pink-500/20"
                        )}
                      >
                        {isPopular && (
                          <Badge className="absolute -top-2 right-2 bg-gradient-to-r from-pink-500 to-violet-500">
                            Popular
                          </Badge>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <Coins className="h-5 w-5 text-pink-500" />
                          <span className="text-xl font-bold">{pack.coins.toLocaleString()}</span>
                        </div>
                        <p className="text-xl font-bold mb-3">{pack.priceDisplay}</p>
                        <Button
                          onClick={() => handlePurchase(pack.coins)}
                          disabled={purchasing !== null}
                          className={cn("w-full", isPopular && "bg-gradient-to-r from-pink-500 to-violet-500")}
                          variant={isPopular ? "default" : "outline"}
                        >
                          {purchasing === pack.coins ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Buy"
                          )}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{thisMonthEarnings.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-5 w-5 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => t.action === "tip_received").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">From Tips</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-violet-500" />
              <div>
                <p className="text-2xl font-bold">
                  {transactions.filter(t => t.action === "content_sale").reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Content Sales</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your coin activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-background">
                      {getActionIcon(tx.action)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{getActionLabel(tx.action)}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold flex items-center gap-1",
                    tx.amount >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {tx.amount >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {tx.amount >= 0 ? "+" : ""}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Payout Settings
          </CardTitle>
          <CardDescription>Set up your bank account to receive payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              We&apos;re working on enabling direct payouts to your bank account.
              For now, contact us at{" "}
              <a href="mailto:payouts@examodels.com" className="text-pink-500 hover:underline">
                payouts@examodels.com
              </a>{" "}
              to request a payout.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
