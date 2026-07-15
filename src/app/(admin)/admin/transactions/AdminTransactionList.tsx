"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Coins,
  CreditCard,
  Heart,
  MessageCircle,
  Lock,
  Gift,
  Radio,
  Sparkles,
  Gavel,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Search,
  X,
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

const ACTION_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All actions" },
  { value: "purchase", label: "Coin Purchases" },
  { value: "live_wall_tip_sent", label: "Live Wall Tips (sent)" },
  { value: "live_wall_tip_received", label: "Live Wall Tips (received)" },
  { value: "tip_sent", label: "Tips (sent)" },
  { value: "tip_received", label: "Tips (received)" },
  { value: "content_unlock", label: "Content Unlocks" },
  { value: "content_sale", label: "Content Sales" },
  { value: "message_sent", label: "Messages (paid)" },
  { value: "message_received", label: "Messages (earned)" },
  { value: "signup_bonus", label: "Signup Bonuses" },
  { value: "first_purchase_bonus", label: "First-Purchase Bonuses" },
  { value: "daily_spin", label: "Daily Spins" },
  { value: "exa_boost", label: "Spotlight Votes" },
  { value: "exa_boost_super", label: "Spotlight Super Votes" },
  { value: "exa_boost_reveal", label: "Spotlight Reveals" },
  { value: "auction_escrow", label: "Auction Escrow" },
  { value: "auction_escrow_refund", label: "Auction Escrow Refunds" },
];

function getActionIcon(action: string) {
  switch (action) {
    case "purchase":
      return <CreditCard className="h-4 w-4 text-green-500" />;
    case "tip_sent":
    case "tip_received":
      return <Heart className="h-4 w-4 text-pink-500" />;
    case "live_wall_tip_sent":
    case "live_wall_tip_received":
      return <Radio className="h-4 w-4 text-pink-500" />;
    case "content_sale":
    case "content_unlock":
      return <Lock className="h-4 w-4 text-purple-500" />;
    case "message_sent":
    case "message_received":
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case "bonus":
    case "signup_bonus":
    case "first_purchase_bonus":
    case "daily_spin":
      return <Gift className="h-4 w-4 text-yellow-500" />;
    case "exa_boost":
    case "exa_boost_super":
    case "exa_boost_reveal":
      return <Sparkles className="h-4 w-4 text-cyan-500" />;
    case "auction_escrow":
    case "auction_escrow_refund":
      return <Gavel className="h-4 w-4 text-orange-500" />;
    default:
      return <Coins className="h-4 w-4 text-gray-500" />;
  }
}

function getActionLabel(action: string) {
  switch (action) {
    case "purchase": return "Coin Purchase";
    case "tip_sent": return "Tip Sent";
    case "tip_received": return "Tip Received";
    case "live_wall_tip_sent": return "Live Wall Tip Sent";
    case "live_wall_tip_received": return "Live Wall Tip Received";
    case "content_sale": return "Content Sale";
    case "content_unlock": return "Content Unlock";
    case "message_sent": return "Message Sent";
    case "message_received": return "Message Payment";
    case "signup_bonus": return "Signup Bonus";
    case "first_purchase_bonus": return "First-Purchase Bonus";
    case "daily_spin": return "Daily Spin";
    case "exa_boost": return "Spotlight Vote";
    case "exa_boost_super": return "Spotlight Super Vote";
    case "exa_boost_reveal": return "Spotlight Reveal";
    case "auction_escrow": return "Auction Escrow";
    case "auction_escrow_refund": return "Auction Escrow Refund";
    case "bonus": return "Bonus";
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
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialTransactions.length >= PAGE_SIZE && initialTransactions.length < totalCount);
  const [actionFilter, setActionFilter] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const fetchSeq = useRef(0);

  const isFiltered = actionFilter !== "all" || search !== "";

  function buildParams(extra: Record<string, string> = {}) {
    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), ...extra });
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (search) params.set("q", search);
    return params;
  }

  const refetch = useCallback(async () => {
    const seq = ++fetchSeq.current;
    setLoading(true);

    const params = new URLSearchParams({ pageSize: String(PAGE_SIZE), page: "1" });
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (search) params.set("q", search);

    const res = await fetch(`/api/admin/transactions?${params}`);
    if (seq !== fetchSeq.current) return; // a newer fetch superseded this one

    if (res.ok) {
      const data = await res.json();
      const txs = data.transactions || [];
      setTransactions(txs);
      setTotal(data.total || 0);
      setHasMore(txs.length >= PAGE_SIZE && txs.length < (data.total || 0));
    }
    setLoading(false);
  }, [actionFilter, search]);

  // Refetch whenever a filter changes; restore server-rendered data when cleared
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (!isFiltered) {
      fetchSeq.current++;
      setTransactions(initialTransactions);
      setTotal(totalCount);
      setHasMore(initialTransactions.length >= PAGE_SIZE && initialTransactions.length < totalCount);
      setLoading(false);
      return;
    }
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, search]);

  async function loadMore() {
    if (loading || loadingMore || !hasMore || transactions.length === 0) return;
    setLoadingMore(true);

    const lastTx = transactions[transactions.length - 1];
    const params = buildParams({
      cursor: lastTx.created_at,
      cursorId: lastTx.id,
    });
    const res = await fetch(`/api/admin/transactions?${params}`);

    if (res.ok) {
      const data = await res.json();
      const newTxs = data.transactions || [];
      setTransactions((prev) => [...prev, ...newTxs]);
      setHasMore(newTxs.length >= PAGE_SIZE);
    }
    setLoadingMore(false);
  }

  function submitSearch() {
    setSearch(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setSearch("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
        <CardDescription>
          {total.toLocaleString()} {isFiltered ? "matching" : "total"} transactions
        </CardDescription>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="Search by name, email, or username…"
              className="pl-9 pr-9"
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant="secondary" size="sm" className="h-9" onClick={submitSearch}>
            Search
          </Button>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Coins className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{isFiltered ? "No transactions match your filters" : "No transactions yet"}</p>
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
                    <div className="flex items-center gap-1 justify-end">
                      {tx.user_email && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">{tx.user_email}</span>
                      )}
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
                    {tx.amount.toLocaleString()}
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
                  disabled={loadingMore}
                >
                  {loadingMore ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
