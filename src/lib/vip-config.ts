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
 * Ladder reset 2026-08-06 (owner: "$10 is nothing"): VIP 5,000 /
 * Diamond 25,000 / Crown 100,000. Against that day's ledger (top spender
 * 10,010, then 1,022, then a 100-300 band) exactly one fan holds a badge
 * (VIP); Diamond and Crown are aspirational. Deliberate — tiers mark real
 * spend. USD framing: thresholds are COINS, and fans pay pack-dependent
 * rates ($0.13-$0.20/coin per stripe-config) — $0.10/coin is the model
 * cashout rate, never a fan price.
 *
 * Naming: fan tiers must not use model-side or coin-pack words. Rejected:
 * "Star" (fans aren't the stars — models are), "Elite"/"Whale" (coin-pack
 * labels in stripe-config). "Crown" is an explicit owner call (2026-08-06):
 * the fan tier is distinct from the yearly SwimCrown model competition —
 * don't re-flag that overlap.
 *
 * KEYS ARE POSITIONAL AND FROZEN: 'vip'/'star'/'diamond' persist in
 * fans.celebrated_vip_tier and live_wall_messages.vip_tier, so renames
 * change ONLY label/emoji — key 'star' now renders "Diamond" and key
 * 'diamond' renders "Crown". Same label≠stored-value convention as PPV's
 * DB value 'exclusive'. Never repurpose or reorder keys.
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
  /** Emoji for text-only surfaces (toasts, push bodies, announcements). */
  emoji: string;
}

/** Ordered highest → lowest so the first match wins. */
export const VIP_TIERS: readonly VipTier[] = [
  {
    key: "diamond", // frozen key — renders as top tier "Crown"
    label: "Crown",
    minSpend: 100000,
    badgeClass: "bg-amber-500/15 border-amber-400/40 text-amber-300",
    iconClass: "text-amber-300",
    emoji: "👑",
  },
  {
    key: "star", // frozen key — renders as middle tier "Diamond"
    label: "Diamond",
    minSpend: 25000,
    badgeClass: "bg-cyan-500/15 border-cyan-400/40 text-cyan-300",
    iconClass: "text-cyan-300",
    emoji: "💎",
  },
  {
    key: "vip",
    label: "VIP",
    minSpend: 5000,
    badgeClass: "bg-violet-500/15 border-violet-400/40 text-violet-300",
    iconClass: "text-violet-300",
    emoji: "✨",
  },
] as const;

/** Tier for a lifetime spend, or null below the VIP floor. */
export function vipTierOf(lifetimeSpendCoins: number | null | undefined): VipTier | null {
  if (!lifetimeSpendCoins || lifetimeSpendCoins <= 0) return null;
  return VIP_TIERS.find((t) => lifetimeSpendCoins >= t.minSpend) ?? null;
}

/** Tier for a stored key (e.g. live_wall_messages.vip_tier), or null. */
export function vipTierByKey(key: string | null | undefined): VipTier | null {
  if (!key) return null;
  return VIP_TIERS.find((t) => t.key === key) ?? null;
}
