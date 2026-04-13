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
  Waves,
} from "lucide-react";

interface Tier {
  id: "standard" | "vip";
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
    name: "Standard",
    price: 150,
    icon: Waves,
    featured: false,
    badge: null,
    borderClass: "border-teal-500/20",
    bgClass: "bg-[#0d1f35]/80",
    iconColor: "text-teal-400",
    checkColor: "text-teal-400",
    features: [
      "Walk the runway at Miami Swim Week",
      "Gifted designer swimwear ($100+ value)",
      "Sponsor goodie bag",
      "Official SwimCrown contestant profile",
      "Online public fan voting",
      "Professional runway content",
    ],
  },
  {
    id: "vip",
    name: "VIP Entry",
    price: 250,
    icon: Crown,
    featured: true,
    badge: "Recommended",
    borderClass: "border-rose-500/40 ring-1 ring-rose-500/20",
    bgClass: "bg-gradient-to-b from-rose-500/10 to-[#0d1f35]/80",
    iconColor: "text-rose-400",
    checkColor: "text-rose-400",
    features: [
      "Everything in Standard",
      "Skip to the finals — bypass preliminary rounds",
      "Runway coaching to perfect your walk",
      "Priority placement — seen first by judges",
      "Featured across EXA social channels",
      "Higher visibility with designers & brands",
    ],
  },
];

export function EntryForm() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<"standard" | "vip">("vip");
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
    <div className="max-w-3xl mx-auto">
      {/* Tier Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8">
        {tiers.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <Card
              key={tier.id}
              className={`relative cursor-pointer p-6 transition-all duration-200 ${tier.bgClass} ${
                isSelected
                  ? tier.id === "vip"
                    ? "border-rose-500 ring-2 ring-rose-500/30 scale-[1.02]"
                    : "border-teal-500 ring-2 ring-teal-500/30 scale-[1.02]"
                  : `${tier.borderClass} hover:border-teal-500/30`
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

              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className={`h-5 w-5 ${tier.id === "vip" ? "text-rose-400" : "text-teal-400"}`} />
                </div>
              )}

              <tier.icon
                className={`h-8 w-8 mb-3 ${tier.iconColor}`}
              />
              <h3
                className={`text-lg font-bold ${
                  tier.id === "vip" ? "text-rose-300" : "text-white"
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
            className="bg-[#0d1f35]/80 border-teal-500/20 text-white"
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
          className={`w-full font-bold py-6 text-lg rounded-full shadow-lg ${
            selectedTier === "vip"
              ? "bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-rose-500/25"
              : "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-teal-500/25"
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
