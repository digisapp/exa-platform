"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  AlertCircle,
  CreditCard,
  CalendarClock,
  Send,
} from "lucide-react";

const COHORT_OPTIONS = [
  { value: "miami-swim-week", label: "Miami Swim Week — March to May" },
  { value: "nyfw", label: "New York Fashion Week — June to August" },
  { value: "art-basel", label: "Art Basel — September to November" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner — new to professional makeup" },
  { value: "intermediate", label: "Intermediate — some experience" },
  { value: "advanced", label: "Advanced — trained but no runway experience" },
  { value: "professional", label: "Professional — working makeup artist" },
];

export function AcademyApplicationForm() {
  const [step, setStep] = useState<"apply" | "payment">("apply");

  // Application fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagram, setInstagram] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cohort, setCohort] = useState("");
  const [experience, setExperience] = useState("");
  const [motivation, setMotivation] = useState("");

  // Payment
  const [paymentType, setPaymentType] = useState<"full" | "installment">("full");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPrice = 199500; // $1,995
  const installmentAmount = 49900; // $499 per installment
  const installmentTotal = 199600; // $499 x 4

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Please enter your full name"); return; }
    if (!email || !email.includes("@")) { setError("Please enter a valid email address"); return; }
    if (!cohort) { setError("Please select a cohort"); return; }
    if (!experience) { setError("Please select your experience level"); return; }

    setIsLoading(true);

    try {
      const response = await fetch("/api/academy/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          instagram: instagram.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          cohort,
          experienceLevel: experience,
          motivation: motivation.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit application");

      // Move to payment step
      setStep("payment");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/academy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          phone: phone.trim() || null,
          cohort,
          paymentType,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create checkout");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  if (step === "payment") {
    return (
      <Card className="border-pink-500/30">
        <CardHeader className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-t-xl">
          <CardTitle className="text-center">
            <span className="text-pink-500">Complete Your Enrollment</span>
          </CardTitle>
          <p className="text-sm text-center text-muted-foreground">
            Application received! Choose your payment option to secure your spot.
          </p>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          {/* Payment Type Toggle */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Payment Option</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentType("full")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentType === "full"
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
              >
                <div className="font-semibold text-sm">Pay in Full</div>
                <div className="text-2xl font-bold text-pink-500 mt-1">$1,995</div>
                <div className="text-xs text-muted-foreground mt-1">One-time payment</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("installment")}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  paymentType === "installment"
                    ? "border-pink-500 bg-pink-500/10"
                    : "border-muted hover:border-muted-foreground/50"
                }`}
              >
                <div className="font-semibold text-sm flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Payment Plan
                </div>
                <div className="text-2xl font-bold text-pink-500 mt-1">4 x $499</div>
                <div className="text-xs text-muted-foreground mt-1">Monthly payments</div>
              </button>
            </div>
          </div>

          {paymentType === "installment" && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
              <p className="font-medium text-foreground">Payment schedule:</p>
              <p>1st payment of $499 — due today</p>
              <p>2nd payment of $499 — due in 30 days</p>
              <p>3rd payment of $499 — due in 60 days</p>
              <p>4th payment of $499 — due in 90 days</p>
            </div>
          )}

          {/* What's included reminder */}
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 space-y-1.5">
            <p className="text-xs font-semibold text-green-400">Your enrollment includes:</p>
            {[
              "8 weeks of live virtual training",
              "Backstage experience at a major fashion show",
              "EXA Certified Runway Makeup Artist credential",
            ].map((item, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="text-green-400">✓</span> {item}
              </p>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="pt-4 border-t space-y-3">
            <div className="flex justify-between text-lg font-semibold">
              <span>{paymentType === "installment" ? "Due Today" : "Total"}</span>
              <span className="text-pink-500">
                ${paymentType === "installment"
                  ? (installmentAmount / 100).toFixed(2)
                  : (fullPrice / 100).toFixed(2)}
              </span>
            </div>

            <Button
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
              size="lg"
              onClick={handleCheckout}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {paymentType === "installment"
                    ? "Enroll — $499 First Payment"
                    : "Enroll — Pay in Full $1,995"}
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Secure payment powered by Stripe
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep("apply")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
          >
            Back to application
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-pink-500/30">
      <CardHeader className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 rounded-t-xl">
        <CardTitle className="text-center">
          <span className="text-pink-500">Application Form</span>
        </CardTitle>
        <p className="text-sm text-center text-muted-foreground">
          Fill out the form below to apply. Limited seats available.
        </p>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleApply} className="space-y-4">
          {/* Cohort Selection */}
          <div>
            <Label htmlFor="cohort">Select Cohort *</Label>
            <select
              id="cohort"
              value={cohort}
              onChange={(e) => setCohort(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Choose your cohort...</option>
              {COHORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="instagram">Instagram Handle</Label>
              <Input
                id="instagram"
                type="text"
                placeholder="@yourusername"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                type="text"
                placeholder="Miami"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                type="text"
                placeholder="FL"
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Experience Level */}
          <div>
            <Label htmlFor="experience">Experience Level *</Label>
            <select
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Select your experience level...</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Motivation */}
          <div>
            <Label htmlFor="motivation">
              Why do you want to become a runway makeup artist?
            </Label>
            <textarea
              id="motivation"
              placeholder="Tell us about your goals and what excites you about working backstage at fashion shows..."
              value={motivation}
              onChange={(e) => setMotivation(e.target.value)}
              disabled={isLoading}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
