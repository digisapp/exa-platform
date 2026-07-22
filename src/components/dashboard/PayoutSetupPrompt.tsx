"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, X } from "lucide-react";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";
import { useNudgeSlot, useNudgeSnooze } from "@/components/dashboard/NudgeSlot";

/**
 * Payout nudge v2 — "you have real money, payout isn't set up yet".
 *
 * v1 (PR #68) died in PR #73 for firing at any balance > 0 and duplicating
 * the wallet's IdentityVerificationBanner + PayoutsTab. v2 is deliberately
 * NOT a re-implementation of either: it's a single dismissible pointer row
 * that only exists when both are true —
 *   1. coin_balance >= PAYOUT_NUDGE_MIN_COINS (100 = the first-cashout
 *      minimum, so it appears exactly when cashing out becomes possible),
 *   2. NO payout method on file (zelle_info null AND no bank_accounts row
 *      AND no completed Payoneer).
 * Both conditions are resolved SERVER-SIDE in the dashboard RSC — this
 * component only handles dismissal, so an ineligible model never even
 * ships the markup.
 *
 * Dismissal: localStorage, re-eligible after 14 days (per-device by
 * design — no models column/migration for a nudge).
 *
 * Renders inside the dashboard's <NudgeSlot> (at most one nudge per page
 * view); this card is FIRST in the slot, so it outranks PushNudgeCard
 * whenever both are eligible.
 */

const DISMISS_KEY = "exa_payout_nudge_dismissed_at";

interface PayoutSetupPromptProps {
  coins: number;
  /** identity_verified_at is null — copy mentions ID verification too */
  needsIdentity: boolean;
}

export function PayoutSetupPrompt({ coins, needsIdentity }: PayoutSetupPromptProps) {
  // Start hidden until the localStorage check runs so SSR/CSR markup match
  const [visible, setVisible] = useState(false);
  const claim = useNudgeSlot("payout");
  const { snoozed, dismiss: snooze } = useNudgeSnooze(DISMISS_KEY);

  useEffect(() => {
    if (snoozed()) return;
    if (claim()) setVisible(true);
  }, [claim, snoozed]);

  const dismiss = () => {
    setVisible(false);
    snooze();
  };

  if (!visible) return null;

  return (
    <section className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/[0.06] to-transparent px-4 py-3 shadow-[0_0_16px_rgba(52,211,153,0.12)]">
      <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/15 ring-1 ring-emerald-500/30 flex items-center justify-center">
        <Banknote className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {formatUsd(coinsToUsd(coins))} ready to cash out
        </p>
        <p className="text-xs text-white/60 truncate">
          {needsIdentity
            ? "Add a payout method and verify your ID to get paid"
            : "Add a payout method to get paid — takes a minute"}
        </p>
      </div>
      <Link
        href="/wallet"
        className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 transition-all shadow-[0_0_12px_rgba(52,211,153,0.35)]"
      >
        Set up payout
      </Link>
      <button
        onClick={dismiss}
        aria-label="Dismiss payout reminder"
        className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}
