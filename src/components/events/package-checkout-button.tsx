"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CalendarClock } from "lucide-react";
import { toast } from "sonner";

// "Partner with us" checkout for a B2B event package card on /events/[slug].
// Posts to the brands package-checkout route (api/brands/msw-checkout — name
// is historical; it serves any event via eventSlug) which redirects to Stripe.
// Prices are display-only here; the server always re-reads event_packages.

interface PackageCheckoutButtonProps {
  eventSlug: string;
  packageKey: string;
  installmentsAvailable: boolean;
  installmentPriceCents: number;
}

function fmtUsd(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });
}

export function PackageCheckoutButton({
  eventSlug,
  packageKey,
  installmentsAvailable,
  installmentPriceCents,
}: PackageCheckoutButtonProps) {
  const [loading, setLoading] = useState<"full" | "installment" | null>(null);

  async function checkout(paymentType: "full" | "installment") {
    setLoading(paymentType);
    try {
      const res = await fetch("/api/brands/msw-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ package: packageKey, paymentType, eventSlug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={() => checkout("full")}
        disabled={loading !== null}
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold rounded-xl shadow-[0_0_16px_rgba(236,72,153,0.25)] hover:shadow-[0_0_24px_rgba(236,72,153,0.4)] transition-all"
      >
        {loading === "full" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Partner with us
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
      {installmentsAvailable && (
        <Button
          onClick={() => checkout("installment")}
          disabled={loading !== null}
          variant="outline"
          className="w-full border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 hover:text-white rounded-xl transition-all"
        >
          {loading === "installment" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CalendarClock className="h-4 w-4 mr-2" />
              3 payments of ${fmtUsd(installmentPriceCents)}/mo
            </>
          )}
        </Button>
      )}
    </div>
  );
}
