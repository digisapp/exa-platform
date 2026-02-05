"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, Waves, Calendar, Camera, ArrowRight } from "lucide-react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay for a better UX
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Processing your payment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="flex justify-center mb-4">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={100}
              height={40}
              className="h-10 w-auto"
            />
          </Link>

          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs mx-auto mb-2">
            <Waves className="h-3 w-3" />
            <span>Swimwear Content Program</span>
          </div>

          <CardTitle className="text-2xl">Welcome to the Program!</CardTitle>
          <CardDescription>
            Your payment was successful. We&apos;re excited to work with you!
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="bg-gradient-to-r from-cyan-500/10 via-pink-500/10 to-violet-500/10 rounded-xl p-4 border border-pink-500/20">
            <h3 className="font-semibold mb-3 text-center">What happens next?</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-pink-500/10 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-pink-500" />
                </div>
                <span className="text-muted-foreground">
                  Our team will contact you within 24 hours to schedule your first shoot
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-violet-500/10 mt-0.5">
                  <Camera className="h-3.5 w-3.5 text-violet-500" />
                </div>
                <span className="text-muted-foreground">
                  Ship your collection to our Miami studio (address will be emailed)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-cyan-500/10 mt-0.5">
                  <Waves className="h-3.5 w-3.5 text-cyan-500" />
                </div>
                <span className="text-muted-foreground">
                  Your $1,500 credits toward Miami Swim Week ($3,000 package)
                </span>
              </li>
            </ul>
          </div>

          <div className="text-center p-4 rounded-lg bg-white/5 border border-white/10">
            <p className="text-2xl font-bold bg-gradient-to-r from-pink-400 to-violet-400 text-transparent bg-clip-text">
              $1,500 Paid
            </p>
            <p className="text-sm text-muted-foreground">
              3-month program • 10 videos + 50 photos/month
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full bg-gradient-to-r from-cyan-500 via-pink-500 to-violet-500 hover:from-cyan-600 hover:via-pink-600 hover:to-violet-600">
            <Link href="/models">
              Browse Our Models
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to Home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ContentProgramSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
