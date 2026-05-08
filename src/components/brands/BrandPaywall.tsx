"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Lock, Coins, Users, MessageCircle, Calendar, Check, Sparkles } from "lucide-react";
import { BRAND_SUBSCRIPTION_TIERS } from "@/lib/stripe-config";

interface BrandPaywallProps {
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: "browse" | "message" | "booking";
}

const formatPrice = (cents: number) =>
  `$${Math.round(cents / 100).toLocaleString()}`;

const STARTER = BRAND_SUBSCRIPTION_TIERS.starter;
const PRO = BRAND_SUBSCRIPTION_TIERS.pro;
const ENTERPRISE = BRAND_SUBSCRIPTION_TIERS.enterprise;
const DISCOVERY = BRAND_SUBSCRIPTION_TIERS.discovery;

export function BrandPaywall({ isOpen = true, onClose, trigger = "browse" }: BrandPaywallProps) {
  const [open, setOpen] = useState(isOpen);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  const getMessage = () => {
    switch (trigger) {
      case "message":
        return "Subscribe to message models directly";
      case "booking":
        return "Subscribe to send booking requests";
      default:
        return "Subscribe to access our model network";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-cyan-500" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Unlock Full Access
          </DialogTitle>
          <DialogDescription className="text-center">
            {getMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-cyan-500" />
              <div>
                <p className="font-medium text-sm">1,000+ Models</p>
                <p className="text-xs text-muted-foreground">Full profiles access</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MessageCircle className="h-5 w-5 text-pink-500" />
              <div>
                <p className="font-medium text-sm">Direct Messaging</p>
                <p className="text-xs text-muted-foreground">Contact any model</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Easy Booking</p>
                <p className="text-xs text-muted-foreground">Schedule with ease</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Coins className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-sm">Monthly Coins</p>
                <p className="text-xs text-muted-foreground">Included in plans</p>
              </div>
            </div>
          </div>

          {/* Quick Plan Comparison */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border hover:border-cyan-500/50 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{STARTER.name}</p>
                  <Badge variant="secondary" className="text-xs">{STARTER.monthlyCoins.toLocaleString()} coins/mo</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Direct messaging with models</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatPrice(STARTER.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border-2 border-cyan-500 bg-cyan-500/5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-500" />
                  <p className="font-semibold">{PRO.name}</p>
                  <Badge className="bg-cyan-500 text-xs">Popular</Badge>
                  <Badge variant="secondary" className="text-xs">{PRO.monthlyCoins.toLocaleString()} coins/mo</Badge>
                </div>
                <p className="text-sm text-muted-foreground">+ Calling, verified badge & bulk tools</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg text-cyan-500">{formatPrice(PRO.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border hover:border-cyan-500/50 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{ENTERPRISE.name}</p>
                  <Badge variant="secondary" className="text-xs">{ENTERPRISE.monthlyCoins.toLocaleString()} coins/mo</Badge>
                </div>
                <p className="text-sm text-muted-foreground">+ Unlimited lists & dedicated account manager</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatPrice(ENTERPRISE.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3">
            <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 h-12">
              <Link href="/brands/pricing">
                View All Plans
              </Link>
            </Button>
            <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Cancel anytime. All plans include monthly coin allowance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Blurred overlay for models page
export function BrandPaywallOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-cyan-500" />
          </div>
          <CardTitle className="text-2xl">Unlock Model Access</CardTitle>
          <CardDescription>
            Subscribe to browse and connect with professional models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Access 1,000+ professional models</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Direct messaging with models</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Send booking requests</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Monthly coins included</span>
            </li>
          </ul>

          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Starting at</p>
            <p className="text-3xl font-bold">{formatPrice(DISCOVERY.monthlyPrice)}<span className="text-sm font-normal text-muted-foreground">/month</span></p>
          </div>

          <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 h-12">
            <Link href="/brands/pricing">
              <Sparkles className="mr-2 h-4 w-4" />
              View Plans
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
