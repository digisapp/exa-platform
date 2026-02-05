"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Crown,
  Coins,
  Calendar,
  CreditCard,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Receipt,
} from "lucide-react";
import { BRAND_SUBSCRIPTION_TIERS, BrandTier } from "@/lib/stripe-config";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

interface BrandData {
  subscription_tier: string;
  subscription_status: string;
  billing_cycle: string;
  coin_balance: number;
  coins_granted_at: string | null;
  subscription_ends_at: string | null;
  stripe_subscription_id: string | null;
}

export default function BrandSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<BrandData | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadBrand() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: actor } = await supabase
        .from("actors")
        .select("id, type")
        .eq("user_id", user.id)
        .single() as { data: { id: string; type: string } | null };

      if (!actor || actor.type !== "brand") return;

      const { data: brandData } = await (supabase
        .from("brands") as any)
        .select("subscription_tier, subscription_status, billing_cycle, coin_balance, coins_granted_at, subscription_ends_at, stripe_subscription_id")
        .eq("id", actor.id)
        .single();

      setBrand(brandData);
      setLoading(false);
    }

    loadBrand();
  }, [supabase]);

  const handleUpgrade = async (tier: BrandTier) => {
    if (tier === "free" || tier === brand?.subscription_tier) return;

    setUpgrading(tier);
    try {
      const response = await fetch("/api/brands/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingCycle: brand?.billing_cycle || "monthly"
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
      }
    } catch {
      toast.error("Failed to start checkout");
    } finally {
      setUpgrading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const response = await fetch("/api/brands/cancel-subscription", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Subscription cancelled. Your coins have been preserved.");
        setShowCancelDialog(false);
        // Reload brand data
        window.location.reload();
      } else {
        toast.error(data.error || "Failed to cancel subscription");
      }
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setCancelling(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/brands/billing-portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const currentTier = brand?.subscription_tier || "free";
  const currentTierConfig = BRAND_SUBSCRIPTION_TIERS[currentTier as BrandTier];
  const isActive = brand?.subscription_status === "active";
  const isPaused = brand?.subscription_status === "paused";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted-foreground">Manage your plan and billing</p>
      </div>

      {/* Current Plan Card */}
      <Card className={cn(
        "border-2",
        isActive && "border-cyan-500/50 bg-gradient-to-br from-cyan-500/5 to-blue-500/5",
        isPaused && "border-yellow-500/50 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"
      )}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-3 rounded-full",
                isActive ? "bg-cyan-500/10" : "bg-yellow-500/10"
              )}>
                <Crown className={cn(
                  "h-6 w-6",
                  isActive ? "text-cyan-500" : "text-yellow-500"
                )} />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {currentTierConfig?.name || "Free"} Plan
                </CardTitle>
                <CardDescription>
                  {isActive ? "Active subscription" : isPaused ? "Subscription paused" : "No active subscription"}
                </CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-sm px-3 py-1",
                isActive && "bg-green-500/10 text-green-500 border-green-500/50",
                isPaused && "bg-yellow-500/10 text-yellow-500 border-yellow-500/50",
                !isActive && !isPaused && "bg-gray-500/10 text-gray-500 border-gray-500/50"
              )}
            >
              {brand?.subscription_status || "inactive"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Plan Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                <span className="text-sm">Coin Balance</span>
              </div>
              <p className="text-2xl font-bold">{brand?.coin_balance?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Coins className="h-4 w-4" />
                <span className="text-sm">Monthly Coins</span>
              </div>
              <p className="text-2xl font-bold">{currentTierConfig?.monthlyCoins?.toLocaleString() || 0}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">Billing</span>
              </div>
              <p className="text-2xl font-bold capitalize">{brand?.billing_cycle || "—"}</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">Last Coins</span>
              </div>
              <p className="text-lg font-bold">
                {brand?.coins_granted_at
                  ? new Date(brand.coins_granted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—"}
              </p>
            </div>
          </div>

          {/* Paused Notice */}
          {isPaused && (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-500">Subscription Paused</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your subscription is currently paused. Your coins are safely preserved.
                  Resubscribe to regain full access and continue receiving monthly coins.
                </p>
              </div>
            </div>
          )}

          {/* Features */}
          {currentTierConfig && currentTierConfig.features.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-3">Plan Features</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {currentTierConfig.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
          {isActive && brand?.stripe_subscription_id && (
            <>
              <Button variant="outline" onClick={handleManageBilling}>
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing
              </Button>
              <Button
                variant="outline"
                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={() => setShowCancelDialog(true)}
              >
                Cancel Subscription
              </Button>
            </>
          )}
          <Link href="/wallet">
            <Button variant="outline">
              <Receipt className="h-4 w-4 mr-2" />
              Payment History
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Upgrade Options */}
      {(currentTier === "free" || currentTier === "discovery" || currentTier === "starter" || currentTier === "pro" || isPaused) && (
        <Card>
          <CardHeader>
            <CardTitle>{isPaused ? "Resubscribe" : "Upgrade Your Plan"}</CardTitle>
            <CardDescription>
              {isPaused
                ? "Reactivate your subscription to continue using all features"
                : "Access 5,000+ curated models with direct messaging and calling"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(BRAND_SUBSCRIPTION_TIERS)
                .filter(([key]) => key !== "free")
                .map(([key, tier]) => {
                  const isCurrentPlan = key === currentTier && isActive;
                  const tierOrder = ["discovery", "starter", "pro", "enterprise"];
                  const currentIndex = tierOrder.indexOf(currentTier);
                  const tierIndex = tierOrder.indexOf(key);
                  const isDowngrade = !isPaused && currentIndex > tierIndex && currentIndex !== -1;
                  const isPopular = "popular" in tier && tier.popular;

                  return (
                    <div
                      key={key}
                      className={cn(
                        "p-4 rounded-xl border-2 transition-all relative",
                        isCurrentPlan && "border-cyan-500 bg-cyan-500/5",
                        isPopular && !isCurrentPlan && "border-violet-500 bg-violet-500/5",
                        !isCurrentPlan && !isPopular && !isDowngrade && "border-border hover:border-cyan-500/50",
                        isDowngrade && "border-border opacity-50"
                      )}
                    >
                      {isPopular && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-violet-500">Most Popular</Badge>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">{tier.name}</h3>
                        {isCurrentPlan && (
                          <Badge className="bg-cyan-500">Current</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-1">
                        ${(tier.monthlyPrice / 100).toLocaleString()}
                        <span className="text-sm font-normal text-muted-foreground">/mo</span>
                      </p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {tier.monthlyCoins > 0
                          ? `${tier.monthlyCoins.toLocaleString()} coins/month`
                          : "No messaging/calling"
                        }
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 mb-4">
                        {tier.features.slice(0, 3).map((feature, i) => (
                          <li key={i} className="flex items-start gap-1">
                            <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        className={cn(
                          "w-full",
                          isPopular && !isCurrentPlan && !isDowngrade && "bg-gradient-to-r from-violet-500 to-pink-500",
                          !isPopular && !isCurrentPlan && !isDowngrade && "bg-gradient-to-r from-cyan-500 to-blue-500"
                        )}
                        variant={isCurrentPlan || isDowngrade ? "outline" : "default"}
                        disabled={isCurrentPlan || isDowngrade || upgrading !== null}
                        onClick={() => handleUpgrade(key as BrandTier)}
                      >
                        {upgrading === key ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : isCurrentPlan ? (
                          "Current Plan"
                        ) : isDowngrade ? (
                          "Contact Support"
                        ) : isPaused ? (
                          <>
                            Resubscribe
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          <>
                            {currentIndex === -1 || tierIndex > currentIndex ? "Subscribe" : "Upgrade"}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription?</DialogTitle>
            <DialogDescription>
              Your subscription will be cancelled at the end of the current billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Your coins will be preserved</span>
              </div>
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">You can resubscribe anytime</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">You won&apos;t receive monthly coins</span>
              </div>
              <div className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Access will be limited until you resubscribe</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel Subscription"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
