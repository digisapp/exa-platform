"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Minus,
  Plus,
  CreditCard,
  Users,
  AlertCircle,
  CalendarClock,
} from "lucide-react";

interface WorkshopCheckoutProps {
  workshop: {
    id: string;
    title: string;
    priceCents: number;
    originalPriceCents: number | null;
    spotsLeft: number | null;
    isSoldOut: boolean;
  };
}

export function WorkshopCheckout({ workshop }: WorkshopCheckoutProps) {
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<"full" | "installment">("full");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const installmentAmount = 12500; // $125 per installment
  const installmentTotal = 37500; // $375 total (3 x $125)

  const handleQuantityChange = (delta: number) => {
    if (paymentType === "installment") return; // Locked to 1 for payment plans
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (newQty > 5) return; // Max 5 per order
    if (workshop.spotsLeft !== null && newQty > workshop.spotsLeft) return;
    setQuantity(newQty);
  };

  const handlePaymentTypeChange = (type: "full" | "installment") => {
    setPaymentType(type);
    if (type === "installment") {
      setQuantity(1); // Lock to 1 for payment plans
    }
  };

  const totalPrice = paymentType === "installment"
    ? installmentTotal / 100
    : (workshop.priceCents * quantity) / 100;
  const originalTotal = workshop.originalPriceCents
    ? (workshop.originalPriceCents * quantity) / 100
    : null;
  const savings = paymentType === "full" && originalTotal ? originalTotal - totalPrice : 0;

  const handleCheckout = async () => {
    if (!buyerEmail) {
      setError("Please enter your email address");
      return;
    }
    if (!buyerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!buyerName) {
      setError("Please enter your name");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/workshops/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId: workshop.id,
          quantity: paymentType === "installment" ? 1 : quantity,
          buyerEmail,
          buyerName,
          buyerPhone: buyerPhone || null,
          paymentType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  if (workshop.isSoldOut) {
    return (
      <Card className="border-red-500/30">
        <CardHeader>
          <CardTitle className="text-center text-red-500">Sold Out</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            This workshop is fully booked. Please check back for future workshops!
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/workshops">View Other Workshops</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-pink-500/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Register</span>
          {workshop.spotsLeft !== null && (
            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {workshop.spotsLeft} spots left
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Type Toggle */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Payment Option</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handlePaymentTypeChange("full")}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                paymentType === "full"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className="font-semibold text-sm">Pay in Full</div>
              <div className="text-lg font-bold text-pink-500">
                ${(workshop.priceCents / 100).toFixed(0)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => handlePaymentTypeChange("installment")}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                paymentType === "installment"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                Payment Plan
              </div>
              <div className="text-lg font-bold text-pink-500">
                3 x $125
              </div>
              <div className="text-xs text-muted-foreground">$375 total</div>
            </button>
          </div>
        </div>

        {/* Payment Plan Details */}
        {paymentType === "installment" && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="font-medium text-foreground">How it works:</p>
            <p>1st payment of $125 due today</p>
            <p>2nd payment of $125 due in 30 days</p>
            <p>3rd payment of $125 due in 60 days</p>
          </div>
        )}

        {/* Price Display (full payment) */}
        {paymentType === "full" && (
          <div className="text-center pb-4 border-b">
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-bold text-pink-500">
                ${(workshop.priceCents / 100).toFixed(0)}
              </span>
              {workshop.originalPriceCents && workshop.originalPriceCents > workshop.priceCents && (
                <span className="text-xl text-muted-foreground line-through">
                  ${(workshop.originalPriceCents / 100).toFixed(0)}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">per person</p>
          </div>
        )}

        {/* Quantity Selector */}
        <div>
          <Label className="text-sm text-muted-foreground">
            Number of Spots
            {paymentType === "installment" && (
              <span className="text-xs ml-1">(1 per payment plan)</span>
            )}
          </Label>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1 || paymentType === "installment"}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= 5 || paymentType === "installment" || (workshop.spotsLeft !== null && quantity >= workshop.spotsLeft)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Buyer Info */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="buyerName">Full Name *</Label>
            <Input
              id="buyerName"
              type="text"
              placeholder="Jane Smith"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="buyerEmail">Email Address *</Label>
            <Input
              id="buyerEmail"
              type="email"
              placeholder="you@example.com"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="buyerPhone">Phone Number (optional)</Label>
            <Input
              id="buyerPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Total & Checkout */}
        <div className="pt-4 border-t space-y-3">
          {paymentType === "installment" ? (
            <>
              <div className="flex justify-between text-lg font-semibold">
                <span>Due Today</span>
                <span className="text-pink-500">${(installmentAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total (3 payments)</span>
                <span>${(installmentTotal / 100).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-pink-500">${totalPrice.toFixed(2)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>You save</span>
                  <span>${savings.toFixed(2)}</span>
                </div>
              )}
            </>
          )}
          <Button
            className="w-full exa-gradient-button"
            size="lg"
            onClick={handleCheckout}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                {paymentType === "installment" ? "Pay $125 — First Installment" : "Register Now"}
              </>
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
