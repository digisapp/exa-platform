"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Ticket,
  Loader2,
  Minus,
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  quantity_available: number | null;
  quantity_sold: number;
  available: number | null;
  isSoldOut: boolean;
  isSaleActive: boolean;
}

interface TicketCheckoutProps {
  tiers: TicketTier[];
  eventName: string;
  referringModelName?: string;
}

export function TicketCheckout({
  tiers,
  eventName,
  referringModelName,
}: TicketCheckoutProps) {
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (newQty > 10) return;
    if (selectedTier && selectedTier.available !== null && newQty > selectedTier.available) return;
    setQuantity(newQty);
  };

  const totalPrice = selectedTier
    ? (selectedTier.price_cents * quantity) / 100
    : 0;

  const handleCheckout = async () => {
    if (!selectedTier) {
      setError("Please select a ticket type");
      return;
    }
    if (!buyerEmail) {
      setError("Please enter your email address");
      return;
    }
    if (!buyerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: selectedTier.id,
          quantity,
          buyerEmail,
          buyerName: buyerName || null,
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

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-pink-500 to-violet-500 p-6 text-white text-center">
        <Ticket className="h-12 w-12 mx-auto mb-3" />
        <h3 className="text-xl font-bold mb-1">Get Tickets</h3>
        <p className="text-white/80 text-sm">Secure your spot at {eventName}</p>
      </div>

      <CardContent className="p-6 space-y-6">
        {/* Tier Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Select Ticket Type</Label>
          {tiers.map((tier) => (
            <button
              key={tier.id}
              onClick={() => {
                if (!tier.isSoldOut && tier.isSaleActive) {
                  setSelectedTier(tier);
                  setQuantity(1);
                }
              }}
              disabled={tier.isSoldOut || !tier.isSaleActive}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                selectedTier?.id === tier.id
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-border hover:border-pink-500/50",
                (tier.isSoldOut || !tier.isSaleActive) &&
                  "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{tier.name}</p>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tier.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">
                    ${(tier.price_cents / 100).toFixed(2)}
                  </p>
                  {tier.isSoldOut ? (
                    <p className="text-xs text-red-500 font-medium">Sold Out</p>
                  ) : tier.available !== null ? (
                    <p className="text-xs text-muted-foreground">
                      {tier.available} left
                    </p>
                  ) : null}
                </div>
              </div>
              {selectedTier?.id === tier.id && (
                <CheckCircle className="absolute top-4 right-4 h-5 w-5 text-pink-500" />
              )}
            </button>
          ))}
        </div>

        {/* Quantity Selector */}
        {selectedTier && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quantity</Label>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-2xl font-bold w-12 text-center">
                {quantity}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleQuantityChange(1)}
                disabled={
                  quantity >= 10 ||
                  (selectedTier.available !== null &&
                    quantity >= selectedTier.available)
                }
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Buyer Info */}
        {selectedTier && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={buyerEmail}
                onChange={(e) => setBuyerEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Your tickets will be sent to this email
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name (Optional)</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Total */}
        {selectedTier && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between text-lg">
              <span className="font-medium">Total</span>
              <span className="font-bold text-2xl">
                ${totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {/* Checkout Button */}
        <Button
          onClick={handleCheckout}
          disabled={!selectedTier || isLoading}
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Ticket className="h-5 w-5 mr-2" />
              {selectedTier
                ? `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""}`
                : "Select a Ticket"}
            </>
          )}
        </Button>

        {/* Affiliate Message */}
        <p className="text-xs text-center text-muted-foreground">
          {referringModelName
            ? `Your purchase supports ${referringModelName}!`
            : "Support your favorite models by using their referral link"}
        </p>
      </CardContent>
    </Card>
  );
}
