"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, Coins, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { showTipSuccessToast } from "@/lib/tip-toast";
import { BuyCoinsModal } from "@/components/coins/BuyCoinsModal";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";

const TIP_AMOUNTS = [100, 250, 500, 1000];

interface TipDialogProps {
  recipientId: string;
  recipientName: string;
  conversationId?: string;
  coinBalance: number;
  onTipSuccess?: (amount: number, newBalance: number) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TipDialog({
  recipientId,
  recipientName,
  conversationId,
  coinBalance,
  onTipSuccess,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: TipDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);
  const balanceCtx = useCoinBalanceOptional();
  // Use live balance from context if available, fall back to prop
  const liveBalance = balanceCtx?.balance ?? coinBalance;
  const isControlled = externalOnOpenChange !== undefined;
  const open = isControlled ? (externalOpen ?? false) : internalOpen;
  const setOpen = isControlled ? externalOnOpenChange : setInternalOpen;
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTip = async () => {
    if (!selectedAmount) return;

    setLoading(true);

    try {
      const response = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          amount: selectedAmount,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          toast.error(`Insufficient coins. Need ${data.required}, have ${data.balance}`);
        } else {
          toast.error(data.error || "Failed to send tip");
        }
        return;
      }

      hapticFeedback("success");
      showTipSuccessToast({ amount: selectedAmount, recipientName: data.recipientName });
      setOpen(false);
      setSelectedAmount(null);

      if (onTipSuccess) {
        onTipSuccess(selectedAmount, data.newBalance);
      }
    } catch {
      toast.error("Failed to send tip");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-pink-500 hover:text-pink-600 hover:bg-pink-500/10"
          >
            <Gift className="h-4 w-4 mr-1" />
            Tip
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md bg-[#120a24]/95 backdrop-blur-xl border-violet-500/30 shadow-2xl shadow-violet-500/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl text-white">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-pink-500/40 blur-lg" />
              <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-pink-500/40 flex items-center justify-center">
                <Gift className="h-5 w-5 text-pink-300" />
              </div>
            </div>
            <span>
              Send a Tip
              <span className="block text-sm font-normal text-white/60">
                Show {recipientName} some love
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current balance */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
            <span className="text-sm text-white/60">Your balance</span>
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <Coins className="h-4 w-4 text-amber-400" />
              {liveBalance} coins
            </span>
          </div>

          {/* Tip amounts */}
          <div className="grid grid-cols-2 gap-3">
            {TIP_AMOUNTS.map((amount) => {
              const canAfford = liveBalance >= amount;
              const isSelected = selectedAmount === amount;

              return (
                <button
                  key={amount}
                  onClick={() => {
                    hapticFeedback("light");
                    if (canAfford) {
                      setSelectedAmount(amount);
                    } else {
                      // Not enough coins for this tier — open the top-up flow
                      // instead of dead-ending on a disabled tile.
                      setBuyCoinsOpen(true);
                    }
                  }}
                  disabled={loading}
                  className={cn(
                    "py-4 px-4 rounded-2xl border text-center transition-all active:scale-95",
                    isSelected
                      ? "border-pink-500 bg-gradient-to-br from-pink-500/20 to-violet-500/20 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                      : canAfford
                        ? "border-white/10 bg-white/5 text-white hover:border-pink-500/50 hover:bg-pink-500/10"
                        : "border-white/5 bg-white/[0.02] text-white/50 hover:border-amber-500/40 hover:bg-amber-500/5"
                  )}
                >
                  <div className={cn("text-2xl font-bold", !isSelected && !canAfford && "opacity-60")}>{amount}</div>
                  <div className={cn("text-xs mt-0.5", isSelected ? "text-pink-300/80" : canAfford ? "text-white/50" : "text-amber-400/80")}>
                    {canAfford ? "coins" : "top up"}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Send button */}
          <Button
            onClick={handleTip}
            disabled={!selectedAmount || loading}
            className="w-full h-12 text-base rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white border-0 shadow-[0_0_24px_rgba(236,72,153,0.45)] hover:shadow-[0_0_32px_rgba(236,72,153,0.65)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : selectedAmount ? (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Send {selectedAmount} Coins
              </>
            ) : (
              "Pick an amount"
            )}
          </Button>

          {/* Need more coins? Always available — bigger tiers stay one tap away */}
          <button
            type="button"
            onClick={() => setBuyCoinsOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-white/60 hover:text-pink-300 transition-colors py-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Need more coins? Buy now
          </button>

          <BuyCoinsModal
            isOpen={buyCoinsOpen}
            onClose={() => setBuyCoinsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
