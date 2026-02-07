"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coins, TrendingUp, MessageCircle, Heart, ArrowUpRight, Calendar, Sparkles, Video, Phone, ShoppingBag, Gavel } from "lucide-react";
// Card components no longer used - replaced with custom styled divs
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
  if (!user) redirect("/signin");

  // Get actor
  const { data: actor } = (await supabase
    .from("actors")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: Actor | null };

  if (!actor) redirect("/fan/signup");

  // Only models can view earnings
  if (actor.type !== "model" && actor.type !== "admin") {
    redirect("/dashboard");
  }

  // Get model data (models are linked via user_id, not actor.id)
  const { data: model } = (await supabase
    .from("models")
    .select("*")
    .eq("user_id", user.id)
    .single()) as { data: Model | null };

  if (!model) redirect("/fan/signup");

  // Get recent transactions for display (limited to 50)
  const { data: transactions } = (await supabase
    .from("coin_transactions")
    .select("*")
    .eq("actor_id", actor.id)
    .gt("amount", 0)
    .order("created_at", { ascending: false })
    .limit(50)) as { data: CoinTransaction[] | null };

  // Get ALL transactions (no limit) for accurate totals
  const { data: allTransactionsData } = (await supabase
    .from("coin_transactions")
    .select("amount, action, created_at")
    .eq("actor_id", actor.id)
    .gt("amount", 0)) as { data: Pick<CoinTransaction, "amount" | "action" | "created_at">[] | null };

  const allTransactions = allTransactionsData || [];

  // Calculate totals from the full dataset
  const tipEarnings = allTransactions
    .filter(t => t.action === "tip_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const messageEarnings = allTransactions
    .filter(t => t.action === "message_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const contentEarnings = allTransactions
    .filter(t => t.action === "content_unlock_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const ppvEarnings = allTransactions
    .filter(t => t.action === "ppv_sale")
    .reduce((sum, t) => sum + t.amount, 0);

  const callEarnings = allTransactions
    .filter(t => t.action === "video_call_received" || t.action === "voice_call_received")
    .reduce((sum, t) => sum + t.amount, 0);

  const auctionEarnings = allTransactions
    .filter(t => t.action === "auction_sale")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalEarnings = tipEarnings + messageEarnings + contentEarnings + ppvEarnings + callEarnings + auctionEarnings;

  // Get recent transactions for display from the limited query
  const recentTransactions = (transactions || []).slice(0, 20);

  // Calculate this month's earnings from the full dataset
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
      case "content_unlock_received":
        return "Content Sale";
      case "ppv_sale":
        return "PPV Unlock";
      case "video_call_received":
        return "Video Call";
      case "voice_call_received":
        return "Voice Call";
      case "auction_sale":
        return "Auction Sale";
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
      case "content_unlock_received":
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      case "ppv_sale":
        return <Coins className="h-4 w-4 text-orange-500" />;
      case "video_call_received":
        return <Video className="h-4 w-4 text-purple-500" />;
      case "voice_call_received":
        return <Phone className="h-4 w-4 text-indigo-500" />;
      case "auction_sale":
        return <Gavel className="h-4 w-4 text-amber-500" />;
      default:
        return <Coins className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <div className="container max-w-4xl py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-600/20 via-violet-500/10 to-transparent border border-pink-500/20 p-6 md:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-violet-500/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-pink-500/25">
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Earnings</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Track your coin earnings from tips, messages, content, calls, and auctions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Balance */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-transparent border border-pink-500/20 p-6 md:p-8">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-sm text-muted-foreground mb-2">Current Balance</p>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/25">
              <Coins className="h-7 w-7 text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-bold tracking-tight">
                {model.coin_balance?.toLocaleString() || 0}
              </span>
              <span className="text-lg font-normal text-muted-foreground">coins</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent p-5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-1.5">
            <div className="p-1 rounded-md bg-violet-500/10">
              <TrendingUp className="h-3 w-3 text-violet-500" />
            </div>
            Total Earned
          </div>
          <p className="text-2xl font-bold text-violet-400">{totalEarnings.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-1.5">
            <div className="p-1 rounded-md bg-blue-500/10">
              <Calendar className="h-3 w-3 text-blue-500" />
            </div>
            This Month
          </div>
          <p className="text-2xl font-bold text-blue-400">{thisMonthEarnings.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent p-5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-1.5">
            <div className="p-1 rounded-md bg-pink-500/10">
              <Heart className="h-3 w-3 text-pink-500" />
            </div>
            From Tips
          </div>
          <p className="text-2xl font-bold text-pink-400">{tipEarnings.toLocaleString()}</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent p-5">
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm mb-1.5">
            <div className="p-1 rounded-md bg-blue-500/10">
              <MessageCircle className="h-3 w-3 text-blue-500" />
            </div>
            From Messages
          </div>
          <p className="text-2xl font-bold text-blue-400">{messageEarnings.toLocaleString()}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h2 className="font-semibold text-lg">Recent Earnings</h2>
              <p className="text-sm text-muted-foreground">Your latest coin earnings</p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6">
          {recentTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-transparent border border-pink-500/10 flex items-center justify-center">
                <Coins className="h-8 w-8 text-pink-500/40" />
              </div>
              <p className="font-medium">No earnings yet</p>
              <p className="text-sm mt-1">Start chatting to earn coins from fans!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 px-3 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      transaction.action === "tip_received"
                        ? "bg-pink-500/10"
                        : transaction.action === "message_received"
                        ? "bg-blue-500/10"
                        : transaction.action === "content_unlock_received"
                        ? "bg-green-500/10"
                        : transaction.action === "ppv_sale"
                        ? "bg-orange-500/10"
                        : transaction.action === "video_call_received"
                        ? "bg-purple-500/10"
                        : transaction.action === "voice_call_received"
                        ? "bg-indigo-500/10"
                        : transaction.action === "auction_sale"
                        ? "bg-amber-500/10"
                        : "bg-muted"
                    }`}>
                      {getActionIcon(transaction.action)}
                    </div>
                    <div>
                      <p className="font-medium">{getActionLabel(transaction.action)}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-500/10 text-green-500 font-semibold px-3 py-1 rounded-full text-sm">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    +{transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
