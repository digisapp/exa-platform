"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreditCard, Loader2, Banknote, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface CreatorHousePaymentButtonProps {
  applicationId: string;
  gigId: string;
  modelId: string;
}

export function CreatorHousePaymentButton({
  applicationId,
  gigId,
  modelId,
}: CreatorHousePaymentButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  async function handleStripePayment() {
    setLoading(true);
    try {
      const response = await fetch("/api/gigs/creator-house-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          gigId,
          modelId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
        >
          <CreditCard className="h-5 w-5 mr-2" />
          Complete Payment - $1,400
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Payment</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to secure your Creator House spot.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stripe Payment */}
          <Button
            onClick={handleStripePayment}
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5 mr-2" />
            )}
            Pay $1,400 with Card
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or pay manually
              </span>
            </div>
          </div>

          {/* Alternative Payment Options */}
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-green-500" />
                <span className="font-semibold">Zelle</span>
              </div>
              <div className="text-sm text-muted-foreground pl-7">
                <p>Send to: <span className="text-foreground font-medium">EXA LLC</span></p>
                <p>Phone: <span className="text-foreground font-medium">561-573-7510</span></p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-500" />
                <span className="font-semibold">CashApp</span>
              </div>
              <div className="text-sm text-muted-foreground pl-7">
                <p>Send to: <span className="text-foreground font-medium">$EXAMODELS</span></p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              After sending via Zelle or CashApp, DM us on Instagram{" "}
              <a
                href="https://instagram.com/examodels"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:underline"
              >
                @examodels
              </a>{" "}
              to confirm your payment.
            </p>
          </div>

          {/* Flight Warning */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-500">
              <strong>Before booking flights:</strong> DM us on Instagram{" "}
              <a
                href="https://instagram.com/examodels"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-500 hover:underline"
              >
                @examodels
              </a>{" "}
              to confirm your travel dates!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
