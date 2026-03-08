"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Coins,
  Heart,
  MessageCircle,
  ShoppingBag,
  Video,
  Phone,
  Gavel,
  ArrowUpRight,
  Loader2,
  Sparkles,
} from "lucide-react";

interface CoinTransaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const PAGE_SIZE = 20;

function getActionLabel(action: string) {
  switch (action) {
    case "tip_received": return "Tip";
    case "message_received": return "Message";
    case "content_unlock_received": return "Content Sale";
    case "ppv_sale": return "PPV Unlock";
    case "video_call_received": return "Video Call";
    case "voice_call_received": return "Voice Call";
    case "auction_sale": return "Auction Sale";
    default: return action;
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "tip_received": return <Heart className="h-4 w-4 text-pink-500" />;
    case "message_received": return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "content_unlock_received": return <ShoppingBag className="h-4 w-4 text-green-500" />;
    case "ppv_sale": return <Coins className="h-4 w-4 text-orange-500" />;
    case "video_call_received": return <Video className="h-4 w-4 text-purple-500" />;
    case "voice_call_received": return <Phone className="h-4 w-4 text-indigo-500" />;
    case "auction_sale": return <Gavel className="h-4 w-4 text-amber-500" />;
    default: return <Coins className="h-4 w-4 text-yellow-500" />;
  }
}

function getActionBg(action: string) {
  switch (action) {
    case "tip_received": return "bg-pink-500/10";
    case "message_received": return "bg-blue-500/10";
    case "content_unlock_received": return "bg-green-500/10";
    case "ppv_sale": return "bg-orange-500/10";
    case "video_call_received": return "bg-purple-500/10";
    case "voice_call_received": return "bg-indigo-500/10";
    case "auction_sale": return "bg-amber-500/10";
    default: return "bg-muted";
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function EarningsTransactionList({
  initialTransactions,
  actorId,
}: {
  initialTransactions: CoinTransaction[];
  actorId: string;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialTransactions.length >= PAGE_SIZE);

  const supabase = createClient();

  async function loadMore() {
    if (loading || !hasMore || transactions.length === 0) return;
    setLoading(true);

    const lastTx = transactions[transactions.length - 1];
    const { data } = await (supabase
      .from("coin_transactions") as any)
      .select("*")
      .eq("actor_id", actorId)
      .gt("amount", 0)
      .lt("created_at", lastTx.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (data && data.length > 0) {
      setTransactions((prev) => [...prev, ...data]);
      setHasMore(data.length >= PAGE_SIZE);
    } else {
      setHasMore(false);
    }
    setLoading(false);
  }

  return (
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
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-transparent border border-pink-500/10 flex items-center justify-center">
              <Coins className="h-8 w-8 text-pink-500/40" />
            </div>
            <p className="font-medium">No earnings yet</p>
            <p className="text-sm mt-1">Start chatting to earn coins from fans!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between py-3 px-3 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${getActionBg(transaction.action)}`}>
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

            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMore}
                  disabled={loading}
                  className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
