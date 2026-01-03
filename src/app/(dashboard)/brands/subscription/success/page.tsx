"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, Coins, Users, MessageCircle } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Give the webhook time to process
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-cyan-500" />
          <p className="text-muted-foreground">Processing your subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Welcome to EXA!</CardTitle>
          <CardDescription>
            Your subscription is now active. You have full access to our model network.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="text-center">
              <Coins className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-sm font-medium">Coins Added</p>
              <p className="text-xs text-muted-foreground">Check your balance</p>
            </div>
            <div className="text-center">
              <Users className="h-6 w-6 mx-auto mb-2 text-cyan-500" />
              <p className="text-sm font-medium">Browse Models</p>
              <p className="text-xs text-muted-foreground">Full access</p>
            </div>
            <div className="text-center">
              <MessageCircle className="h-6 w-6 mx-auto mb-2 text-pink-500" />
              <p className="text-sm font-medium">Message Models</p>
              <p className="text-xs text-muted-foreground">Unlocked</p>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full bg-gradient-to-r from-cyan-500 to-blue-500">
            <Link href="/models">
              <Users className="mr-2 h-4 w-4" />
              Browse Models
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
