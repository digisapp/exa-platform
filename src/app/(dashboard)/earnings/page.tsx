"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coins, TrendingUp, MessageCircle, Heart, ArrowUpRight, Calendar } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Actor, Model } from "@/types/database";

interface CoinTransaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default async function EarningsPage() {
  const supabase = await createClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get actor
  const { data: actor } = (await supabase
    .from("actors")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: Actor | null };

  if (!actor) redirect("/onboarding");

  // Only models can view earnings
  if (actor.type !== "model" && actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get model data
  const { data: model } = (await supabase
    .from("models")
    .select("*")
    .eq("id", actor.id)
    .single()) as { data: Model | null };

  if (!model) redirect("/onboarding");

  // Get all earnings transactions (positive amounts from tips and messages)
  const { data: transactions } = (await supabase
    .from("coin_transactions")
    .select("*")
    .eq("actor_id", actor.id)
    .gt("amount", 0)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: CoinTransaction[] | null };

  // Calculate totals
  const allTransactions = transactions || [];

  const tipEarnings = allTransactions
    .filter(t => t.action === "tip_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const messageEarnings = allTransactions
    .filter(t => t.action === "message_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEarnings = tipEarnings + messageEarnings;

  // Get recent transactions for display
  const recentTransactions = allTransactions.slice(0, 20);

  // Calculate this month's earnings
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  const thisMonthEarnings = allTransactions
    .filter(t => new Date(t.created_at) >= oneMonthAgo)
    .reduce((sum, t) => sum + t.amount, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "tip_received":
        return "Tip";
      case "message_received":
        return "Message";
      default:
        return action;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "tip_received":
        return <Heart className="h-4 w-4 text-pink-500" />;
      case "message_received":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Coins className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Earnings</h1>
        <p className="text-muted-foreground mt-1">
          Track your coin earnings from tips and messages
        </p>
      </div>

      {/* Current Balance */}
      <Card className="bg-gradient-to-br from-pink-500/10 to-violet-500/10 border-pink-500/20">
        <CardHeader className="pb-2">
          <CardDescription>Current Balance</CardDescription>
          <CardTitle className="text-4xl font-bold flex items-center gap-2">
            <Coins className="h-8 w-8 text-pink-500" />
            {model.coin_balance?.toLocaleString() || 0}
            <span className="text-lg font-normal text-muted-foreground">coins</span>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Total Earned
            </CardDescription>
            <CardTitle className="text-2xl">{totalEarnings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              This Month
            </CardDescription>
            <CardTitle className="text-2xl">{thisMonthEarnings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Heart className="h-3 w-3" />
              From Tips
            </CardDescription>
            <CardTitle className="text-2xl text-pink-500">{tipEarnings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              From Messages
            </CardDescription>
            <CardTitle className="text-2xl text-blue-500">{messageEarnings.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Earnings</CardTitle>
          <CardDescription>Your latest coin earnings</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No earnings yet</p>
              <p className="text-sm">Start chatting to earn coins from fans!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getActionIcon(transaction.action)}
                    </div>
                    <div>
                      <p className="font-medium">{getActionLabel(transaction.action)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-green-500 font-semibold">
                    <ArrowUpRight className="h-4 w-4" />
                    +{transaction.amount}
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
