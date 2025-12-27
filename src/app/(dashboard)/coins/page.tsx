"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Sparkles, Loader2, Check, Zap, Crown, Star } from "lucide-react";
import { COIN_PACKAGES } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

export default function BuyCoinsPage() {
  const [loading, setLoading] = useState<number | null>(null);

  const handlePurchase = async (coins: number) => {
    setLoading(coins);
    try {
      const response = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coins }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        alert("Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const getPackageIcon = (index: number) => {
    switch (index) {
      case 0: return <Coins className="h-5 w-5" />;
      case 1: return <Star className="h-5 w-5" />;
      case 2: return <Sparkles className="h-5 w-5" />;
      case 3: return <Zap className="h-5 w-5" />;
      case 4: return <Crown className="h-5 w-5" />;
      default: return <Crown className="h-5 w-5" />;
    }
  };

  const getPackageLabel = (index: number) => {
    switch (index) {
      case 0: return "Starter";
      case 1: return "Basic";
      case 2: return "Popular";
      case 3: return "Pro";
      case 4: return "Super";
      case 5: return "Elite";
      case 6: return "Ultimate";
      default: return "";
    }
  };

  const getBadgeVariant = (index: number): "default" | "secondary" | "destructive" | "outline" => {
    if (index === 2) return "default"; // Popular
    return "secondary";
  };

  const calculatePerCoin = (price: number, coins: number) => {
    return ((price / 100) / coins).toFixed(2);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 mb-4">
          <Coins className="h-8 w-8 text-pink-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Get EXA Coins</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Use coins to message models, unlock exclusive content, and connect with talent on EXA.
        </p>
      </div>

      {/* Coin Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {COIN_PACKAGES.map((pack, index) => {
          const isPopular = index === 2;
          const isBestValue = index === COIN_PACKAGES.length - 1;

          return (
            <Card
              key={pack.coins}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                isPopular && "border-pink-500 ring-2 ring-pink-500/20",
                isBestValue && "border-violet-500 ring-2 ring-violet-500/20"
              )}
            >
              {/* Badge */}
              {(isPopular || isBestValue) && (
                <div className="absolute top-3 right-3">
                  <Badge variant={isPopular ? "default" : "secondary"} className={cn(
                    isPopular && "bg-gradient-to-r from-pink-500 to-violet-500",
                    isBestValue && "bg-gradient-to-r from-violet-500 to-purple-500"
                  )}>
                    {isPopular ? "Most Popular" : "Best Value"}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  {getPackageIcon(index)}
                  <span className="text-sm font-medium">{getPackageLabel(index)}</span>
                </div>
                <CardTitle className="text-3xl font-bold">
                  {pack.coins.toLocaleString()}
                  <span className="text-lg font-normal text-muted-foreground ml-1">coins</span>
                </CardTitle>
                <CardDescription>
                  ${calculatePerCoin(pack.price, pack.coins)} per coin
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="mb-4">
                  <span className="text-2xl font-bold">{pack.priceDisplay}</span>
                </div>

                <Button
                  onClick={() => handlePurchase(pack.coins)}
                  disabled={loading !== null}
                  className={cn(
                    "w-full",
                    isPopular && "bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                  )}
                >
                  {loading === pack.coins ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Coins className="mr-2 h-4 w-4" />
                      Buy Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Features */}
      <Card className="bg-gradient-to-r from-pink-500/5 to-violet-500/5 border-pink-500/20">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-pink-500/10">
                <Check className="h-4 w-4 text-pink-500" />
              </div>
              <div>
                <h3 className="font-medium">Secure Payments</h3>
                <p className="text-sm text-muted-foreground">
                  All transactions secured by Stripe
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-violet-500/10">
                <Check className="h-4 w-4 text-violet-500" />
              </div>
              <div>
                <h3 className="font-medium">Instant Delivery</h3>
                <p className="text-sm text-muted-foreground">
                  Coins added to your account immediately
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-purple-500/10">
                <Check className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <h3 className="font-medium">No Expiration</h3>
                <p className="text-sm text-muted-foreground">
                  Your coins never expire
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Questions? Contact us at{" "}
          <a href="mailto:support@examodels.com" className="text-pink-500 hover:underline">
            support@examodels.com
          </a>
        </p>
      </div>
    </div>
  );
}
