"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Users, MessageCircle, Phone, Check, Sparkles } from "lucide-react";

const MIN_COINS_REQUIRED = 50;

interface FanCoinGateProps {
  currentBalance?: number;
}

export function FanCoinGate({ currentBalance = 0 }: FanCoinGateProps) {
  const coinsNeeded = MIN_COINS_REQUIRED - currentBalance;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-pink-500/20 to-violet-500/20 flex items-center justify-center mb-4">
            <Coins className="h-8 w-8 text-pink-500" />
          </div>
          <CardTitle className="text-2xl">Unlock Model Directory</CardTitle>
          <CardDescription>
            Get {MIN_COINS_REQUIRED} coins to browse and connect with models
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentBalance > 0 && (
            <div className="text-center p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">Your balance</p>
              <p className="text-xl font-bold">{currentBalance} coins</p>
              <p className="text-xs text-muted-foreground mt-1">
                Need {coinsNeeded} more to unlock
              </p>
            </div>
          )}

          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Browse 5,000+ models & influencers</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">View full profiles & portfolios</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Message your favorite models</span>
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-sm">Video call with models</span>
            </li>
          </ul>

          <div className="text-center p-4 rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20">
            <p className="text-sm text-muted-foreground mb-1">Starting at</p>
            <p className="text-3xl font-bold">$9.99</p>
            <p className="text-xs text-muted-foreground mt-1">for 50 coins</p>
          </div>

          <Button asChild className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 h-12">
            <Link href="/coins">
              <Sparkles className="mr-2 h-4 w-4" />
              Get Coins
            </Link>
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Coins are used to message and call models. No subscription required.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function FanCoinGateWrapper({ currentBalance }: FanCoinGateProps) {
  return <FanCoinGate currentBalance={currentBalance} />;
}
