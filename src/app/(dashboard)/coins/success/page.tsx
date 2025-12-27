"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Coins, MessageCircle, Loader2, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

export default function CoinSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Trigger confetti on mount
    const duration = 2000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#ec4899", "#8b5cf6", "#d946ef"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#ec4899", "#8b5cf6", "#d946ef"],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();

    // Simulate verification (in production, you'd verify the session)
    const timer = setTimeout(() => {
      setVerified(true);
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="max-w-lg mx-auto py-12">
      <Card className="text-center">
        <CardHeader className="pb-4">
          {loading ? (
            <div className="mx-auto p-4 rounded-full bg-muted mb-4">
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
            </div>
          ) : (
            <div className="mx-auto p-4 rounded-full bg-green-500/10 mb-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {loading ? "Processing..." : "Payment Successful!"}
          </CardTitle>
          <CardDescription className="text-base">
            {loading
              ? "Please wait while we verify your payment..."
              : "Your coins have been added to your account."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!loading && (
            <>
              {/* Animated coin icon */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-xl opacity-50 animate-pulse" />
                  <div className="relative p-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500">
                    <Coins className="h-10 w-10 text-white" />
                  </div>
                </div>
              </div>

              {/* What to do next */}
              <div className="space-y-3 pt-4">
                <p className="text-sm text-muted-foreground">
                  You can now use your coins to:
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <MessageCircle className="h-4 w-4 text-pink-500" />
                    <span>Message models directly</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                  <Link href="/messages">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start Messaging
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/models">
                    Browse Models
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
