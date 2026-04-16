"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Ticket,
  Loader2,
  Minus,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
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
  eventDate?: string;
  eventLocation?: string;
  referringModelName?: string;
}

export function TicketCheckout({
  tiers,
  eventName,
  eventDate,
  eventLocation,
  referringModelName,
}: TicketCheckoutProps) {
  const [isOpen, setIsOpen] = useState(false);
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

  // Get the lowest price for the button display
  const lowestPrice = Math.min(...tiers.map(t => t.price_cents)) / 100;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg py-6 rounded-xl shadow-lg shadow-pink-500/25"
        >
          <Ticket className="h-6 w-6 mr-2" />
          Get Tickets — From ${lowestPrice.toFixed(0)}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto p-0">
        {/* Event Header Banner */}
        <div className="relative overflow-hidden rounded-t-lg bg-gradient-to-br from-pink-600 via-violet-600 to-purple-700 p-6 pb-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <DialogHeader>
            <DialogTitle className="text-left">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="p-1.5 rounded-lg bg-white/20">
                    <Ticket className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white/70 uppercase tracking-widest">
                    Get Tickets
                  </span>
                </div>
                <span className="text-xl font-bold text-white leading-tight">
                  {eventName}
                </span>
                <div className="flex flex-wrap gap-3 mt-2">
                  {eventDate && (
                    <div className="flex items-center gap-1.5 text-white/80 text-sm">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{eventDate}</span>
                    </div>
                  )}
                  {eventLocation && (
                    <div className="flex items-center gap-1.5 text-white/80 text-sm">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{eventLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          {/* Tier Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Select Ticket Type</Label>
            {tiers.map((tier) => (
              <button
                key={tier.id}
                onClick={() => {
                  if (!tier.isSoldOut && tier.isSaleActive) {
                    setSelectedTier(tier);
                    setQuantity(1);
                    setError(null);
                  }
                }}
                disabled={tier.isSoldOut || !tier.isSaleActive}
                className={cn(
                  "w-full p-4 rounded-xl border-2 text-left transition-all relative",
                  selectedTier?.id === tier.id
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-border hover:border-pink-500/50",
                  (tier.isSoldOut || !tier.isSaleActive) &&
                    "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="pr-8">
                    <p className="font-semibold">{tier.name}</p>
                    {tier.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {tier.description}
                      </p>
                    )}
                    {tier.isSoldOut ? (
                      <p className="text-xs text-red-500 font-medium mt-1">Sold Out</p>
                    ) : !tier.isSaleActive ? (
                      <p className="text-xs text-muted-foreground mt-1">Sale not active</p>
                    ) : tier.available !== null ? (
                      <p className="text-xs text-amber-500 font-medium mt-1">
                        {tier.available} left
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-bold">
                      ${(tier.price_cents / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">per ticket</p>
                  </div>
                </div>
                {selectedTier?.id === tier.id && (
                  <CheckCircle className="absolute top-3.5 right-3.5 h-5 w-5 text-pink-500" />
                )}
              </button>
            ))}
          </div>

          {/* Quantity Selector */}
          {selectedTier && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Quantity</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10 rounded-xl"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center tabular-nums">
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
                  className="h-10 w-10 rounded-xl"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Buyer Info */}
          {selectedTier && (
            <div className="space-y-3">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
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

          {/* Order Summary */}
          {selectedTier && (
            <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Order Summary</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {selectedTier.name} × {quantity}
                </span>
                <span>${(selectedTier.price_cents / 100 * quantity).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 mt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Checkout Button */}
          <Button
            onClick={handleCheckout}
            disabled={!selectedTier || isLoading}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 py-6 text-base font-semibold rounded-xl"
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
                  ? `Buy ${quantity} Ticket${quantity > 1 ? "s" : ""} — $${totalPrice.toFixed(2)}`
                  : "Select a Ticket"}
              </>
            )}
          </Button>

          {/* Affiliate Message */}
          {referringModelName && (
            <p className="text-xs text-center text-muted-foreground">
              ✨ Your purchase supports {referringModelName}!
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
