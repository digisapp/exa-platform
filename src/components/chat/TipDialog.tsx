"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gift, Loader2, Coins } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { hapticFeedback } from "@/hooks/useHapticFeedback";
import { showTipSuccessToast } from "@/lib/tip-toast";

const TIP_AMOUNTS = [1, 5, 10, 25, 50, 100];

interface TipDialogProps {
  recipientId: string;
  recipientName: string;
  conversationId?: string;
  coinBalance: number;
  onTipSuccess?: (amount: number, newBalance: number) => void;
}

export function TipDialog({
  recipientId,
  recipientName,
  conversationId,
  coinBalance,
  onTipSuccess,
}: TipDialogProps) {
  const [open, setOpen] = useState(false);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-pink-500" />
            Send a Tip
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current balance */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your balance:</span>
            <span className="flex items-center gap-1 font-medium">
              <Coins className="h-4 w-4 text-pink-500" />
              {coinBalance} coins
            </span>
          </div>

          {/* Tip amounts */}
          <div className="grid grid-cols-3 gap-2">
            {TIP_AMOUNTS.map((amount) => {
              const canAfford = coinBalance >= amount;
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
                    "py-3 px-4 rounded-lg border text-center transition-all active:scale-95",
                    isSelected
                      ? "border-pink-500 bg-pink-500/10 text-pink-500"
                      : canAfford
                        ? "border-border hover:border-pink-500/50 hover:bg-pink-500/5"
                        : "border-border/50 text-muted-foreground opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="text-lg font-semibold">{amount}</div>
                  <div className="text-xs text-muted-foreground">coins</div>
                </button>
              );
            })}
          </div>

          {/* Send button */}
          <Button
            onClick={handleTip}
            disabled={!selectedAmount || loading}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : selectedAmount ? (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Send {selectedAmount} Coins
              </>
            ) : (
              "Select an amount"
            )}
          </Button>

          {/* Need more coins? */}
          {coinBalance < 100 && (
            <p className="text-center text-sm text-muted-foreground">
              Need more coins?{" "}
              <Link href="/coins" className="text-pink-500 hover:underline">
                Buy coins
              </Link>
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
