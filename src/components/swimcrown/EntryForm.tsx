"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Star,
  Gem,
} from "lucide-react";

interface Tier {
  id: "standard" | "crown" | "elite";
  name: string;
  price: number;
  icon: typeof Crown;
  featured: boolean;
  badge: string | null;
  borderClass: string;
  bgClass: string;
  iconColor: string;
  features: string[];
}

const tiers: Tier[] = [
  {
    id: "standard",
    name: "Standard",
    price: 299,
    icon: Star,
    featured: false,
    badge: null,
    borderClass: "border-zinc-700",
    bgClass: "bg-zinc-900/50",
    iconColor: "text-zinc-400",
    features: [
      "SwimCrown contestant profile",
      "Online public voting",
      "Official contestant badge",
    ],
  },
  {
    id: "crown",
    name: "Crown Package",
    price: 549,
    icon: Crown,
    featured: true,
    badge: "Most Popular",
    borderClass: "border-amber-500/40 ring-1 ring-amber-500/20",
    bgClass: "bg-gradient-to-b from-amber-500/10 to-zinc-900/50",
    iconColor: "text-amber-400",
    features: [
      "Everything in Standard",
      "Runway training session",
      "Professional swim photoshoot",
      "Digital comp card",
    ],
  },
  {
    id: "elite",
    name: "Elite Package",
    price: 799,
    icon: Gem,
    featured: false,
    badge: "Premium",
    borderClass: "border-violet-500/30",
    bgClass: "bg-gradient-to-b from-violet-500/5 to-zinc-900/50",
    iconColor: "text-violet-400",
    features: [
      "Everything in Crown",
      "Priority placement in gallery",
      "Social media feature on EXA",
      "Exclusive video interview",
    ],
  },
];

export function EntryForm() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<
    "standard" | "crown" | "elite"
  >("crown");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);

  const currentTier = tiers.find((t) => t.id === selectedTier)!;

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/swimcrown/enter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selectedTier,
          tagline: tagline.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit entry");
      }

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast.success("Entry submitted!");
        router.push("/swimcrown/enter/success");
      }
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer p-6 transition-all duration-200 ${tier.bgClass} ${
                isSelected
                  ? "border-amber-500 ring-2 ring-amber-500/30 scale-[1.02]"
                  : `${tier.borderClass} hover:border-amber-500/30`
              }`}
              onClick={() => setSelectedTier(tier.id)}
            >
              {tier.badge && (
                <Badge
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 font-bold px-3 text-xs ${
                    tier.id === "crown"
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black"
                      : "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                  }`}
                >
                  {tier.badge}
                </Badge>
              )}

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="h-5 w-5 text-amber-400" />
                </div>
              )}

              <tier.icon
                className={`h-8 w-8 mb-3 ${tier.iconColor}`}
              />
              <h3
                className={`text-lg font-bold ${
                  tier.id === "crown"
                    ? "text-amber-300"
                    : tier.id === "elite"
                      ? "text-violet-300"
                      : "text-white"
                } ${tier.badge ? "mt-1" : ""}`}
              >
                {tier.name}
              </h3>
              <p className="text-2xl font-black text-white mt-1">
                ${tier.price}
              </p>

              <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`h-4 w-4 mt-0.5 shrink-0 ${
                        tier.id === "crown"
                          ? "text-amber-400"
                          : tier.id === "elite"
                            ? "text-violet-400"
                            : "text-zinc-500"
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>

      {/* Tagline */}
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Tagline{" "}
            <span className="text-muted-foreground font-normal">
              (optional)
            </span>
          </label>
          <Input
            placeholder="Your swimwear motto or tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value.slice(0, 200))}
            className="bg-zinc-900/50 border-zinc-700 text-white"
            maxLength={200}
          />
          <p className="mt-1 text-xs text-muted-foreground text-right">
            {tagline.length}/200
          </p>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-black font-bold py-6 text-lg rounded-full shadow-lg shadow-amber-500/25"
          size="lg"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
          ) : (
            <Sparkles className="h-5 w-5 mr-2" />
          )}
          {loading
            ? "Processing..."
            : `Enter SwimCrown — $${currentTier.price}`}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          You will be redirected to Stripe for secure payment. Entry fee is
          non-refundable.
        </p>
      </div>
    </div>
  );
}
