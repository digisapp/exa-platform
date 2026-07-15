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
import {
  TIP_GIFTS,
  SUPER_TIP_AMOUNTS,
  MIN_CUSTOM_TIP,
  MAX_TIP,
  type TipGift,
} from "@/lib/tip-config";

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
  const [selectedGift, setSelectedGift] = useState<TipGift | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const customValue = parseInt(customAmount, 10);
  const customValid =
    Number.isInteger(customValue) && customValue >= MIN_CUSTOM_TIP && customValue <= MAX_TIP;
  // One effective amount regardless of how it was picked: gift tile, Super
  // Tip tile, or custom input (each selection clears the other two).
  const tipAmount = selectedGift?.amount ?? selectedAmount ?? (customValid ? customValue : null);

  const resetSelection = () => {
    setSelectedAmount(null);
    setSelectedGift(null);
    setCustomAmount("");
  };

  const handleTip = async () => {
    if (!tipAmount) return;
    if (tipAmount > liveBalance) {
      setBuyCoinsOpen(true);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          amount: tipAmount,
          conversationId,
          gift: selectedGift?.key,
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
      showTipSuccessToast({ amount: tipAmount, recipientName: data.recipientName, gift: selectedGift });
      setOpen(false);

      if (onTipSuccess) {
        onTipSuccess(tipAmount, data.newBalance);
      }
      resetSelection();
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

          {/* Gifts — small named tips so light spenders have something to send */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">Gifts</p>
            <div className="grid grid-cols-3 gap-2">
              {TIP_GIFTS.map((gift) => {
                const canAfford = liveBalance >= gift.amount;
                const isSelected = selectedGift?.key === gift.key;

                return (
                  <button
                    key={gift.key}
                    onClick={() => {
                      hapticFeedback("light");
                      if (canAfford) {
                        setSelectedGift(gift);
                        setSelectedAmount(null);
                        setCustomAmount("");
                      } else {
                        setBuyCoinsOpen(true);
                      }
                    }}
                    disabled={loading}
                    className={cn(
                      "py-3 px-2 rounded-2xl border text-center transition-all active:scale-95",
                      isSelected
                        ? "border-pink-500 bg-gradient-to-br from-pink-500/20 to-violet-500/20 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                        : canAfford
                          ? "border-white/10 bg-white/5 hover:border-pink-500/50 hover:bg-pink-500/10"
                          : "border-white/5 bg-white/[0.02] hover:border-amber-500/40 hover:bg-amber-500/5"
                    )}
                  >
                    <div className={cn("text-2xl leading-none", !canAfford && "opacity-50")}>{gift.emoji}</div>
                    <div className={cn("text-xs font-semibold mt-1", isSelected ? "text-pink-300" : canAfford ? "text-white" : "text-white/50")}>
                      {gift.label}
                    </div>
                    <div className={cn("text-[10px] mt-0.5", isSelected ? "text-pink-300/80" : canAfford ? "text-white/50" : "text-amber-400/80")}>
                      {canAfford ? `${gift.amount} coins` : "top up"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Super Tips */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/40 mb-2">Super Tips</p>
            <div className="grid grid-cols-2 gap-3">
              {SUPER_TIP_AMOUNTS.map((amount) => {
                const canAfford = liveBalance >= amount;
                const isSelected = selectedAmount === amount;

                return (
                  <button
                    key={amount}
                    onClick={() => {
                      hapticFeedback("light");
                      if (canAfford) {
                        setSelectedAmount(amount);
                        setSelectedGift(null);
                        setCustomAmount("");
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
          </div>

          {/* Custom amount */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 focus-within:border-pink-500/50 transition-colors">
            <Coins className="h-4 w-4 text-amber-400 flex-shrink-0" />
            <input
              type="number"
              inputMode="numeric"
              min={MIN_CUSTOM_TIP}
              max={MAX_TIP}
              value={customAmount}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedGift(null);
                setSelectedAmount(null);
              }}
              placeholder={`Custom amount (min ${MIN_CUSTOM_TIP})`}
              disabled={loading}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none min-w-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {customAmount && !customValid && (
              <span className="text-[10px] text-amber-400/90 flex-shrink-0">min {MIN_CUSTOM_TIP}</span>
            )}
          </div>

          {/* Send button */}
          <Button
            onClick={handleTip}
            disabled={!tipAmount || loading}
            className="w-full h-12 text-base rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white border-0 shadow-[0_0_24px_rgba(236,72,153,0.45)] hover:shadow-[0_0_32px_rgba(236,72,153,0.65)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:shadow-none"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : selectedGift ? (
              <>
                <span className="mr-2 text-lg leading-none">{selectedGift.emoji}</span>
                Send a {selectedGift.label} · {selectedGift.amount} Coins
              </>
            ) : tipAmount ? (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Send {tipAmount} Coins
              </>
            ) : (
              "Pick a gift or amount"
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
