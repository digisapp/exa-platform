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
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (newQty > 5) return; // Max 5 per order
    if (workshop.spotsLeft !== null && newQty > workshop.spotsLeft) return;
    setQuantity(newQty);
  };

  const totalPrice = (workshop.priceCents * quantity) / 100;
  const originalTotal = workshop.originalPriceCents
    ? (workshop.originalPriceCents * quantity) / 100
    : null;
  const savings = originalTotal ? originalTotal - totalPrice : 0;

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
          quantity,
          buyerEmail,
          buyerName,
          buyerPhone: buyerPhone || null,
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
        {/* Price Display */}
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

        {/* Quantity Selector */}
        <div>
          <Label className="text-sm text-muted-foreground">Number of Spots</Label>
          <div className="flex items-center justify-center gap-4 mt-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleQuantityChange(1)}
              disabled={quantity >= 5 || (workshop.spotsLeft !== null && quantity >= workshop.spotsLeft)}
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
                Register Now
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
