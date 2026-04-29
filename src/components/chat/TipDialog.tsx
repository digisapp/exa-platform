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

const TIP_AMOUNTS = [5, 10, 25, 50, 100, 500];

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center">
              <Gift className="h-5 w-5 text-pink-500" />
            </div>
            Send a Tip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current balance */}
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted/50">
            <span className="text-sm text-muted-foreground">Your balance</span>
            <span className="flex items-center gap-1.5 font-semibold">
              <Coins className="h-4 w-4 text-yellow-500" />
              {liveBalance} coins
            </span>
          </div>

          {/* Tip amounts */}
          <div className="grid grid-cols-3 gap-3">
            {TIP_AMOUNTS.map((amount) => {
              const canAfford = liveBalance >= amount;
              const isSelected = selectedAmount === amount;

              return (
                <button
                  key={amount}
                  onClick={() => {
                    if (canAfford) {
                      hapticFeedback("light");
                      setSelectedAmount(amount);
                    }
                  }}
                  disabled={!canAfford || loading}
                  className={cn(
                    "py-4 px-4 rounded-2xl border-2 text-center transition-all active:scale-95",
                    isSelected
                      ? "border-pink-500 bg-pink-500/10 text-pink-500 shadow-lg shadow-pink-500/10"
                      : canAfford
                        ? "border-border hover:border-pink-500/50 hover:bg-pink-500/5"
                        : "border-border/50 text-muted-foreground opacity-40 cursor-not-allowed"
                  )}
                >
                  <div className="text-2xl font-bold">{amount}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">coins</div>
                </button>
              );
            })}
          </div>

          {/* Send button */}
          <Button
            onClick={handleTip}
            disabled={!selectedAmount || loading}
            className="w-full h-12 text-base rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 shadow-lg shadow-pink-500/20 active:scale-[0.98] transition-transform"
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

          {/* Need more coins? */}
          {liveBalance < 100 && (
            <button
              type="button"
              onClick={() => setBuyCoinsOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-pink-500 transition-colors py-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Need more coins? Buy now
            </button>
          )}

          <BuyCoinsModal
            isOpen={buyCoinsOpen}
            onClose={() => setBuyCoinsOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
