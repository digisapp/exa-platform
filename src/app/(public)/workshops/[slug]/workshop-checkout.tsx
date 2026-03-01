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
  Video,
  MapPin,
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
  coachingWorkshopId?: string | null;
}

export function WorkshopCheckout({ workshop, coachingWorkshopId }: WorkshopCheckoutProps) {
  const [product, setProduct] = useState<"workshop" | "coaching">("workshop");
  const [quantity, setQuantity] = useState(1);
  const [paymentType, setPaymentType] = useState<"full" | "installment">("full");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCoachingTab = !!coachingWorkshopId;
  const isCoaching = product === "coaching";

  // Workshop pricing
  const workshopInstallmentAmount = 12500; // $125
  const workshopInstallmentTotal = 37500;  // $375

  // Coaching pricing
  const coachingInstallmentAmount = 17500; // $175/mo
  const coachingInstallmentTotal = 52500;  // $525 total
  const coachingFullPrice = 49900;          // $499 pay in full

  const handleProductChange = (p: "workshop" | "coaching") => {
    setProduct(p);
    setPaymentType("full");
    setQuantity(1);
    setError(null);
  };

  const handleQuantityChange = (delta: number) => {
    if (paymentType === "installment" || isCoaching) return;
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (newQty > 5) return;
    if (workshop.spotsLeft !== null && newQty > workshop.spotsLeft) return;
    setQuantity(newQty);
  };

  const handlePaymentTypeChange = (type: "full" | "installment") => {
    setPaymentType(type);
    if (type === "installment") setQuantity(1);
  };

  const workshopTotal = paymentType === "installment"
    ? workshopInstallmentTotal / 100
    : (workshop.priceCents * quantity) / 100;
  const originalTotal = workshop.originalPriceCents
    ? (workshop.originalPriceCents * quantity) / 100
    : null;
  const workshopSavings = paymentType === "full" && originalTotal ? originalTotal - workshopTotal : 0;

  const handleCheckout = async () => {
    if (!buyerEmail || !buyerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!buyerName.trim()) {
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
          workshopId: isCoaching ? coachingWorkshopId : workshop.id,
          quantity: 1,
          buyerEmail,
          buyerName,
          buyerPhone: buyerPhone || null,
          paymentType,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create checkout");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  if (workshop.isSoldOut && !showCoachingTab) {
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
    <Card className={isCoaching ? "border-violet-500/50" : "border-pink-500/50"}>
      <CardHeader className={`rounded-t-xl pb-3 ${isCoaching ? "bg-violet-500/5" : "bg-pink-500/5"}`}>
        <CardTitle className="flex items-center justify-between">
          <span className={isCoaching ? "text-violet-400" : "text-pink-500"}>{isCoaching ? "Enroll" : "Register"}</span>
          {!isCoaching && workshop.spotsLeft !== null && (
            <span className="text-sm font-normal text-muted-foreground flex items-center gap-1">
              <Users className="h-4 w-4" />
              {workshop.spotsLeft} spots left
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Product selector (only when coaching option exists) */}
        {showCoachingTab && (
          <div className="grid grid-cols-2 gap-2 mb-1">
            {/* In-Person Workshop option */}
            <button
              type="button"
              onClick={() => handleProductChange("workshop")}
              className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                !isCoaching
                  ? "border-pink-500 bg-pink-500/10 shadow-sm shadow-pink-500/10"
                  : "border-border hover:border-pink-500/40 bg-transparent"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500">In Person</span>
              </div>
              <p className="text-sm font-bold leading-tight">Workshop</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">1-day live event</p>
              <p className="text-base font-bold text-pink-500 mt-1.5">
                ${(workshop.priceCents / 100).toFixed(0)}
              </p>
            </button>

            {/* 3-Month Coaching option */}
            <button
              type="button"
              onClick={() => handleProductChange("coaching")}
              className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                isCoaching
                  ? "border-violet-500 bg-violet-500/10 shadow-sm shadow-violet-500/10"
                  : "border-border hover:border-violet-500/40 bg-transparent"
              }`}
            >
              {/* Best Value badge */}
              <div className="absolute -top-2.5 right-2">
                <span className="inline-block bg-violet-500 text-white text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-1.5 mt-0.5">
                <Video className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Virtual + Live</span>
              </div>
              <p className="text-sm font-bold leading-tight">3-Mo Coaching</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">Workshop included</p>
              <p className="text-base font-bold text-violet-400 mt-1.5">
                $175<span className="text-xs font-normal text-muted-foreground">/mo</span>
              </p>
            </button>
          </div>
        )}

        {/* ── COACHING MODE ── */}
        {isCoaching && (
          <>
            {/* Includes workshop callout */}
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-semibold text-green-400">Everything included:</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="text-green-400">✓</span> Your in-person workshop seat
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="text-green-400">✓</span> 3 months of virtual 1-on-1 coaching
              </p>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Bi-weekly video submissions with personalized feedback each round. Get runway-ready from anywhere in the world.
            </p>

            {/* Payment toggle */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Option</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("installment")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    paymentType === "installment"
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-semibold text-sm flex items-center gap-1">
                    <CalendarClock className="h-3.5 w-3.5" />
                    3-Month Plan
                  </div>
                  <div className="text-lg font-bold text-violet-400">$175<span className="text-sm font-normal">/mo</span></div>
                  <div className="text-xs text-muted-foreground">$525 total</div>
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("full")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    paymentType === "full"
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-muted hover:border-muted-foreground/50"
                  }`}
                >
                  <div className="font-semibold text-sm">Pay in Full</div>
                  <div className="text-lg font-bold text-violet-400">$499</div>
                  <div className="text-xs text-green-400">Save $26</div>
                </button>
              </div>
            </div>

            {paymentType === "installment" && (
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">Payment schedule:</p>
                <p>1st payment of $175 — due today</p>
                <p>2nd payment of $175 — due in 30 days</p>
                <p>3rd payment of $175 — due in 60 days</p>
              </div>
            )}
          </>
        )}

        {/* ── WORKSHOP MODE ── */}
        {!isCoaching && (
          <>
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
                  <div className="text-lg font-bold text-pink-500">3 x $125</div>
                  <div className="text-xs text-muted-foreground">$375 total</div>
                </button>
              </div>
            </div>

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
          </>
        )}

        {/* Buyer Info — shared */}
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

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Total & Checkout */}
        <div className="pt-4 border-t space-y-3">
          {isCoaching ? (
            <div className="flex justify-between text-lg font-semibold">
              <span>{paymentType === "installment" ? "Due Today" : "Total"}</span>
              <span className="text-violet-400">
                ${paymentType === "installment"
                  ? (coachingInstallmentAmount / 100).toFixed(2)
                  : (coachingFullPrice / 100).toFixed(2)}
              </span>
            </div>
          ) : paymentType === "installment" ? (
            <>
              <div className="flex justify-between text-lg font-semibold">
                <span>Due Today</span>
                <span className="text-pink-500">${(workshopInstallmentAmount / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total (3 payments)</span>
                <span>${(workshopInstallmentTotal / 100).toFixed(2)}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-pink-500">${workshopTotal.toFixed(2)}</span>
              </div>
              {workshopSavings > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>You save</span>
                  <span>${workshopSavings.toFixed(2)}</span>
                </div>
              )}
            </>
          )}

          <Button
            className={`w-full ${isCoaching ? "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700" : "exa-gradient-button"}`}
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
                {isCoaching
                  ? paymentType === "installment"
                    ? "Enroll — $175 First Month"
                    : "Enroll — Pay in Full $499"
                  : paymentType === "installment"
                    ? "Pay $125 — First Installment"
                    : "Register Now"}
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
