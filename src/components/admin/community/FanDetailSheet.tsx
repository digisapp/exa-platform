"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Heart,
  MessageCircle,
  Sparkles,
  Coins,
  ShoppingBag,
  Loader2,
  TrendingUp,
  Gift,
  Lock,
  Zap,
  RefreshCw,
} from "lucide-react";

interface Fan {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  coin_balance: number;
  total_coins_purchased: number;
  state: string | null;
  created_at: string;
  coins_spent?: number;
  tips_spent?: number;
  messages_spent?: number;
  content_spent?: number;
  live_wall_spent?: number;
  following_count?: number;
  actor_id?: string;
}

interface Transaction {
  id: string;
  actor_id: string;
  amount: number;
  action: string;
  message_id: string | null;
  metadata: Record<string, string>;
  created_at: string;
  model_name?: string;
  model_username?: string;
}

interface FanDetailSheetProps {
  fan: Fan | null;
  open: boolean;
  onClose: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bgColor: string }> = {
  tip_sent: {
    label: "Tip",
    icon: <Heart className="h-3.5 w-3.5" />,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
  },
  live_wall_tip_sent: {
    label: "Live Wall Tip",
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
  },
  message_sent: {
    label: "Paid Message",
    icon: <MessageCircle className="h-3.5 w-3.5" />,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
  ppv_unlock: {
    label: "PPV Unlock",
    icon: <Lock className="h-3.5 w-3.5" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  content_unlock: {
    label: "Content Unlock",
    icon: <Lock className="h-3.5 w-3.5" />,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
  },
  purchase: {
    label: "Coins Purchased",
    icon: <ShoppingBag className="h-3.5 w-3.5" />,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  daily_spin: {
    label: "Daily Spin",
    icon: <Zap className="h-3.5 w-3.5" />,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
  },
  refund: {
    label: "Refund",
    icon: <RefreshCw className="h-3.5 w-3.5" />,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
  },
  bonus: {
    label: "Bonus",
    icon: <Gift className="h-3.5 w-3.5" />,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
};

function getActionConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    label: action.replace(/_/g, " "),
    icon: <Coins className="h-3.5 w-3.5" />,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
  };
}

export default function FanDetailSheet({ fan, open, onClose }: FanDetailSheetProps) {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !fan?.actor_id) return;

    const load = async () => {
      setLoading(true);
      setTransactions([]);

      // Fetch all transactions for this fan actor
      const { data: txs } = await (supabase.from("coin_transactions") as any)
        .select("id, actor_id, amount, action, message_id, metadata, created_at")
        .eq("actor_id", fan.actor_id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (!txs?.length) {
        setLoading(false);
        return;
      }

      // Collect actor IDs referenced in metadata (tip recipients, message recipients)
      const actorIdSet = new Set<string>();
      // Collect model IDs (models table) referenced in ppv_unlock
      const modelIdSet = new Set<string>();

      txs.forEach((tx: any) => {
        const meta = tx.metadata || {};
        if (meta.recipient_id) actorIdSet.add(meta.recipient_id);
        if (meta.recipient_actor_id) actorIdSet.add(meta.recipient_actor_id);
        if (meta.model_id) modelIdSet.add(meta.model_id);
      });

      // Look up models by actor_id (for tips and messages)
      const actorToModel = new Map<string, { name: string; username: string }>();
      if (actorIdSet.size > 0) {
        const { data: modelActors } = await (supabase.from("actors") as any)
          .select("id, user_id")
          .in("id", Array.from(actorIdSet))
          .eq("type", "model");

        if (modelActors?.length) {
          const userIds = modelActors.map((a: any) => a.user_id).filter(Boolean);
          const { data: models } = await (supabase.from("models") as any)
            .select("user_id, first_name, last_name, username")
            .in("user_id", userIds);

          const userToModel = new Map<string, { name: string; username: string }>();
          models?.forEach((m: any) => {
            const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.username;
            userToModel.set(m.user_id, { name, username: m.username });
          });

          modelActors.forEach((a: any) => {
            const model = userToModel.get(a.user_id);
            if (model) actorToModel.set(a.id, model);
          });
        }
      }

      // Look up models directly by model ID (for ppv_unlock)
      const modelIdToModel = new Map<string, { name: string; username: string }>();
      if (modelIdSet.size > 0) {
        const { data: models } = await (supabase.from("models") as any)
          .select("id, first_name, last_name, username")
          .in("id", Array.from(modelIdSet));

        models?.forEach((m: any) => {
          const name = [m.first_name, m.last_name].filter(Boolean).join(" ") || m.username;
          modelIdToModel.set(m.id, { name, username: m.username });
        });
      }

      // Enrich transactions with model names
      const enriched: Transaction[] = txs.map((tx: any) => {
        const meta = tx.metadata || {};
        let model: { name: string; username: string } | undefined;

        if (meta.recipient_id) model = actorToModel.get(meta.recipient_id);
        else if (meta.recipient_actor_id) model = actorToModel.get(meta.recipient_actor_id);
        else if (meta.model_id) model = modelIdToModel.get(meta.model_id);

        return {
          ...tx,
          model_name: model?.name,
          model_username: model?.username,
        };
      });

      setTransactions(enriched);
      setLoading(false);
    };

    void load();
  }, [open, fan?.actor_id, supabase]);

  if (!fan) return null;

  const totalSpent = fan.coins_spent || 0;
  const netSpent = (fan.total_coins_purchased || 0) - (fan.coin_balance || 0);

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        {/* Fan header */}
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex-shrink-0">
              {fan.avatar_url ? (
                <Image src={fan.avatar_url} alt={fan.display_name || "Fan"} width={56} height={56} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold">
                  {fan.display_name?.charAt(0) || fan.email?.charAt(0)?.toUpperCase() || "F"}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-left text-lg truncate">{fan.display_name || "Fan"}</SheetTitle>
              <p className="text-sm text-muted-foreground truncate">{fan.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fan.state && <span>{fan.state} · </span>}
                Joined {new Date(fan.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-base font-bold text-violet-400">{(fan.total_coins_purchased || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Purchased</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-base font-bold text-yellow-500">{totalSpent.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Spent</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-base font-bold text-green-400">{(fan.coin_balance || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Balance</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2.5 text-center">
              <p className="text-base font-bold text-pink-400">{(fan.following_count || 0).toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Following</p>
            </div>
          </div>
        </SheetHeader>

        {/* Spending breakdown */}
        {totalSpent > 0 && (
          <div className="px-6 py-4 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Where coins went</p>
            <div className="space-y-2">
              {[
                { label: "Tips to models", val: fan.tips_spent || 0, icon: <Heart className="h-3.5 w-3.5" />, color: "text-pink-400", bar: "bg-pink-500" },
                { label: "Live Wall tips", val: fan.live_wall_spent || 0, icon: <Sparkles className="h-3.5 w-3.5" />, color: "text-violet-400", bar: "bg-violet-500" },
                { label: "Paid messages", val: fan.messages_spent || 0, icon: <MessageCircle className="h-3.5 w-3.5" />, color: "text-blue-400", bar: "bg-blue-500" },
                { label: "Content / PPV", val: fan.content_spent || 0, icon: <Lock className="h-3.5 w-3.5" />, color: "text-orange-400", bar: "bg-orange-500" },
              ].filter(c => c.val > 0).map(c => (
                <div key={c.label} className="flex items-center gap-3">
                  <span className={`flex items-center gap-1.5 text-xs w-32 flex-shrink-0 ${c.color}`}>
                    {c.icon}{c.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.bar}`}
                      style={{ width: `${Math.round((c.val / totalSpent) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-right w-10 flex-shrink-0">{c.val.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transaction history */}
        <div className="flex-1 px-6 py-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Transaction history</p>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {transactions.map((tx) => {
                const cfg = getActionConfig(tx.action);
                const isDebit = tx.amount < 0;
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors">
                    {/* Action icon */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bgColor} ${cfg.color}`}>
                      {cfg.icon}
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {cfg.label}
                        {tx.model_name && (
                          <span className="text-muted-foreground font-normal"> → {tx.model_name}</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{formatRelativeTime(tx.created_at)}</p>
                    </div>

                    {/* Amount */}
                    <span className={`text-sm font-semibold flex-shrink-0 ${isDebit ? "text-red-400" : "text-green-400"}`}>
                      {isDebit ? "-" : "+"}{Math.abs(tx.amount).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
