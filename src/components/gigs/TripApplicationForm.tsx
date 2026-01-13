"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Loader2,
  Calendar,
  CreditCard,
  Sparkles,
  Instagram,
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
  const [spotType, setSpotType] = useState<"paid" | "sponsored">("paid");
  const [loading, setLoading] = useState(false);

  // Sponsorship form fields
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramFollowers, setInstagramFollowers] = useState("");
  const [digisUsername, setDigisUsername] = useState("");
  const [pitch, setPitch] = useState("");

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

  const handleSponsorshipApplication = async () => {
    if (!modelId) {
      toast.error("Please sign in to continue");
      return;
    }

    // Validate fields
    if (!instagramHandle) {
      toast.error("Please enter your Instagram handle");
      return;
    }

    const followers = parseInt(instagramFollowers);
    if (!followers || followers < 20000) {
      toast.error("Sponsored spots require 20,000+ Instagram followers");
      return;
    }

    if (!digisUsername) {
      toast.error("Please enter your Digis.cc username");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/trips/apply-sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gigId,
          modelId,
          tripNumber: parseInt(tripNumber),
          instagramHandle,
          instagramFollowers: followers,
          digisUsername,
          pitch,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to submit application");
        return;
      }

      toast.success("Application submitted! We'll review it and get back to you.");
      // Refresh page to show application status
      window.location.reload();
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application");
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
          Select your preferred dates and spot type
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
                <p className="text-sm text-muted-foreground">January 28 - February 1, 2025</p>
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
                <p className="text-sm text-muted-foreground">February 4 - February 8, 2025</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Spot Type Selection */}
        <div className="space-y-3">
          <Label>Select Your Spot Type</Label>
          <RadioGroup
            value={spotType}
            onValueChange={(v: string) => setSpotType(v as "paid" | "sponsored")}
            className="grid grid-cols-1 gap-3"
          >
            <label
              htmlFor="spot-paid"
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                spotType === "paid"
                  ? "border-green-500 bg-green-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="paid" id="spot-paid" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Paid Spot
                  </p>
                  <Badge className="bg-green-500">$1,400</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your own bed • Instant confirmation
                </p>
              </div>
            </label>
            <label
              htmlFor="spot-sponsored"
              className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                spotType === "sponsored"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <RadioGroupItem value="sponsored" id="spot-sponsored" className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Digis Sponsored
                  </p>
                  <Badge className="bg-violet-500">FREE</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Shared room • Requires 20K+ followers • Limited spots
                </p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {/* Conditional Content Based on Spot Type */}
        {spotType === "paid" ? (
          <div className="space-y-4">
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
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Sponsorship Requirements
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 20,000+ Instagram followers</li>
                <li>• Active Digis.cc account</li>
                <li>• Commit to creating content on Digis</li>
              </ul>
            </div>

            {/* Sponsorship Application Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <Instagram className="h-4 w-4" />
                  Instagram Handle
                </Label>
                <Input
                  id="instagram"
                  placeholder="@yourusername"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace("@", ""))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followers">Instagram Followers</Label>
                <Input
                  id="followers"
                  type="number"
                  placeholder="e.g., 25000"
                  value={instagramFollowers}
                  onChange={(e) => setInstagramFollowers(e.target.value)}
                />
                {parseInt(instagramFollowers) > 0 && parseInt(instagramFollowers) < 20000 && (
                  <p className="text-xs text-red-500">
                    Minimum 20,000 followers required for sponsored spots
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="digis">Digis.cc Username</Label>
                <Input
                  id="digis"
                  placeholder="Your Digis username"
                  value={digisUsername}
                  onChange={(e) => setDigisUsername(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <a
                    href="https://digis.cc"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-500 hover:underline"
                  >
                    Create one at Digis.cc
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pitch">Why Should We Sponsor You? (Optional)</Label>
                <Textarea
                  id="pitch"
                  placeholder="Tell us about your content style, audience, and why you'd be great for this trip..."
                  value={pitch}
                  onChange={(e) => setPitch(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={handleSponsorshipApplication}
              disabled={loading || !instagramHandle || !digisUsername || parseInt(instagramFollowers) < 20000}
              className="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Apply for Sponsored Spot
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ~2 sponsored spots per trip • Admin approval required
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
