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
  Calendar,
  MapPin,
  CheckCircle,
  Sparkles,
  Loader2,
  FileText,
  Printer,
  ArrowRight,
  User,
  Mail,
  Instagram,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function MiamiDigitalsPage() {
  return (
    <Suspense>
      <MiamiDigitalsContent />
    </Suspense>
  );
}

function MiamiDigitalsContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isDigisCreator, setIsDigisCreator] = useState(false);
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
      const res = await fetch("/api/fresh-digitals/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          instagram: instagram.trim(),
          isDigisCreator,
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
        <div className="max-w-md w-full rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent p-8 text-center space-y-4 shadow-[0_0_28px_rgba(52,211,153,0.2)]">
          <div className="relative inline-flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/40 blur-2xl" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/25 to-teal-500/25 ring-1 ring-emerald-500/40 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-emerald-300" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white">
            <span className="exa-gradient-text">You&apos;re Booked!</span>
          </h1>
          <p className="text-white/70">
            We&apos;ll send you the exact Miami Beach location and time details to your email before May 24th.
          </p>
          <p className="text-sm text-white/60">
            Questions? DM us on Instagram{" "}
            <a
              href="https://instagram.com/examodels"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:text-pink-200 transition-colors"
            >
              @examodels
            </a>
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/comp-card-creator"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 hover:border-pink-500/40 text-white text-sm font-semibold transition-all"
            >
              Create Your Comp Card
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-400 hover:to-violet-400 text-white text-sm font-bold shadow-[0_0_16px_rgba(236,72,153,0.4)] hover:shadow-[0_0_24px_rgba(236,72,153,0.6)] transition-all"
            >
              Back to EXA
            </Link>
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
            href="/comp-card-creator"
            className="text-sm text-white/60 hover:text-pink-300 transition-colors"
          >
            Free Comp Card Creator
          </Link>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Event Details */}
          <div className="space-y-8">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-400 text-xs font-semibold uppercase tracking-wide">
                <Camera className="h-3.5 w-3.5" />
                Live Event
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                FREE for Digis.cc Creators
              </span>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold mb-2">
                Swim Week Prep
              </p>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="exa-gradient-text">EXA Digitals</span>
              </h1>
              <p className="text-2xl md:text-3xl font-bold text-pink-300 mt-1">
                Miami Beach
              </p>
            </div>

            <p className="text-lg text-white/70 leading-relaxed">
              Get fresh digitals taken by an EXA photographer just in time for Miami Swim Week castings.
              Walk into every casting with a professional comp card in hand.
            </p>

            {/* Event Details */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-pink-500/15 ring-1 ring-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.2)]">
                  <Calendar className="h-5 w-5 text-pink-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">Sunday, May 24th</p>
                  <p className="text-sm text-white/60">Right before Miami Swim Week castings begin</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-violet-500/15 ring-1 ring-violet-500/30 shadow-[0_0_12px_rgba(167,139,250,0.2)]">
                  <MapPin className="h-5 w-5 text-violet-300" />
                </div>
                <div>
                  <p className="font-semibold text-white">Miami Beach</p>
                  <p className="text-sm text-white/60">Exact location to be announced</p>
                </div>
              </div>
            </div>

            {/* What's Included */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-white">What&apos;s Included</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: Camera,
                    title: "Professional Digitals",
                    desc: "Shot by an EXA photographer",
                  },
                  {
                    icon: Printer,
                    title: "20 Printed Comp Cards",
                    desc: "Ready for castings",
                  },
                  {
                    icon: FileText,
                    title: "Digital Comp Card",
                    desc: "Download & share instantly",
                  },
                  {
                    icon: Sparkles,
                    title: "Casting Ready",
                    desc: "In time for Swim Week",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-pink-500/25 transition-colors"
                  >
                    <item.icon className="h-5 w-5 text-pink-300 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-white/60">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Checkout Form */}
          <div className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-6 md:p-8 space-y-6 shadow-[0_0_24px_rgba(236,72,153,0.1)]">
              {/* Price */}
              <div className="text-center pb-4 border-b border-white/5">
                <p className="text-4xl md:text-5xl font-black">
                  <span className="exa-gradient-text">$125</span>
                </p>
                <p className="text-sm text-white/60 mt-1">
                  Digitals + 20 printed comp cards
                </p>
              </div>

              {/* Digis.cc toggle */}
              <button
                onClick={() => setIsDigisCreator(!isDigisCreator)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isDigisCreator
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    isDigisCreator
                      ? "border-emerald-500 bg-emerald-500"
                      : "border-white/20"
                  }`}
                >
                  {isDigisCreator && (
                    <CheckCircle className="h-3.5 w-3.5 text-white" />
                  )}
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">
                    I have a Digis.cc account
                  </p>
                  <p className="text-xs text-muted-foreground">
                    FREE for all models with a Digis.cc account
                  </p>
                </div>
                {isDigisCreator && (
                  <span className="text-emerald-400 font-bold text-sm">FREE</span>
                )}
              </button>

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
                className="w-full bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500 hover:from-pink-400 hover:via-violet-400 hover:to-cyan-400 text-white font-bold text-base h-12 rounded-full shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:shadow-[0_0_28px_rgba(236,72,153,0.6)] border-0 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : isDigisCreator ? (
                  <>
                    Reserve Your Spot — Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Reserve Your Spot — $125
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-center text-white/50">
                Secure checkout powered by Stripe. Location details sent via email.
              </p>

              {/* Sponsored by Digis */}
              <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs text-white/50">Sponsored by</span>
                <Image
                  src="/digis-logo-white.png"
                  alt="Digis"
                  width={56}
                  height={20}
                  className="h-5 w-auto opacity-70"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
