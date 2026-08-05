import { Crown, Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { vipTierOf, type VipTier } from "@/lib/vip-config";

interface VipTierBadgeProps {
  tier: VipTier;
  /** xs: inbox rows / inline next to names; sm: chat header, popover header */
  size?: "xs" | "sm";
  className?: string;
}

/** Tier pill for an already-resolved tier. */
function VipTierBadge({ tier, size = "xs", className }: VipTierBadgeProps) {
  // key 'diamond' is the frozen top-tier key, rendered as "Crown"
  const Icon = tier.key === "diamond" ? Crown : Gem;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide shrink-0",
        size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
        tier.badgeClass,
        className
      )}
    >
      <Icon className={cn(size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3", tier.iconClass)} />
      {tier.label}
    </span>
  );
}

interface VipBadgeProps {
  /** fans.lifetime_spend_coins — badge renders null below the VIP floor. */
  lifetimeSpendCoins: number | null | undefined;
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Fan VIP tier pill (VIP / Diamond / Crown). Shows earned status only —
 * never spend amounts. Renders nothing for fans below the VIP floor, so
 * it can be dropped inline next to any fan name without a guard.
 */
export function VipBadge({ lifetimeSpendCoins, size = "xs", className }: VipBadgeProps) {
  const tier = vipTierOf(lifetimeSpendCoins);
  if (!tier) return null;

  return <VipTierBadge tier={tier} size={size} className={className} />;
}
