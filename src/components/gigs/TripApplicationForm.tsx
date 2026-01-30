"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  CreditCard,
  CheckCircle,
  Plane,
} from "lucide-react";

interface TripApplicationFormProps {
  gigId: string;
  gigSlug: string;
  modelId: string | null;
  isLoggedIn: boolean;
}

export function TripApplicationForm({
  gigId,
  gigSlug,
  modelId,
  isLoggedIn,
}: TripApplicationFormProps) {
  const [tripNumber, setTripNumber] = useState<"1" | "2">("1");
  const [loading, setLoading] = useState(false);

  const handlePaidCheckout = async () => {
    if (!modelId) {
      toast.error("Please sign in to continue");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/trips/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId,
          modelId,
          tripNumber: parseInt(tripNumber),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to create checkout session");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Plane className="h-12 w-12 mx-auto text-pink-500" />
            <p className="text-muted-foreground">Sign in to apply for this trip</p>
            <Button asChild className="w-full">
              <a href={`/signin?redirect=/gigs/${gigSlug}`}>Sign In</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-5 w-5 text-pink-500" />
          Apply for This Trip
        </CardTitle>
        <CardDescription>
          Select your preferred dates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trip Date Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Select Your Trip Dates
          </Label>
          <RadioGroup
            value={tripNumber}
            onValueChange={(v: string) => setTripNumber(v as "1" | "2")}
            className="grid grid-cols-1 gap-3"
          >
            <label
              htmlFor="trip-1"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                tripNumber === "1"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="1" id="trip-1" />
              <div>
                <p className="font-medium">Trip 1</p>
                <p className="text-sm text-muted-foreground">February 19 - February 23, 2026</p>
              </div>
            </label>
            <label
              htmlFor="trip-2"
              className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                tripNumber === "2"
                  ? "border-pink-500 bg-pink-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="2" id="trip-2" />
              <div>
                <p className="font-medium">Trip 2</p>
                <p className="text-sm text-muted-foreground">February 26 - March 2, 2026</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* What's Included */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Trip Cost
            </p>
            <Badge className="bg-green-500">$1,400</Badge>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <h4 className="font-medium mb-2">What&apos;s Included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Your own bed in the villa
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                3 meals per day
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Designer swimwear photoshoots
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Runway workshop & yoga sessions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Airport transportation
              </li>
            </ul>
            <p className="text-xs text-muted-foreground mt-3">
              * Airfare not included - you book your own flight to Santo Domingo (SDQ)
            </p>
          </div>
          <Button
            onClick={handlePaidCheckout}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            size="lg"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <CreditCard className="h-4 w-4 mr-2" />
            )}
            Pay $1,400 & Secure Your Spot
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
