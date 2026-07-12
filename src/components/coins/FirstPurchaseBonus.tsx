"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { FIRST_PURCHASE_BONUS_PCT, firstPurchaseBonusCoins } from "@/lib/coin-config";

const BONUS_PCT_LABEL = `${Math.round(FIRST_PURCHASE_BONUS_PCT * 100)}%`;

/**
 * True when the signed-in user is a fan who has never purchased coins, i.e.
 * eligible for the one-time first-purchase bonus. Mirrors the webhook's
 * server-side eligibility test: no 'purchase' rows in coin_transactions
 * (readable under the "Users can view own coin transactions" RLS policy).
 * fans.total_coins_purchased is deliberately NOT used — it has been stale
 * since migration 20260207000007; the ledger is the source of truth.
 *
 * Defaults to false (no promo) while loading, for non-fans, and on any error,
 * so already-paying fans never see a flash of the promo.
 */
export function useFirstPurchaseEligibility(): boolean {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };
      if (!actor || actor.type !== "fan" || cancelled) return;

      const { data: purchases, error } = await supabase
        .from("coin_transactions")
        .select("id")
        .eq("actor_id", actor.id)
        .eq("action", "purchase")
        .limit(1);
      if (error || cancelled) return;

      if ((purchases || []).length === 0) setEligible(true);
    }
    check();
    return () => { cancelled = true; };
  }, []);

  return eligible;
}

/** Compact synthwave promo banner for the buy-coins surfaces. */
export function FirstPurchaseBonusBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-pink-500/40 bg-gradient-to-r from-pink-500/15 via-fuchsia-500/10 to-violet-500/15 px-3.5 py-2.5",
        className
      )}
    >
      <div className="pointer-events-none absolute -inset-6 bg-gradient-to-r from-pink-500/10 to-violet-500/10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-pink-400" />
        <p className="text-sm leading-snug">
          <span className="font-semibold bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
            First purchase: +{BONUS_PCT_LABEL} bonus coins
          </span>
          <span className="text-muted-foreground"> — added instantly on any pack</span>
        </p>
      </div>
    </div>
  );
}

/** Per-pack bonus line, e.g. "+25 bonus coins" for the 100-coin pack. */
export function FirstPurchaseBonusChip({ coins, className }: { coins: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium text-pink-400",
        className
      )}
    >
      <Sparkles className="h-3 w-3" />
      +{firstPurchaseBonusCoins(coins).toLocaleString()} bonus
    </span>
  );
}
