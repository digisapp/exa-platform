"use client";

import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const QUICK_AMOUNTS = [50, 100, 250, 500] as const;

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
  const [selectedAmount, setSelectedAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const activeAmount = isCustom
    ? parseInt(customAmount) || 0
    : selectedAmount;

  const canTip = activeAmount >= 50 && activeAmount <= coinBalance;

  const handleSend = async () => {
    if (!canTip || isSending) return;
    setIsSending(true);
    try {
      await onTip(activeAmount);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/50">
            Tip <span className="text-white font-semibold">{recipientName}</span>
          </span>
          <button
            onClick={onClose}
            className="text-[10px] text-white/30 hover:text-white/60"
          >
            Cancel
          </button>
        </div>
        <div className="flex items-center gap-1 mt-1">
          <Coins className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] text-white/40">
            Balance: {coinBalance.toLocaleString()} coins
          </span>
        </div>
      </div>

      {/* Quick amounts */}
      <div className="px-3 pb-2 grid grid-cols-4 gap-1.5">
        {QUICK_AMOUNTS.map((amt) => (
          <button
            key={amt}
            onClick={() => {
              setSelectedAmount(amt);
              setIsCustom(false);
            }}
            disabled={amt > coinBalance}
            className={cn(
              "py-1.5 rounded-lg text-xs font-semibold transition-all",
              !isCustom && selectedAmount === amt
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                : amt > coinBalance
                  ? "bg-white/5 text-white/20 cursor-not-allowed"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
            )}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={50}
            max={10000}
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setIsCustom(true);
            }}
            onFocus={() => setIsCustom(true)}
            placeholder="Custom (50+)"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/40"
          />
          <button
            onClick={handleSend}
            disabled={!canTip || isSending}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
              canTip
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:scale-105"
                : "bg-white/5 text-white/20 cursor-not-allowed"
            )}
          >
            {isSending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Coins className="h-3 w-3" />
                Tip
              </>
            )}
          </button>
        </div>
        {isCustom && activeAmount > 0 && activeAmount < 50 && (
          <p className="text-[10px] text-red-400 mt-1">Minimum 50 coins</p>
        )}
        {activeAmount > coinBalance && (
          <p className="text-[10px] text-red-400 mt-1">Not enough coins</p>
        )}
      </div>
    </div>
  );
}
