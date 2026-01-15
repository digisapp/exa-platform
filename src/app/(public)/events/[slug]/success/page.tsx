"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle2,
  Ticket,
  Mail,
  Loader2,
  ArrowLeft,
  Calendar,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function TicketSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

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

    // Simulate verification
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
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
              {loading ? "Processing..." : "Tickets Purchased!"}
            </CardTitle>
            <CardDescription className="text-base">
              {loading
                ? "Please wait while we confirm your purchase..."
                : "Your tickets have been confirmed."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!loading && (
              <>
                {/* Animated ticket icon */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-xl opacity-50 animate-pulse" />
                    <div className="relative p-6 rounded-full bg-gradient-to-r from-pink-500 to-violet-500">
                      <Ticket className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>

                {/* Confirmation message */}
                <div className="space-y-4 pt-4">
                  <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-5 w-5 text-pink-500 flex-shrink-0" />
                      <span>
                        Confirmation email with your tickets has been sent
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="h-5 w-5 text-violet-500 flex-shrink-0" />
                      <span>Add the event to your calendar from the email</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Check your inbox (and spam folder) for your ticket
                    confirmation.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-4">
                  <Button
                    variant="outline"
                    asChild
                  >
                    <Link href="../">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Event
                    </Link>
                  </Button>
                  <Button
                    asChild
                    className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                  >
                    <Link href="/models">Discover Models</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
