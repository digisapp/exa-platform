"use client";

import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  Loader2,
  Printer,
  MapPin,
  Clock,
  ArrowRight,
} from "lucide-react";

function SuccessContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
          </div>
          <CardTitle className="text-2xl">Order Confirmed!</CardTitle>
          <CardDescription>
            Your comp cards are being prepared for printing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl p-4 border space-y-3">
            <h3 className="font-semibold text-center">What happens next?</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Printer className="h-4 w-4 text-pink-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  We&apos;ll print your comp cards on premium 19pt cardstock
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  Cards are typically ready within 24 hours
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-cyan-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">
                  Pick up at EXA Studio, Miami. We&apos;ll email you when
                  they&apos;re ready!
                </span>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            <Link href="/free-comp-card">
              Make Another Comp Card
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function PrintSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
