"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle,
  Sparkles,
  Loader2,
  ArrowRight,
  User,
  Mail,
  Instagram,
  Footprints,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function ModelOnboardingPage() {
  return (
    <Suspense>
      <ModelOnboardingContent />
    </Suspense>
  );
}

function ModelOnboardingContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [paymentPlan, setPaymentPlan] = useState<"full" | "split">("full");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccess(true);
    }
    if (searchParams.get("cancelled") === "true") {
      toast.error("Checkout was cancelled. You can try again anytime.");
    }
  }, [searchParams]);

  const handleCheckout = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/model-onboarding/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          instagram: instagram.trim(),
          paymentPlan,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-4">
          <div className="inline-flex p-4 rounded-full bg-emerald-500/20 mb-2">
            <CheckCircle className="h-12 w-12 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold">You&apos;re All Set!</h1>
          <p className="text-muted-foreground">
            Your onboarding is confirmed. We&apos;ll send your Runway Workshop
            and Swimwear Digitals details to your email soon.
          </p>
          <p className="text-sm text-muted-foreground">
            Questions? DM us on Instagram{" "}
            <a
              href="https://instagram.com/examodels"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-400 hover:text-pink-300"
            >
              @examodels
            </a>
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="outline">
              <Link href="/comp-card-creator">Create Your Comp Card</Link>
            </Button>
            <Button
              asChild
              className="bg-gradient-to-r from-pink-500 to-violet-500"
            >
              <Link href="/">Back to EXA</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Image
              src="/exa-logo-white.png"
              alt="EXA"
              width={80}
              height={32}
              className="h-8 w-auto"
            />
          </Link>
          <Link
            href="/workshops"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View All Workshops
          </Link>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Onboarding Details */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-semibold uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" />
                New Model Onboarding
              </span>
            </div>

            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                Get Show Ready
              </h1>
              <p className="text-lg text-muted-foreground mt-3 leading-relaxed">
                To walk in EXA shows, every new model completes two steps:
                a Runway Workshop and Swimwear Digitals. This is our standard
                onboarding — it ensures you&apos;re fully prepared for the
                runway and castings.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm font-semibold text-emerald-400">
                  Guaranteed to walk in at least 1 show for Miami Swim Week
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">
                Your Onboarding Includes
              </h2>

              {/* Step 1: Runway Workshop */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 font-bold text-sm shrink-0">
                    1
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Runway Workshop</p>
                      <p className="text-sm text-muted-foreground">$350</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Learn the runway walk from industry professionals —
                      posture, turns, pacing, and stage presence. Required
                      before your first show.
                    </p>
                    <p className="text-xs text-pink-400 mt-1.5 font-medium">
                      Sunday, May 24th in Miami Beach
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 2: Swimwear Digitals */}
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 text-pink-400 font-bold text-sm shrink-0">
                    2
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">Swimwear Digitals</p>
                      <p className="text-sm text-muted-foreground">$200</p>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Professional swimwear photos shot by an EXA photographer.
                      Used for castings, your portfolio, and show placements.
                    </p>
                    <p className="text-xs text-pink-400 mt-1.5 font-medium">
                      May 22–25 in Miami Beach (pick a day that works best for you)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What you get */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">What You Get</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: Footprints,
                    title: "Runway Training",
                    desc: "Walk, posture & stage presence",
                  },
                  {
                    icon: Camera,
                    title: "Swimwear Digitals",
                    desc: "Professional photos by EXA",
                  },
                  {
                    icon: CheckCircle,
                    title: "Show Eligible",
                    desc: "Qualified to walk in EXA shows",
                  },
                  {
                    icon: Sparkles,
                    title: "Industry Coaching",
                    desc: "Tips from working professionals",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                  >
                    <item.icon className="h-5 w-5 text-pink-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Checkout Form */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-6 md:p-8 space-y-6">
              {/* Price */}
              <div className="text-center pb-4 border-b border-white/[0.06]">
                <p className="text-4xl font-black">
                  {paymentPlan === "full" ? "$550" : "$183.34"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {paymentPlan === "full"
                    ? "Complete Model Onboarding"
                    : "First of 3 payments"}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>$350 runway workshop</span>
                  <span>+</span>
                  <span>$200 digitals</span>
                </div>
              </div>

              {/* Payment Plan Toggle */}
              <div className="space-y-2">
                <Label className="text-sm">Payment Option</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("full")}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      paymentPlan === "full"
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    }`}
                  >
                    <p className="text-sm font-semibold">Pay in Full</p>
                    <p className="text-lg font-bold mt-0.5">$550</p>
                    <p className="text-[11px] text-muted-foreground">
                      One-time payment
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan("split")}
                    className={`relative rounded-xl border p-3 text-left transition-all ${
                      paymentPlan === "split"
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.15]"
                    }`}
                  >
                    <p className="text-sm font-semibold">3 Payments</p>
                    <p className="text-lg font-bold mt-0.5">$183.34<span className="text-xs font-normal text-muted-foreground"> each</span></p>
                    <p className="text-[11px] text-muted-foreground">
                      Every 18 days
                    </p>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">
                    Full Name *
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm">
                    Email *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram" className="text-sm">
                    Instagram Handle
                  </Label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="instagram"
                      placeholder="@yourhandle"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={handleCheckout}
                disabled={loading || !name.trim() || !email.trim()}
                size="lg"
                className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold text-base h-12"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {paymentPlan === "full"
                      ? "Complete Onboarding — $550"
                      : "Start Payment Plan — $183.34 today"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-muted-foreground/60">
                Secure checkout powered by Stripe. Details sent via email.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
