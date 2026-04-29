"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Coins, ArrowLeft, CheckCircle, Loader2, Sparkles } from "lucide-react";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";
import { useCoinBalanceOptional } from "@/contexts/CoinBalanceContext";

interface BuyCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PACKAGE_LABELS = ["Starter", "Basic", "Value", "Pro", "Super", "Elite", "Ultimate", "Mega", "Whale"];

export function BuyCoinsModal({ isOpen, onClose, onSuccess }: BuyCoinsModalProps) {
  const balanceCtx = useCoinBalanceOptional();
  const [selectedCoins, setSelectedCoins] = useState<number | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const stripePromiseRef = useRef<Promise<Stripe | null> | null>(null);

  // Lazily initialise Stripe only when the modal first opens
  useEffect(() => {
    if (isOpen && !stripePromiseRef.current) {
      stripePromiseRef.current = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
    }
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedCoins(null);
      setClientSecret(null);
      setError("");
      setComplete(false);
    }
  }, [isOpen]);

  const handleSelectPackage = async (coins: number) => {
    setSelectedCoins(coins);
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/coins/embedded-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSelectedCoins(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedCoins(null);
    setClientSecret(null);
    setError("");
  };

  const handleCheckoutComplete = useCallback(() => {
    setComplete(true);
    // Play a subtle sound
    const audio = new Audio("/sounds/coin-purchase.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {});
    // Refresh shared balance so header + all components update immediately
    balanceCtx?.refreshBalance();
    setTimeout(() => {
      onSuccess?.();
      onClose();
    }, 2000);
  }, [onSuccess, onClose, balanceCtx]);

  const selectedPkg = COIN_PACKAGES.find((p) => p.coins === selectedCoins);

  return (
    <Dialog open={isOpen} onOpenChange={clientSecret ? undefined : onClose}>
      <DialogContent className="sm:max-w-lg">
        {/* Only show header when on the package picker */}
        {!clientSecret && (
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 flex items-center justify-center">
                <Coins className="h-4 w-4 text-pink-500" />
              </div>
              Buy EXA Coins
            </DialogTitle>
          </DialogHeader>
        )}

        <div className="space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Success state */}
          {complete ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold mb-1">Payment Successful!</h3>
              <p className="text-muted-foreground text-sm">Your coins have been added to your wallet.</p>
            </div>

          ) : clientSecret ? (
            /* Embedded Stripe Checkout */
            <div>
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <button
                  onClick={handleBack}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4 text-muted-foreground" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Purchasing</p>
                  <p className="font-semibold text-sm truncate">
                    {selectedPkg?.coins.toLocaleString()} coins — {selectedPkg?.priceDisplay}
                  </p>
                </div>
              </div>
              <div className="min-h-[380px]">
                <EmbeddedCheckoutProvider
                  stripe={stripePromiseRef.current}
                  options={{ clientSecret, onComplete: handleCheckoutComplete }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            </div>

          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>

          ) : (
            /* Package picker */
            <>
              <div className="grid grid-cols-2 gap-3">
                {COIN_PACKAGES.map((pkg, index) => {
                  const isBestValue = index === COIN_PACKAGES.length - 1;
                  const isPopular = index === 2; // 100 coins
                  return (
                    <button
                      key={pkg.coins}
                      onClick={() => handleSelectPackage(pkg.coins)}
                      className={cn(
                        "relative text-left p-4 rounded-xl border-2 transition-all hover:border-pink-500/50 hover:shadow-md active:scale-[0.98]",
                        isBestValue
                          ? "border-violet-500/60 bg-violet-500/5"
                          : "border-border hover:bg-muted/30"
                      )}
                    >
                      {(isBestValue || isPopular) && (
                        <div className="absolute -top-2.5 right-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-2 py-0",
                              isBestValue
                                ? "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0"
                                : "bg-pink-500 text-white border-0"
                            )}
                          >
                            {isBestValue ? "Best Value" : "Popular"}
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-yellow-500 shrink-0" />
                        <span className="text-xs text-muted-foreground font-medium">
                          {PACKAGE_LABELS[index]}
                        </span>
                      </div>
                      <p className="text-2xl font-bold leading-none">
                        {pkg.coins.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">coins</p>
                      <p className="text-base font-semibold text-pink-500">{pkg.priceDisplay}</p>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
                <Sparkles className="h-3 w-3" />
                <span>Secure payment · Apple Pay &amp; Google Pay · Coins never expire</span>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
