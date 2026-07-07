import Link from "next/link";
import { Banknote, ArrowRight } from "lucide-react";

/**
 * Quiet nudge shown only when a model has coins to withdraw but hasn't
 * finished payout setup (ID verification and/or a payout method).
 * Models with no earnings never see it — the sensitive-info friction
 * waits until there's actual money on the table.
 */
export function PayoutSetupPrompt({
  coins,
  needsIdentity,
  needsPayoutMethod,
}: {
  coins: number;
  needsIdentity: boolean;
  needsPayoutMethod: boolean;
}) {
  if (coins <= 0 || (!needsIdentity && !needsPayoutMethod)) return null;

  const action =
    needsIdentity && needsPayoutMethod
      ? "verify your identity and add a payout method"
      : needsIdentity
        ? "verify your identity"
        : "add a payout method";

  return (
    <Link
      href={needsIdentity ? "/verify-identity" : "/wallet"}
      className="group flex items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
    >
      <Banknote className="h-5 w-5 text-amber-400 shrink-0" />
      <p className="text-sm text-white/80 min-w-0">
        <span className="font-semibold text-white">
          {coins.toLocaleString()} coins ready to cash out
        </span>
        {" — "}
        {action} to withdraw your earnings.
      </p>
      <ArrowRight className="h-4 w-4 text-amber-400 shrink-0 ml-auto opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
