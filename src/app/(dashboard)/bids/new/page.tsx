"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Gavel,
  ArrowLeft,
  Loader2,
  Coins,
  Clock,
  Zap,
  Shield,
  Info,
  FileText,
  Tag,
  Timer,
  Sparkles,
  Copy,
  Check,
  Instagram,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { AUCTION_CATEGORIES } from "@/types/auctions";
import type { AuctionCategory } from "@/types/auctions";

const QUICK_PRESETS = [
  {
    emoji: "🎬",
    label: "Brand Reel",
    title: "1 Custom Reel Featuring Your Brand",
    description: "I'll create a professional reel featuring your brand or product, posted to my Instagram. My audience is highly engaged and this is perfect for brand awareness.",
    deliverables: "• 1 custom Instagram Reel featuring your brand/product\n• Full rights to the video\n• Posted on my Instagram within 7 days of winning",
    category: "custom_content" as AuctionCategory,
    suggestedPrice: "500",
  },
  {
    emoji: "📲",
    label: "Story Shoutout",
    title: "Instagram Story Shoutout for Your Brand",
    description: "Bid for a dedicated Instagram Story shoutout to my followers. Perfect for brands, events, or anyone looking to grow their audience fast.",
    deliverables: "• 3 Instagram Story frames dedicated to your brand\n• Swipe-up link included\n• Story posted within 48 hours of winning",
    category: "shoutout" as AuctionCategory,
    suggestedPrice: "200",
  },
  {
    emoji: "🎂",
    label: "Birthday Video",
    title: "Personalized Birthday Video Message",
    description: "Win a personal birthday video from me! I'll record a custom message for you or someone special — perfect gift for fans.",
    deliverables: "• 1–2 min personalized birthday video\n• Recorded within 48 hours of your event date\n• Sent directly to you via DM",
    category: "shoutout" as AuctionCategory,
    suggestedPrice: "150",
  },
  {
    emoji: "🍣",
    label: "Dinner Date",
    title: "Dinner Date Night in Miami with Me",
    description: "Bid for an unforgettable dinner date night in Miami. Winner takes me out to a restaurant of your choice — food, drinks, and great company.",
    deliverables: "• 1 dinner date night in Miami (winner pays for the meal)\n• 2–3 hours together\n• Scheduled at a mutual time within 30 days",
    category: "experience" as AuctionCategory,
    suggestedPrice: "1000",
  },
  {
    emoji: "🛥️",
    label: "Boat Day",
    title: "Boat Day in Miami with Me",
    description: "Win a full boat day with me in Miami! Sun, water, and good vibes — this is a once-in-a-lifetime experience.",
    deliverables: "• Full day on the water in Miami\n• Scheduled within 30 days of winning\n• Winner coordinates the boat",
    category: "experience" as AuctionCategory,
    suggestedPrice: "2000",
  },
  {
    emoji: "📞",
    label: "Video Call",
    title: "30-Min Private Video Call with Me",
    description: "Win a 30-minute one-on-one video call with me. Chat, ask anything, or just hang — this is your exclusive time.",
    deliverables: "• 30-minute private video call\n• Scheduled within 14 days of winning\n• Your choice of topic",
    category: "video_call" as AuctionCategory,
    suggestedPrice: "300",
  },
  {
    emoji: "🎉",
    label: "Attend Your Event",
    title: "I'll Attend Your Birthday or Event",
    description: "Win me at your event! Whether it's your birthday, party, or special occasion — I'll show up and make it unforgettable.",
    deliverables: "• Personal appearance at your event (Miami area)\n• Up to 3 hours\n• Scheduled at a mutual time within 60 days",
    category: "experience" as AuctionCategory,
    suggestedPrice: "3000",
  },
  {
    emoji: "📦",
    label: "Unboxing Video",
    title: "Unboxing & Review of Your Product",
    description: "Send me your product and I'll create an authentic unboxing/review video for my followers. Great for new product launches.",
    deliverables: "• Unboxing + review video posted to Instagram\n• Honest, authentic review\n• Posted within 7 days of receiving the product",
    category: "custom_content" as AuctionCategory,
    suggestedPrice: "400",
  },
] as const;

export default function NewBidPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [publishedAuction, setPublishedAuction] = useState<{ id: string; title: string; duration: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [startingPrice, setStartingPrice] = useState("100");
  const [reservePrice, setReservePrice] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [duration, setDuration] = useState("7");
  const [category, setCategory] = useState<AuctionCategory>("other");
  const [allowAutoBid, setAllowAutoBid] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get model profile
      const { data: model } = await (supabase
        .from("models") as any)
        .select("id, is_approved")
        .eq("user_id", user.id)
        .single();

      if (!model) {
        toast.error("Model profile not found");
        router.push("/dashboard");
        return;
      }

      if (!model.is_approved) {
        toast.error("Your profile must be approved to create auctions");
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    };

    checkAuth();
  }, [supabase, router]);

  const getBidCaptions = (bidTitle: string, bidId: string, days: string) => {
    const daysNum = parseInt(days);
    const timeframe = daysNum === 1 ? "24 hours" : `${daysNum} days`;
    return [
      `🔥 My new bid just went LIVE!\n\n"${bidTitle}"\n\nYou have ${timeframe} to place your bid — link in bio 👆`,
      `⏳ ${daysNum === 1 ? "Only 24 hours" : `Only ${daysNum} days`} to win this one!\n\n"${bidTitle}"\n\nDon't miss out — grab your bid now! Link in bio 🏆`,
      `💫 I want YOU to win this!\n\n"${bidTitle}" is now open for bidding 🎉\n\nBidding closes in ${timeframe} — link in bio ✨`,
    ];
  };

  const copyCaption = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyLink = async (bidId: string) => {
    await navigator.clipboard.writeText(`https://www.examodels.com/bids/${bidId}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const applyPreset = (preset: typeof QUICK_PRESETS[number]) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setDeliverables(preset.deliverables);
    setCategory(preset.category);
    setStartingPrice(preset.suggestedPrice);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (publish: boolean = false) => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    const parsedStartingPrice = parseInt(startingPrice);
    if (isNaN(parsedStartingPrice) || parsedStartingPrice < 10) {
      toast.error("Starting price must be at least 10 coins");
      return;
    }

    // Calculate end time from duration
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + parseInt(duration));
    endsAt.setHours(12, 0, 0, 0);

    const parsedReservePrice = reservePrice ? parseInt(reservePrice) : null;
    if (parsedReservePrice && parsedReservePrice <= parsedStartingPrice) {
      toast.error("Reserve price must be higher than starting price");
      return;
    }

    const parsedBuyNowPrice = buyNowPrice ? parseInt(buyNowPrice) : null;
    if (parsedBuyNowPrice && parsedBuyNowPrice <= parsedStartingPrice) {
      toast.error("Buy now price must be higher than starting price");
      return;
    }

    setSubmitting(true);
    try {
      // Create auction
      const response = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          category,
          starting_price: parsedStartingPrice,
          reserve_price: parsedReservePrice || undefined,
          buy_now_price: parsedBuyNowPrice || undefined,
          ends_at: endsAt.toISOString(),
          allow_auto_bid: allowAutoBid,
          anti_snipe_minutes: 2,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create auction");
      }

      const { auction } = await response.json();

      // Publish if requested
      if (publish) {
        const publishResponse = await fetch(`/api/auctions/${auction.id}/publish`, {
          method: "POST",
        });

        if (!publishResponse.ok) {
          toast.success("Auction created as draft");
          router.push("/bids/manage");
          return;
        }

        // Show caption modal instead of redirecting
        setPublishedAuction({ id: auction.id, title: title.trim(), duration });
        return;
      } else {
        toast.success("EXA Bid saved as draft");
      }

      router.push("/bids/manage");
    } catch (error: any) {
      toast.error(error.message || "Failed to create auction");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const parsedStartingPrice = parseInt(startingPrice) || 0;
  const parsedReservePrice = parseInt(reservePrice) || 0;
  const parsedBuyNowPrice = parseInt(buyNowPrice) || 0;

  return (
    <>
    <div className="max-w-2xl mx-auto pb-8">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-pink-500/10 to-transparent border border-violet-500/20 p-6 md:p-8">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-pink-500/15 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild className="hover:bg-white/10">
              <Link href="/bids/manage">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-violet-500/25">
              <Gavel className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Create EXA Bid</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Set up a live auction and let fans compete for your content and services
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">

        {/* Quick Start Presets */}
        <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-pink-500/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-pink-400" />
              <span className="font-semibold">Quick Start</span>
            </div>
            <span className="text-xs text-muted-foreground ml-1">Tap any to auto-fill your bid</span>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-pink-500/15 hover:border-pink-500/40 bg-pink-500/5 hover:bg-pink-500/10 transition-all text-center group"
              >
                <span className="text-2xl">{preset.emoji}</span>
                <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground leading-tight">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 1: Details */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-violet-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs font-bold">
              1
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-400" />
              <span className="font-semibold">Bid Details</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <Label htmlFor="title" className="text-sm font-medium">
                Title <span className="text-pink-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Exclusive Video Call + Custom Content"
                className="mt-1.5 bg-background/50 border-violet-500/20 focus:border-violet-500/50"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this listing special..."
                className="mt-1.5 min-h-[100px] bg-background/50 border-violet-500/20 focus:border-violet-500/50"
              />
            </div>

            <div>
              <Label htmlFor="deliverables" className="text-sm font-medium">What the winner gets</Label>
              <Textarea
                id="deliverables"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="List what the winner will receive..."
                className="mt-1.5 min-h-[80px] bg-background/50 border-violet-500/20 focus:border-violet-500/50"
              />
            </div>

            <div>
              <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-violet-400" />
                Category
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v as AuctionCategory)}>
                <SelectTrigger className="mt-1.5 bg-background/50 border-violet-500/20">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {AUCTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Step 2: Pricing */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold">
              2
            </div>
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="font-semibold">Pricing</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <Label htmlFor="starting-price" className="text-sm font-medium">
                Starting Price <span className="text-pink-500">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                <Input
                  id="starting-price"
                  type="number"
                  min="10"
                  step="10"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="pl-10 bg-background/50 border-amber-500/20 focus:border-amber-500/50"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                {formatUsd(coinsToUsd(parsedStartingPrice))} USD
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="reserve-price" className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-violet-400" />
                  Reserve Price
                </Label>
                <div className="relative mt-1.5">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <Input
                    id="reserve-price"
                    type="number"
                    min={parsedStartingPrice + 1}
                    step="10"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(e.target.value)}
                    placeholder="Optional"
                    className="pl-10 bg-background/50 border-amber-500/20 focus:border-amber-500/50"
                  />
                </div>
                {parsedReservePrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatUsd(coinsToUsd(parsedReservePrice))} USD
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Won&apos;t sell below this amount
                </p>
              </div>

              <div>
                <Label htmlFor="buy-now-price" className="text-sm font-medium flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  Buy Now Price
                </Label>
                <div className="relative mt-1.5">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <Input
                    id="buy-now-price"
                    type="number"
                    min={parsedStartingPrice + 1}
                    step="10"
                    value={buyNowPrice}
                    onChange={(e) => setBuyNowPrice(e.target.value)}
                    placeholder="Optional"
                    className="pl-10 bg-background/50 border-amber-500/20 focus:border-amber-500/50"
                  />
                </div>
                {parsedBuyNowPrice > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatUsd(coinsToUsd(parsedBuyNowPrice))} USD
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  Fans can win instantly at this price
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Duration & Settings */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-blue-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white text-xs font-bold">
              3
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-400" />
              <span className="font-semibold">Duration & Settings</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Duration presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">How long should bidding run?</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { days: "1", label: "1 Day", sub: "Max FOMO" },
                  { days: "3", label: "3 Days", sub: "Quick hit" },
                  { days: "7", label: "7 Days", sub: "Most popular" },
                  { days: "14", label: "14 Days", sub: "Big ticket" },
                ].map(({ days, label, sub }) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDuration(days)}
                    className={`flex flex-col items-center gap-0.5 py-3 px-2 rounded-xl border transition-all ${
                      duration === days
                        ? "border-blue-500/60 bg-blue-500/15 text-blue-300"
                        : "border-blue-500/15 bg-blue-500/5 text-muted-foreground hover:border-blue-500/40 hover:text-foreground"
                    }`}
                  >
                    <span className="font-semibold text-sm">{label}</span>
                    <span className="text-[10px] opacity-70">{sub}</span>
                  </button>
                ))}
              </div>
              {/* End date preview */}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                Ends{" "}
                {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + parseInt(duration));
                  d.setHours(12, 0, 0, 0);
                  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + " at 12:00 PM";
                })()}
              </p>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Zap className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <Label htmlFor="allow-auto-bid" className="text-sm font-medium">Auto-Bidding</Label>
                  <p className="text-xs text-muted-foreground">
                    Let bidders set a max amount to bid automatically
                  </p>
                </div>
              </div>
              <Switch
                id="allow-auto-bid"
                checked={allowAutoBid}
                onCheckedChange={setAllowAutoBid}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-4 z-10">
          <div className="p-4 rounded-2xl bg-background/80 backdrop-blur-xl border border-violet-500/20 shadow-lg shadow-black/20">
            <Button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shadow-lg shadow-violet-500/25"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gavel className="h-4 w-4 mr-2" />
              )}
              Post Bid
            </Button>
          </div>
        </div>
      </div>
    </div>

    {/* Post-Publish Caption Modal */}
    {publishedAuction && (() => {
      const captions = getBidCaptions(publishedAuction.title, publishedAuction.id, publishedAuction.duration);
      const bidUrl = `https://www.examodels.com/bids/${publishedAuction.id}`;
      return (
        <Dialog open={true} onOpenChange={() => { router.push("/bids/manage"); }}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col items-center text-center gap-2 pb-2">
                <div className="text-4xl">🎉</div>
                <DialogTitle className="text-xl">Your bid is live!</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Hype it up on Instagram — copy a caption and share with your followers
                </p>
              </div>
            </DialogHeader>

            {/* Bid link */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bid link</p>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700">
                <span className="text-sm text-zinc-300 truncate flex-1">{bidUrl}</span>
                <button
                  onClick={() => copyLink(publishedAuction.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 text-xs font-medium transition-all shrink-0"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedLink ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Caption options */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Instagram className="h-3.5 w-3.5" />
                Ready-to-post captions
              </p>
              {captions.map((caption, i) => (
                <div key={i} className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 space-y-2">
                  <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{caption}</p>
                  <button
                    onClick={() => copyCaption(caption, i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-xs font-medium transition-all"
                  >
                    {copiedIndex === i ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedIndex === i ? "Copied!" : "Copy caption"}
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 border-zinc-700"
                onClick={() => router.push("/bids/manage")}
              >
                Go to My Bids
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white"
                onClick={() => window.open(`https://www.instagram.com`, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open Instagram
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      );
    })()}
    </>
  );
}
