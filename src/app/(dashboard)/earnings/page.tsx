"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Coins, TrendingUp, MessageCircle, Heart, Calendar, Wallet } from "lucide-react";
import Link from "next/link";
import type { Actor, Model } from "@/types/database";
import { EarningsTransactionList } from "./EarningsTransactionList";

interface CoinTransaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface EarningsSummaryRow {
  action: string;
  total_amount: number;
  this_month_amount: number;
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

  // Fetch aggregated earnings summary via RPC (replaces loading ALL transactions)
  const [{ data: earningsSummary }, { data: transactions }] = await Promise.all([
    (supabase.rpc as any)("get_earnings_summary", { p_actor_id: actor.id }) as Promise<{ data: EarningsSummaryRow[] | null }>,
    (supabase.from("coin_transactions") as any)
      .select("*")
      .eq("actor_id", actor.id)
      .gt("amount", 0)
      .order("created_at", { ascending: false })
      .limit(20) as Promise<{ data: CoinTransaction[] | null }>,
  ]);

  const summary = earningsSummary || [];
  const getTotal = (action: string) =>
    summary.find((s) => s.action === action)?.total_amount || 0;

  const tipEarnings = Number(getTotal("tip_received"));
  const messageEarnings = Number(getTotal("message_received"));
  const contentEarnings = Number(getTotal("content_unlock_received"));
  const ppvEarnings = Number(getTotal("ppv_sale"));
  const callEarnings = Number(getTotal("video_call_received")) + Number(getTotal("voice_call_received"));
  const auctionEarnings = Number(getTotal("auction_sale"));
  const totalEarnings = summary.reduce((sum, s) => sum + Number(s.total_amount), 0);
  const thisMonthEarnings = summary.reduce((sum, s) => sum + Number(s.this_month_amount), 0);

  const recentTransactions = transactions || [];

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
              <p className="text-sm text-muted-foreground mt-0.5">Track your coin earnings from tips, messages, content, calls, and bids</p>
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
          <div className="flex items-center justify-between">
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
            <Link
              href="/wallet"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold text-sm transition-all shadow-lg shadow-green-500/25"
            >
              <Wallet className="h-4 w-4" />
              Withdraw
            </Link>
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
      <EarningsTransactionList
        initialTransactions={recentTransactions}
        actorId={actor.id}
      />
    </div>
  );
}
