"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  CreditCard,
  Heart,
  MessageCircle,
  Lock,
  Gift,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";

interface EnrichedTransaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  created_at: string;
  user_name: string;
  user_email: string;
  user_type: string;
}

const PAGE_SIZE = 20;

function getActionIcon(action: string) {
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
}

function getActionLabel(action: string) {
  switch (action) {
    case "purchase": return "Coin Purchase";
    case "tip_sent": return "Tip Sent";
    case "tip_received": return "Tip Received";
    case "content_sale": return "Content Sale";
    case "content_unlock": return "Content Unlock";
    case "message_sent": return "Message Sent";
    case "message_received": return "Message Payment";
    case "bonus":
    case "signup_bonus": return "Bonus";
    default: return action.replace(/_/g, " ");
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AdminTransactionList({
  initialTransactions,
  totalCount,
}: {
  initialTransactions: EnrichedTransaction[];
  totalCount: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialTransactions.length >= PAGE_SIZE && initialTransactions.length < totalCount);

  async function loadMore() {
    if (loading || !hasMore || transactions.length === 0) return;
    setLoading(true);

    const lastTx = transactions[transactions.length - 1];
    const res = await fetch(
      `/api/admin/transactions?cursor=${encodeURIComponent(lastTx.created_at)}&pageSize=${PAGE_SIZE}`
    );

    if (res.ok) {
      const data = await res.json();
      const newTxs = data.transactions || [];
      setTransactions((prev) => [...prev, ...newTxs]);
      setHasMore(newTxs.length >= PAGE_SIZE);
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
        <CardDescription>
          {totalCount.toLocaleString()} total transactions
        </CardDescription>
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
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium">{tx.user_name}</p>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {tx.user_type}
                      </Badge>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 font-semibold min-w-[80px] justify-end ${
                      tx.amount >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {tx.amount >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </span>
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
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Load More
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
