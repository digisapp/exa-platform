"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CreditCard,
  AlertCircle,
  CalendarClock,
  Video,
  MessageSquare,
  CheckCircle,
  Sparkles,
} from "lucide-react";

interface CoachingProgramSectionProps {
  workshopId: string;
}

export function CoachingProgramSection({ workshopId }: CoachingProgramSectionProps) {
  const [paymentType, setPaymentType] = useState<"plan" | "full">("plan");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (!buyerEmail || !buyerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!buyerName.trim()) {
      setError("Please enter your name");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workshops/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workshopId,
          quantity: 1,
          buyerEmail,
          buyerName,
          buyerPhone: buyerPhone || null,
          paymentType: paymentType === "plan" ? "installment" : "full",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create checkout");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-violet-500/30 bg-gradient-to-br from-violet-500/5 via-purple-500/5 to-background overflow-hidden">
      <CardContent className="pt-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge className="bg-violet-500/20 text-violet-400 border border-violet-500/30 text-xs">
              Virtual Program
            </Badge>
            <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 text-xs">
              Enrolling Now
            </Badge>
          </div>
          <h2 className="text-2xl font-bold">3-Month Runway Coaching Program</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Personal 1-on-1 coaching from our professional team — get runway-ready for Miami Swim Week 2026 from anywhere in the world.
          </p>
        </div>

        {/* What's included */}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: <Video className="h-4 w-4" />, text: "Bi-weekly runway video submissions" },
            { icon: <MessageSquare className="h-4 w-4" />, text: "Personalized 1-on-1 feedback each round" },
            { icon: <CheckCircle className="h-4 w-4" />, text: "Walk, posture, turns & expression coaching" },
            { icon: <Sparkles className="h-4 w-4" />, text: "Direct line to our coaching team each month" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="text-violet-400 mt-0.5 flex-shrink-0">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

        {/* Monthly timeline */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { month: "Month 1", focus: "Foundation — posture, stride & alignment" },
            { month: "Month 2", focus: "Performance — turns, transitions & expression" },
            { month: "Month 3", focus: "Polish — full run-through & show prep" },
          ].map((m, i) => (
            <div
              key={i}
              className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-center"
            >
              <p className="text-xs font-bold text-violet-400 uppercase tracking-wide">{m.month}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.focus}</p>
            </div>
          ))}
        </div>

        {/* Payment toggle */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Choose your plan</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPaymentType("plan")}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                paymentType === "plan"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className="font-semibold text-sm flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" />
                3-Month Plan
              </div>
              <div className="text-lg font-bold text-violet-400">$125<span className="text-sm font-normal">/mo</span></div>
              <div className="text-xs text-muted-foreground">$375 total</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentType("full")}
              className={`p-3 rounded-lg border-2 text-left transition-colors ${
                paymentType === "full"
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-muted hover:border-muted-foreground/50"
              }`}
            >
              <div className="font-semibold text-sm">Pay in Full</div>
              <div className="text-lg font-bold text-violet-400">$350</div>
              <div className="text-xs text-green-400">Save $25</div>
            </button>
          </div>
        </div>

        {paymentType === "plan" && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 space-y-1">
            <p className="font-medium text-foreground">Payment schedule:</p>
            <p>1st payment of $125 — due today (Month 1 starts)</p>
            <p>2nd payment of $125 — due in 30 days</p>
            <p>3rd payment of $125 — due in 60 days</p>
          </div>
        )}

        {/* Buyer Info */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="coachingName">Full Name *</Label>
            <Input
              id="coachingName"
              placeholder="Jane Smith"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="coachingEmail">Email Address *</Label>
            <Input
              id="coachingEmail"
              type="email"
              placeholder="you@example.com"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="coachingPhone">Phone (optional)</Label>
            <Input
              id="coachingPhone"
              type="tel"
              placeholder="(555) 123-4567"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-500 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <Button
          className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-5 rounded-xl shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.01]"
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
              {paymentType === "plan"
                ? "Enroll Now — $125 First Month"
                : "Enroll Now — Pay in Full $350"}
            </>
          )}
        </Button>
        <p className="text-xs text-center text-muted-foreground">Secure payment powered by Stripe</p>
      </CardContent>
    </Card>
  );
}
