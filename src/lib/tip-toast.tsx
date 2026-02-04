"use client";

import { toast } from "sonner";
import { Gift, Sparkles } from "lucide-react";

interface TipToastProps {
  amount: number;
  recipientName: string;
}

export function showTipSuccessToast({ amount, recipientName }: TipToastProps) {
  toast.custom(
    (t) => (
      <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[9999]">
        <div
          className="pointer-events-auto animate-in zoom-in-95 fade-in duration-300"
          onClick={() => toast.dismiss(t)}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-pink-500 via-amber-400 to-pink-500 opacity-60 animate-pulse rounded-3xl scale-110" />

          {/* Toast content */}
          <div className="relative bg-gradient-to-br from-pink-500/90 to-violet-600/90 backdrop-blur-xl text-white px-8 py-6 rounded-2xl shadow-2xl border border-white/20">
            {/* Sparkles decoration */}
            <div className="absolute -top-2 -left-2">
              <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
            </div>
            <div className="absolute -top-1 -right-3">
              <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse delay-75" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse delay-150" />
            </div>

            {/* Icon */}
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-white/20 ring-4 ring-white/10">
                <Gift className="h-8 w-8 text-white" />
              </div>
            </div>

            {/* Text */}
            <div className="text-center">
              <p className="text-2xl font-bold mb-1">
                Tip Sent!
              </p>
              <p className="text-white/90 text-lg">
                <span className="font-semibold text-yellow-300">{amount} coins</span> to {recipientName}
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      duration: 3000,
      position: "top-center",
      unstyled: true,
    }
  );
}
