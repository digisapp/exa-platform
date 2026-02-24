"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type PackageId = "opening-show" | "day-2" | "day-3" | "daytime-show";

interface CheckoutButtonsProps {
  pkg: PackageId;
  fullPrice: number;
  installmentPrice: number;
}

export function CheckoutButtons({ pkg, fullPrice, installmentPrice }: CheckoutButtonsProps) {
  const [loading, setLoading] = useState<"full" | "installment" | null>(null);

  async function handleCheckout(paymentType: "full" | "installment") {
    setLoading(paymentType);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: pkg, paymentType }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Pricing Display */}
      <div className="flex items-end justify-between mb-5 pb-5 border-b border-white/10">
        <div>
          <p className="text-4xl font-bold">${fullPrice.toLocaleString()}</p>
          <p className="text-sm text-muted-foreground mt-0.5">Pay in full</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold text-pink-400">
            ${installmentPrice.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground">/mo</span>
          </p>
          <p className="text-sm text-muted-foreground">× 3 months</p>
        </div>
      </div>

      {/* Full Payment Button */}
      <Button
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold py-6 rounded-xl text-base shadow-lg shadow-pink-500/20 transition-all hover:shadow-pink-500/30 hover:scale-[1.01]"
        onClick={() => handleCheckout("full")}
        disabled={loading !== null}
      >
        {loading === "full" && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
        Book Now — Pay in Full
      </Button>

      {/* Installment Button */}
      <Button
        variant="outline"
        className="w-full border-pink-500/30 hover:border-pink-500 hover:bg-pink-500/5 hover:text-pink-400 font-semibold py-6 rounded-xl text-base transition-all"
        onClick={() => handleCheckout("installment")}
        disabled={loading !== null}
      >
        {loading === "installment" && <Loader2 className="h-5 w-5 animate-spin mr-2" />}
        3-Month Plan — ${installmentPrice.toLocaleString()}/mo
      </Button>
    </div>
  );
}
