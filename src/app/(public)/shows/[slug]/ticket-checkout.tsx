"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Ticket,
  Loader2,
  Minus,
  Plus,
  CheckCircle,
  AlertCircle,
  Calendar,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Sun,
  Sparkles,
  Waves,
  Trophy,
  Wine,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TicketTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  quantity_available: number | null;
  quantity_sold: number;
  available: number | null;
  isSoldOut: boolean;
  isSaleActive: boolean;
}

interface TicketCheckoutProps {
  tiers: TicketTier[];
  eventName: string;
  eventDate?: string;
  eventLocation?: string;
  referringModelName?: string;
}

/**
 * Show metadata per day of Miami Swim Week 2026.
 *
 * Keyed by "May DD" which matches the string embedded in every tier name:
 *   "Casting Call Day — GA (May 25)"
 *   "Day 1 - First Row (May 26)"
 *
 * If a tier's name doesn't match a day here, it falls under `DEFAULT_DAY`
 * and is still selectable (defensive fallback).
 */
const DAY_META: Record<
  string,
  {
    dayLabel: string;
    dateNum: string;
    title: string;
    subtitle: string;
    badge: string | null;
    badgeGradient: string;
    gradient: string;
    ring: string;
    iconColor: string;
    Icon: typeof Sun;
    highlight: boolean;
  }
> = {
  "May 25": {
    dayLabel: "Mon",
    dateNum: "25",
    title: "Casting Call Day",
    subtitle: "11am–4pm · Pool, sun, music · 100's of models cast for EXA Shows",
    badge: "Day Party",
    badgeGradient: "from-amber-500 to-orange-500",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
    ring: "ring-amber-500/40 hover:ring-amber-400/70",
    iconColor: "text-amber-300",
    Icon: Sun,
    highlight: true,
  },
  "May 26": {
    dayLabel: "Tue",
    dateNum: "26",
    title: "Opening Show",
    subtitle: "Doors 6pm · Show 7pm · Grand opening night",
    badge: "Opening Night",
    badgeGradient: "from-yellow-500 to-amber-500",
    gradient: "from-yellow-500/20 via-amber-500/10 to-transparent",
    ring: "ring-yellow-500/40 hover:ring-yellow-400/70",
    iconColor: "text-yellow-300",
    Icon: Trophy,
    highlight: true,
  },
  "May 27": {
    dayLabel: "Wed",
    dateNum: "27",
    title: "Signature Runway",
    subtitle: "Doors 6pm · Show 7pm",
    badge: null,
    badgeGradient: "",
    gradient: "from-pink-500/15 via-violet-500/10 to-transparent",
    ring: "ring-pink-500/30 hover:ring-pink-400/60",
    iconColor: "text-pink-300",
    Icon: Sparkles,
    highlight: false,
  },
  "May 28": {
    dayLabel: "Thu",
    dateNum: "28",
    title: "Signature Runway",
    subtitle: "Doors 6pm · Show 7pm",
    badge: null,
    badgeGradient: "",
    gradient: "from-pink-500/15 via-violet-500/10 to-transparent",
    ring: "ring-pink-500/30 hover:ring-pink-400/60",
    iconColor: "text-pink-300",
    Icon: Sparkles,
    highlight: false,
  },
  "May 29": {
    dayLabel: "Fri",
    dateNum: "29",
    title: "Signature Runway",
    subtitle: "Doors 6pm · Show 7pm",
    badge: null,
    badgeGradient: "",
    gradient: "from-pink-500/15 via-violet-500/10 to-transparent",
    ring: "ring-pink-500/30 hover:ring-pink-400/60",
    iconColor: "text-pink-300",
    Icon: Sparkles,
    highlight: false,
  },
  "May 30": {
    dayLabel: "Sat",
    dateNum: "30",
    title: "Afternoon Show + Night Show",
    subtitle: "Show 2pm · Night Show 9pm",
    badge: null,
    badgeGradient: "",
    gradient: "from-violet-500/20 via-pink-500/10 to-transparent",
    ring: "ring-violet-500/40 hover:ring-violet-400/70",
    iconColor: "text-violet-300",
    Icon: Sparkles,
    highlight: true,
  },
  "May 31": {
    dayLabel: "Sun",
    dateNum: "31",
    title: "Closing Show",
    subtitle: "Doors 6pm · Show 7pm · Closing party",
    badge: null,
    badgeGradient: "",
    gradient: "from-pink-500/20 via-violet-500/10 to-transparent",
    ring: "ring-pink-500/40 hover:ring-pink-400/70",
    iconColor: "text-pink-300",
    Icon: Sparkles,
    highlight: true,
  },
};

// Order in which to display days
const DAY_ORDER = ["May 25", "May 26", "May 27", "May 28", "May 29", "May 30", "May 31"];

// Fallback metadata for any tier whose name we can't bucket into a day.
const DEFAULT_DAY = {
  dayLabel: "",
  dateNum: "",
  title: "Other",
  subtitle: "",
  badge: null as string | null,
  badgeGradient: "",
  gradient: "from-white/[0.05] to-transparent",
  ring: "ring-white/20 hover:ring-white/40",
  iconColor: "text-white/70",
  Icon: Ticket,
  highlight: false,
};

/**
 * Extract the "May DD" key from a tier name.
 * Returns null if no match (tier falls under "Other").
 */
function extractDayKey(name: string): string | null {
  const match = name.match(/\(May\s+(\d{1,2})\)/);
  if (!match) return null;
  return `May ${match[1]}`;
}

/**
 * Classify a tier by seat type, used for the tier card icon and ordering.
 * We sort by price ascending anyway, but a typed category helps render
 * the right icon and label at a glance.
 */
function classifyTier(name: string): {
  type: "ga" | "third" | "second" | "first" | "bottle" | "other";
  label: string;
} {
  const lower = name.toLowerCase();
  if (lower.includes("bottle")) return { type: "bottle", label: "VIP Bottle Table" };
  if (lower.includes("first row")) return { type: "first", label: "First Row" };
  if (lower.includes("second row")) return { type: "second", label: "Second Row" };
  if (lower.includes("third row")) return { type: "third", label: "Third Row" };
  if (lower.includes("ga") || lower.includes("general admission")) {
    return { type: "ga", label: "GA Standing" };
  }
  return { type: "other", label: "Ticket" };
}

export function TicketCheckout({
  tiers,
  eventName,
  eventDate,
  eventLocation,
  referringModelName,
}: TicketCheckoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group tiers by day key, keep "other" fallback
  const { tiersByDay, dayKeys } = useMemo(() => {
    const grouped: Record<string, TicketTier[]> = {};
    for (const tier of tiers) {
      const key = extractDayKey(tier.name) ?? "Other";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(tier);
    }
    // Sort each day's tiers by price ascending
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.price_cents - b.price_cents);
    }
    // Preserve intended day order, then append any unexpected keys
    const keys = [
      ...DAY_ORDER.filter((k) => grouped[k]?.length),
      ...Object.keys(grouped).filter((k) => !DAY_ORDER.includes(k)),
    ];
    return { tiersByDay: grouped, dayKeys: keys };
  }, [tiers]);

  // Lowest price across all tiers, used as the trigger button label
  const lowestPrice = tiers.length
    ? Math.min(...tiers.map((t) => t.price_cents)) / 100
    : 0;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty < 1) return;
    if (newQty > 10) return;
    if (
      selectedTier &&
      selectedTier.available !== null &&
      newQty > selectedTier.available
    )
      return;
    setQuantity(newQty);
  };

  const totalPrice = selectedTier
    ? (selectedTier.price_cents * quantity) / 100
    : 0;

  const resetToDayPicker = () => {
    setSelectedDay(null);
    setSelectedTier(null);
    setQuantity(1);
    setError(null);
  };

  const handleSelectDay = (dayKey: string) => {
    setSelectedDay(dayKey);
    setSelectedTier(null);
    setQuantity(1);
    setError(null);
  };

  const handleCheckout = async () => {
    if (!selectedTier) {
      setError("Please select a ticket type");
      return;
    }
    if (!buyerEmail) {
      setError("Please enter your email address");
      return;
    }
    if (!buyerEmail.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tickets/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tierId: selectedTier.id,
          quantity,
          buyerEmail,
          buyerName: buyerName || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  };

  // Derived: metadata for the currently selected day
  const dayMeta = selectedDay ? DAY_META[selectedDay] ?? DEFAULT_DAY : null;
  const dayTiers = selectedDay ? tiersByDay[selectedDay] ?? [] : [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          // Reset to day picker when closing so next open starts fresh
          resetToDayPicker();
          setBuyerEmail("");
          setBuyerName("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-lg py-6 rounded-xl shadow-lg shadow-pink-500/25"
        >
          <Ticket className="h-6 w-6 mr-2" />
          Get Tickets — From ${lowestPrice.toFixed(0)}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-0 bg-zinc-950 border-white/10">
        {/* Event Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-600 via-violet-600 to-purple-700 p-6 pb-5">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <DialogHeader>
            <DialogTitle className="text-left">
              <span className="text-xl font-bold text-white leading-tight">Tickets</span>
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* STEP 1 — DAY PICKER */}
        {!selectedDay && (
          <div className="p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              {dayKeys.map((key) => {
                const meta = DAY_META[key] ?? DEFAULT_DAY;
                const dayTiersList = tiersByDay[key] ?? [];
                const allSoldOut = dayTiersList.every((t) => t.isSoldOut);
                const minPrice = dayTiersList.length
                  ? Math.min(...dayTiersList.map((t) => t.price_cents)) / 100
                  : 0;
                const Icon = meta.Icon;

                return (
                  <button
                    key={key}
                    onClick={() => !allSoldOut && handleSelectDay(key)}
                    disabled={allSoldOut}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl p-4 text-left transition-all ring-1",
                      "bg-gradient-to-br",
                      meta.gradient,
                      meta.ring,
                      !allSoldOut && "hover:scale-[1.015] hover:shadow-lg",
                      allSoldOut && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    {/* Date tile + icon */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-black/30 border border-white/10">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                            {meta.dayLabel || "—"}
                          </span>
                          <span className="text-2xl font-bold text-white leading-none">
                            {meta.dateNum || "?"}
                          </span>
                        </div>
                        <div className="pt-1">
                          <Icon className={cn("h-5 w-5", meta.iconColor)} />
                        </div>
                      </div>
                      {meta.badge && (
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r shadow-sm",
                            meta.badgeGradient,
                          )}
                        >
                          {meta.badge}
                        </span>
                      )}
                    </div>

                    {/* Show info */}
                    <p className="font-bold text-white text-base leading-tight mb-1">
                      {meta.title}
                    </p>
                    <p className="text-xs text-white/60 leading-relaxed mb-3 line-clamp-2">
                      {meta.subtitle}
                    </p>

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        {allSoldOut ? (
                          <span className="text-xs font-bold text-red-400">
                            Sold Out
                          </span>
                        ) : (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                              From
                            </p>
                            <p className="text-lg font-bold text-white">
                              ${minPrice.toFixed(0)}
                            </p>
                          </div>
                        )}
                      </div>
                      {!allSoldOut && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                          <span>Select</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2 — TIER PICKER + CHECKOUT */}
        {selectedDay && dayMeta && (
          <div className="p-6 space-y-5">
            {/* Back + selected day header */}
            <div className="flex items-start gap-3">
              <button
                onClick={resetToDayPicker}
                className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                aria-label="Back to day picker"
              >
                <ArrowLeft className="h-4 w-4 text-white/80" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">
                    {dayMeta.dayLabel} · {selectedDay}
                  </p>
                  {dayMeta.badge && (
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r",
                        dayMeta.badgeGradient,
                      )}
                    >
                      {dayMeta.badge}
                    </span>
                  )}
                </div>
                <p className="font-bold text-white text-lg leading-tight">
                  {dayMeta.title}
                </p>
                <p className="text-xs text-white/55 leading-relaxed">
                  {dayMeta.subtitle}
                </p>
              </div>
            </div>

            {/* Tier list */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Seats & Tables
              </Label>
              {dayTiers.map((tier) => {
                const classification = classifyTier(tier.name);
                const disabled = tier.isSoldOut || !tier.isSaleActive;
                const isSelected = selectedTier?.id === tier.id;

                return (
                  <button
                    key={tier.id}
                    onClick={() => {
                      if (!disabled) {
                        setSelectedTier(tier);
                        setQuantity(1);
                        setError(null);
                      }
                    }}
                    disabled={disabled}
                    className={cn(
                      "w-full p-4 rounded-xl border text-left transition-all relative",
                      isSelected
                        ? "border-pink-500 bg-pink-500/10 shadow-[0_0_14px_rgba(236,72,153,0.2)]"
                        : "border-white/10 bg-white/[0.03] hover:border-pink-500/50 hover:bg-white/[0.05]",
                      disabled && "opacity-50 cursor-not-allowed hover:border-white/10",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0 pr-6">
                        <div className="flex-shrink-0 mt-0.5">
                          {classification.type === "bottle" ? (
                            <Wine className="h-4 w-4 text-amber-300" />
                          ) : classification.type === "first" ? (
                            <Sparkles className="h-4 w-4 text-pink-300" />
                          ) : classification.type === "second" ? (
                            <Sparkles className="h-4 w-4 text-violet-300" />
                          ) : classification.type === "third" ? (
                            <Sparkles className="h-4 w-4 text-cyan-300" />
                          ) : (
                            <Ticket className="h-4 w-4 text-white/60" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white text-sm leading-tight">
                            {classification.label}
                          </p>
                          {tier.description && (
                            <p className="text-xs text-white/55 mt-1 line-clamp-2 leading-relaxed">
                              {tier.description}
                            </p>
                          )}
                          <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                            {tier.isSoldOut ? (
                              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">
                                Sold Out
                              </span>
                            ) : !tier.isSaleActive ? (
                              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                Sale Not Active
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-white">
                          ${(tier.price_cents / 100).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-white/45 uppercase tracking-wider">
                          {classification.type === "bottle" ? "per table" : "per ticket"}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-pink-400" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quantity */}
            {selectedTier && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Quantity
                </Label>
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                    className="h-10 w-10 rounded-xl"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold w-12 text-center tabular-nums text-white">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleQuantityChange(1)}
                    disabled={
                      quantity >= 10 ||
                      (selectedTier.available !== null &&
                        quantity >= selectedTier.available)
                    }
                    className="h-10 w-10 rounded-xl"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Buyer info */}
            {selectedTier && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-white/80">
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    required
                  />
                  <p className="text-xs text-white/50">
                    Your tickets will be sent to this email
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-white/80">
                    Full Name (Optional)
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Order summary */}
            {selectedTier && (
              <div className="rounded-xl bg-white/[0.04] border border-white/10 p-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
                  Order Summary
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate pr-3">
                    {classifyTier(selectedTier.name).label} × {quantity}
                  </span>
                  <span className="text-white tabular-nums">
                    ${((selectedTier.price_cents / 100) * quantity).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-2">
                  <span className="font-semibold text-white">Total</span>
                  <span className="font-bold text-xl text-white tabular-nums">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Checkout */}
            <Button
              onClick={handleCheckout}
              disabled={!selectedTier || isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 py-6 text-base font-semibold rounded-xl"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Ticket className="h-5 w-5 mr-2" />
                  {selectedTier
                    ? `Buy ${quantity} ${
                        classifyTier(selectedTier.name).type === "bottle"
                          ? quantity > 1
                            ? "Tables"
                            : "Table"
                          : quantity > 1
                            ? "Tickets"
                            : "Ticket"
                      } — $${totalPrice.toFixed(2)}`
                    : "Select a Seat or Table"}
                </>
              )}
            </Button>

            {referringModelName && (
              <p className="text-xs text-center text-white/60">
                ✨ Your purchase supports {referringModelName}!
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
