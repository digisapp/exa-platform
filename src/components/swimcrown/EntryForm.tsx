"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Crown,
  CheckCircle2,
  Loader2,
  Sparkles,
  Waves,
  Gift,
} from "lucide-react";

interface Tier {
  id: "standard" | "full_package";
  name: string;
  price: number;
  icon: typeof Crown;
  featured: boolean;
  badge: string | null;
  borderClass: string;
  bgClass: string;
  iconColor: string;
  checkColor: string;
  features: string[];
}

const tiers: Tier[] = [
  {
    id: "standard",
    name: "Runway",
    price: 175,
    icon: Waves,
    featured: false,
    badge: null,
    borderClass: "border-pink-500/20",
    bgClass: "bg-white/[0.03]",
    iconColor: "text-pink-400",
    checkColor: "text-pink-400",
    features: [
      "Walk the runway at Miami Swim Week",
      "Compete for Miss SwimCrown 2026",
    ],
  },
  {
    id: "full_package",
    name: "Runway + Glam",
    price: 399,
    icon: Gift,
    featured: true,
    badge: "Best Value",
    borderClass: "border-rose-500/40 ring-1 ring-rose-500/20",
    bgClass: "bg-gradient-to-b from-rose-500/10 to-white/[0.03]",
    iconColor: "text-rose-400",
    checkColor: "text-rose-400",
    features: [
      "Walk the Runway at Miami Swim Week",
      "Pre-Show Hair and Makeup",
      "Professional Photos & Video of your Walk",
      "Official EXA Models Robe",
      "Gifted Designer Swimwear + Sponsored Goodies",
    ],
  },
];

export function EntryForm() {
  const [selectedTier, setSelectedTier] = useState<"standard" | "full_package">("full_package");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const currentTier = tiers.find((t) => t.id === selectedTier)!;

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (!instagram.trim()) {
      toast.error("Please enter your Instagram handle");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/swimcrown/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          instagram: instagram.trim().replace(/^@/, ""),
          phone: phone.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit entry");
      }

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.success("Entry submitted!");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Contact Info */}
      <div className="max-w-md mx-auto mb-10 space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Full Name
          </label>
          <Input
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 py-5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Email
          </label>
          <Input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 py-5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Instagram
          </label>
          <Input
            placeholder="@yourhandle"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 py-5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1.5">
            Phone Number
          </label>
          <Input
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="bg-white/[0.05] border-white/10 text-white placeholder:text-white/30 py-5"
          />
        </div>
      </div>

      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer p-6 transition-all duration-200 rounded-3xl ${tier.bgClass} ${
                isSelected
                  ? tier.id === "full_package"
                    ? "border-rose-500 ring-2 ring-rose-500/30 scale-[1.02]"
                    : "border-pink-500 ring-2 ring-pink-500/30 scale-[1.02]"
                  : `${tier.borderClass} hover:border-pink-500/30`
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.badge && (
                <Badge
                  className="absolute -top-3 left-1/2 -translate-x-1/2 font-bold px-3 text-xs bg-gradient-to-r from-rose-500 to-pink-500 text-white"
                >
                  {tier.badge}
                </Badge>
              )}

              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className={`h-5 w-5 ${tier.id === "full_package" ? "text-rose-400" : "text-pink-400"}`} />
                </div>
              )}

              <tier.icon
                className={`h-8 w-8 mb-3 ${tier.iconColor}`}
              />
              <h3
                className={`text-lg font-bold ${
                  tier.id === "full_package" ? "text-rose-300" : "text-white"
                } ${tier.badge ? "mt-1" : ""}`}
              >
                {tier.name}
              </h3>
              <p className="text-2xl font-black text-white mt-1">
                ${tier.price}
              </p>

              <ul className="mt-4 space-y-2.5 text-sm text-white">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 mt-0.5 shrink-0 ${tier.checkColor}`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Submit */}
      <div className="max-w-md mx-auto">
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full font-bold py-6 text-lg rounded-full shadow-lg ${
            selectedTier === "full_package"
              ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/25"
              : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-pink-500/25"
          }`}
          size="lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-5 w-5 mr-2" />
          )}
          {loading
            ? "Processing..."
            : `Enter ${currentTier.name} — $${currentTier.price}`}
        </Button>

        <p className="text-center text-xs text-white/80 mt-4">
          You will be redirected to Stripe for secure payment. Entry fee is
          non-refundable.
        </p>
      </div>
    </div>
  );
}
