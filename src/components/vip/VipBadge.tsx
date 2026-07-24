import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";
import { vipTierOf } from "@/lib/vip-config";

interface VipBadgeProps {
  /** fans.lifetime_spend_coins — badge renders null below the VIP floor. */
  lifetimeSpendCoins: number | null | undefined;
  /** xs: inbox rows / inline next to names; sm: chat header, popover header */
  size?: "xs" | "sm";
  className?: string;
}

/**
 * Fan VIP tier pill (VIP / Star / Diamond). Shows earned status only —
 * never spend amounts. Renders nothing for fans below the VIP floor, so
 * it can be dropped inline next to any fan name without a guard.
 */
export function VipBadge({ lifetimeSpendCoins, size = "xs", className }: VipBadgeProps) {
  const tier = vipTierOf(lifetimeSpendCoins);
  if (!tier) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide shrink-0",
        size === "xs" ? "px-1.5 py-px text-[9px]" : "px-2 py-0.5 text-[10px]",
        tier.badgeClass,
        className
      )}
    >
      <Gem className={cn(size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3", tier.iconClass)} />
      {tier.label}
    </span>
  );
}
