"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Check, X, Coins, Crown, Sparkles, Building2 } from "lucide-react";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";

export default function BrandPricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSubscribe = async (tier: BrandTier) => {
    if (tier === "free") return;

    setLoading(tier);
    try {
      const response = await fetch("/api/brands/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingCycle: isAnnual ? "annual" : "monthly"
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data.error);
        alert(data.error || "Failed to start checkout. Please try again.");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Failed to start checkout. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString()}`;
  };

  const tiers = Object.entries(BRAND_SUBSCRIPTION_TIERS).filter(([key]) => key !== "free") as [BrandTier, typeof BRAND_SUBSCRIPTION_TIERS[BrandTier]][];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 mb-4">
          <Building2 className="h-8 w-8 text-cyan-500" />
        </div>
        <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Get access to our network of professional models. All plans include monthly coins for bookings.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Label htmlFor="billing-toggle" className={cn(!isAnnual && "text-foreground font-medium")}>
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle" className={cn(isAnnual && "text-foreground font-medium")}>
            Annual
            <Badge variant="secondary" className="ml-2 bg-green-500/20 text-green-500">
              Save 17%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {tiers.map(([key, tier]) => {
          const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
          const monthlyEquivalent = isAnnual ? Math.round(tier.annualPrice / 12) : tier.monthlyPrice;
          const isPopular = 'popular' in tier && tier.popular;

          return (
            <Card
              key={key}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                isPopular && "border-cyan-500 ring-2 ring-cyan-500/20"
              )}
            >
              {isPopular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-center text-sm py-1 font-medium">
                  Most Popular
                </div>
              )}

              <CardHeader className={cn(isPopular && "pt-10")}>
                <div className="flex items-center gap-2 mb-2">
                  {key === "starter" && <Coins className="h-5 w-5 text-cyan-500" />}
                  {key === "pro" && <Sparkles className="h-5 w-5 text-cyan-500" />}
                  {key === "enterprise" && <Crown className="h-5 w-5 text-cyan-500" />}
                  <CardTitle>{tier.name}</CardTitle>
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{formatPrice(monthlyEquivalent)}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(price)} billed annually
                    </p>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium text-foreground">{tier.monthlyCoins.toLocaleString()}</span>
                  <span>coins/month included</span>
                </CardDescription>
              </CardHeader>

              <CardContent>
                <ul className="space-y-3">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading !== null}
                  className={cn(
                    "w-full",
                    isPopular
                      ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
                      : ""
                  )}
                  variant={isPopular ? "default" : "outline"}
                >
                  {loading === key ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Free Tier Info */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold mb-1">Free Account</h3>
              <p className="text-sm text-muted-foreground">
                Browse models with limited preview. Upgrade to contact models and send booking requests.
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <X className="h-4 w-4 text-red-500" />
                No messaging
              </span>
              <span className="flex items-center gap-1">
                <X className="h-4 w-4 text-red-500" />
                No bookings
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <div className="mt-12 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-center mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <h3 className="font-medium mb-1">What are coins used for?</h3>
            <p className="text-sm text-muted-foreground">
              Coins are used to book models for events, photoshoots, and other services. Each model sets their own rates in coins.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <h3 className="font-medium mb-1">What happens if I run out of coins?</h3>
            <p className="text-sm text-muted-foreground">
              You can purchase additional coins at any time. Your monthly coin allowance resets with each billing cycle.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <h3 className="font-medium mb-1">Can I cancel my subscription?</h3>
            <p className="text-sm text-muted-foreground">
              Yes, you can cancel anytime. You&apos;ll retain access until the end of your billing period.
            </p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Questions? Contact us at{" "}
          <a href="mailto:brands@examodels.com" className="text-cyan-500 hover:underline">
            brands@examodels.com
          </a>
        </p>
      </div>
    </div>
  );
}
