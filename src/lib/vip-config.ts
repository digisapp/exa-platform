/**
 * Fan VIP status — lifetime-spend recognition tiers.
 *
 * A fan's tier derives from fans.lifetime_spend_coins, a trigger-maintained
 * counter of coins actually SPENT (tips, messages, unlocks, calls, auction
 * escrow net of refunds) — never coins purchased, so hoarding a balance
 * earns nothing and spending it earns status. The counter is maintained by
 * trg_fan_lifetime_spend on coin_transactions (20260724000001); the action
 * whitelist lives in that migration — change the two together.
 *
 * Product guardrails (owner-approved 2026-07-24):
 * - Status is earned, never directly purchasable, and never decays.
 * - Tier badges only — never show spend amounts or history on any surface.
 * - Phase 1 surfaces: chat (model-facing + fan self). Public surfaces
 *   (profile Top Supporters) are Phase 2 and need a fan opt-out first.
 *
 * Thresholds calibrated against the prod ledger 2026-07-24: top spender
 * 10,010 coins, then 1,022 / 740 / 450, ~13 fans in the 100-300 band —
 * giving 1 Diamond, 2 Stars, ~13 VIPs on day one.
 */

export type VipTierKey = "vip" | "star" | "diamond";

export interface VipTier {
  key: VipTierKey;
  label: string;
  /** Minimum lifetime coins spent (inclusive). */
  minSpend: number;
  /** Tailwind classes for the badge pill (bg + border + text). */
  badgeClass: string;
  /** Tailwind text color for the gem icon. */
  iconClass: string;
}

/** Ordered highest → lowest so the first match wins. */
export const VIP_TIERS: readonly VipTier[] = [
  {
    key: "diamond",
    label: "Diamond",
    minSpend: 5000,
    badgeClass: "bg-cyan-500/15 border-cyan-400/40 text-cyan-300",
    iconClass: "text-cyan-300",
  },
  {
    key: "star",
    label: "Star",
    minSpend: 500,
    badgeClass: "bg-pink-500/15 border-pink-400/40 text-pink-300",
    iconClass: "text-pink-300",
  },
  {
    key: "vip",
    label: "VIP",
    minSpend: 100,
    badgeClass: "bg-violet-500/15 border-violet-400/40 text-violet-300",
    iconClass: "text-violet-300",
  },
] as const;

/** Tier for a lifetime spend, or null below the VIP floor. */
export function vipTierOf(lifetimeSpendCoins: number | null | undefined): VipTier | null {
  if (!lifetimeSpendCoins || lifetimeSpendCoins <= 0) return null;
  return VIP_TIERS.find((t) => lifetimeSpendCoins >= t.minSpend) ?? null;
}
