"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuyCoinsModal } from "@/components/coins/BuyCoinsModal";

const SUPER_TIP_AMOUNTS = [50, 100, 250, 500, 1000] as const;

interface Props {
  recipientName: string;
  coinBalance: number;
  onTip: (amount: number) => Promise<void>;
  onClose: () => void;
}

export function LiveWallTipPicker({
  recipientName,
  coinBalance,
  onTip,
  onClose,
}: Props) {
  const [isSending, setIsSending] = useState<number | null>(null);
  const [buyCoinsOpen, setBuyCoinsOpen] = useState(false);

  const handleSend = async (amount: number) => {
    if (isSending || amount > coinBalance) return;
    setIsSending(amount);
    try {
      await onTip(amount);
    } finally {
      setIsSending(null);
    }
  };

  return (
    <div
      className="absolute bottom-full left-0 mb-2 rounded-xl border border-amber-500/20 bg-black/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
        <span className="text-[10px] text-white/50">
          Super Tip{" "}
          <span className="text-white font-semibold">{recipientName}</span>
        </span>
        <button
          onClick={onClose}
          className="text-[10px] text-white/30 hover:text-white/60 ml-3"
          aria-label="Cancel"
        >
          ✕
        </button>
      </div>

      {/* Amount buttons in a row */}
      <div className="px-2.5 pb-2.5 flex gap-1.5">
        {SUPER_TIP_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => handleSend(amt)}
            disabled={amt > coinBalance || isSending !== null}
            aria-label={`Super tip ${amt} coins`}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
              amt > coinBalance
                ? "bg-white/5 text-white/20 cursor-not-allowed"
                : isSending === amt
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 hover:border-amber-500/40 hover:scale-105"
            )}
          >
            {isSending === amt ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="text-base">💰</span>
                <span>{amt}</span>
              </>
            )}
          </button>
        ))}
      </div>

      {/* CTA */}
      <div className="px-3 pb-2 text-center">
        {coinBalance < SUPER_TIP_AMOUNTS[0] ? (
          <button
            type="button"
            onClick={() => setBuyCoinsOpen(true)}
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>💰</span> Get Coins to Super Tip
          </button>
        ) : (
          <span className="text-[9px] text-amber-400/60">
            💰 The model gets notified when you Super Tip
          </span>
        )}
      </div>

      <BuyCoinsModal isOpen={buyCoinsOpen} onClose={() => setBuyCoinsOpen(false)} />
    </div>
  );
}
