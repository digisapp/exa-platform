"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { toast } from "sonner";
import { AUCTION_CATEGORIES } from "@/types/auctions";
import type { AuctionCategory } from "@/types/auctions";

export default function EditBidPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
    const loadAuction = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      // Get model profile
      const { data: model } = await (supabase
        .from("models") as any)
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!model) {
        toast.error("Model profile not found");
        router.push("/dashboard");
        return;
      }

      // Get auction
      const { data: auction, error } = await (supabase as any)
        .from("auctions")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !auction) {
        toast.error("Auction not found");
        router.push("/bids/manage");
        return;
      }

      if (auction.model_id !== model.id) {
        toast.error("Not your auction");
        router.push("/bids/manage");
        return;
      }

      if (auction.status !== "draft") {
        toast.error("Can only edit draft auctions");
        router.push("/bids/manage");
        return;
      }

      // Populate form with existing data
      setTitle(auction.title || "");
      setDescription(auction.description || "");
      setDeliverables(auction.deliverables || "");
      setCategory(auction.category || "other");
      setStartingPrice(auction.starting_price?.toString() || "100");
      setReservePrice(auction.reserve_price?.toString() || "");
      setBuyNowPrice(auction.buy_now_price?.toString() || "");
      setAllowAutoBid(auction.allow_auto_bid ?? true);

      // Infer duration from remaining time — snap to closest preset
      if (auction.ends_at) {
        const msLeft = new Date(auction.ends_at).getTime() - Date.now();
        const daysLeft = Math.round(msLeft / (1000 * 60 * 60 * 24));
        if (daysLeft <= 1) setDuration("1");
        else if (daysLeft <= 3) setDuration("3");
        else if (daysLeft <= 7) setDuration("7");
        else setDuration("14");
      }

      setLoading(false);
    };

    loadAuction();
  }, [supabase, router, id]);

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
      // Update auction via PATCH
      const response = await fetch(`/api/auctions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          deliverables: deliverables.trim() || undefined,
          category,
          starting_price: parsedStartingPrice,
          reserve_price: parsedReservePrice,
          buy_now_price: parsedBuyNowPrice,
          ends_at: endsAt.toISOString(),
          allow_auto_bid: allowAutoBid,
          anti_snipe_minutes: 2,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update auction");
      }

      // Publish if requested
      if (publish) {
        const publishResponse = await fetch(`/api/auctions/${id}/publish`, {
          method: "POST",
        });

        if (!publishResponse.ok) {
          toast.success("Auction updated as draft");
          router.push("/bids/manage");
          return;
        }

        toast.success("Auction updated and published!");
      } else {
        toast.success("Auction updated");
      }

      router.push("/bids/manage");
    } catch (error: any) {
      toast.error(error.message || "Failed to update auction");
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
              <h1 className="text-2xl md:text-3xl font-bold">Edit EXA Bid</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Update your draft auction details before publishing
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">

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
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-background/80 backdrop-blur-xl border border-violet-500/20 shadow-lg shadow-black/20">
            <Button
              variant="outline"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="flex-1 border-violet-500/30 hover:bg-violet-500/10"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Update EXA Bid
            </Button>
            <Button
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shadow-lg shadow-violet-500/25"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Gavel className="h-4 w-4 mr-2" />
              )}
              Update & Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
