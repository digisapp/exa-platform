"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
  Upload,
  Coins,
  Clock,
  Zap,
  Shield,
  Info,
  ImagePlus,
  FileText,
  Tag,
  Timer,
  X,
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
  const [uploading, setUploading] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [startingPrice, setStartingPrice] = useState("100");
  const [reservePrice, setReservePrice] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [category, setCategory] = useState<AuctionCategory>("other");
  const [allowAutoBid, setAllowAutoBid] = useState(true);
  const [antiSnipeMinutes, setAntiSnipeMinutes] = useState("2");

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
      setCoverImageUrl(auction.cover_image_url || null);
      setCategory(auction.category || "other");
      setStartingPrice(auction.starting_price?.toString() || "100");
      setReservePrice(auction.reserve_price?.toString() || "");
      setBuyNowPrice(auction.buy_now_price?.toString() || "");
      setAllowAutoBid(auction.allow_auto_bid ?? true);
      setAntiSnipeMinutes(auction.anti_snipe_minutes?.toString() || "2");

      // Parse end date/time
      if (auction.ends_at) {
        const endDateTime = new Date(auction.ends_at);
        setEndDate(endDateTime.toISOString().split("T")[0]);
        setEndTime(
          endDateTime.toTimeString().slice(0, 5)
        );
      }

      setLoading(false);
    };

    loadAuction();
  }, [supabase, router, id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      const response = await fetch("/api/upload/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          folder: "auctions",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, publicUrl } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      setCoverImageUrl(publicUrl);
      toast.success("Image uploaded");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
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

    if (!endDate || !endTime) {
      toast.error("End date and time are required");
      return;
    }

    const endsAt = new Date(`${endDate}T${endTime}`);
    if (endsAt <= new Date()) {
      toast.error("End time must be in the future");
      return;
    }

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
          cover_image_url: coverImageUrl || null,
          category,
          starting_price: parsedStartingPrice,
          reserve_price: parsedReservePrice,
          buy_now_price: parsedBuyNowPrice,
          ends_at: endsAt.toISOString(),
          allow_auto_bid: allowAutoBid,
          anti_snipe_minutes: parseInt(antiSnipeMinutes) || 2,
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

        {/* Step 1: Cover Image */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-violet-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs font-bold">
              1
            </div>
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-violet-400" />
              <span className="font-semibold">Cover Image</span>
            </div>
            <Badge variant="outline" className="ml-auto border-violet-500/30 text-violet-400 text-xs">
              Recommended
            </Badge>
          </div>
          <div className="p-6">
            {coverImageUrl ? (
              <div className="relative aspect-[3/4] max-w-[240px] mx-auto rounded-xl overflow-hidden bg-zinc-800 ring-2 ring-violet-500/30 shadow-lg shadow-violet-500/10">
                <Image
                  src={coverImageUrl}
                  alt="Cover"
                  fill
                  className="object-cover"
                />
                <button
                  onClick={() => setCoverImageUrl(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <label className="group flex flex-col items-center justify-center aspect-[3/4] max-w-[240px] mx-auto rounded-xl border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 bg-violet-500/5 hover:bg-violet-500/10 cursor-pointer transition-all">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors mb-3">
                      <Upload className="h-6 w-6 text-violet-400" />
                    </div>
                    <span className="text-sm font-medium text-violet-400">
                      Upload cover photo
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Portrait format, max 10MB
                    </span>
                  </>
                )}
              </label>
            )}
          </div>
        </div>

        {/* Step 2: Details */}
        <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-violet-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-white text-xs font-bold">
              2
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
                placeholder="Describe what makes this auction special..."
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

        {/* Step 3: Pricing */}
        <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-amber-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-xs font-bold">
              3
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

        {/* Step 4: Duration & Settings */}
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent overflow-hidden">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-blue-500/10">
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-white text-xs font-bold">
              4
            </div>
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-400" />
              <span className="font-semibold">Duration & Settings</span>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="end-date" className="text-sm font-medium">
                  End Date <span className="text-pink-500">*</span>
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1.5 bg-background/50 border-blue-500/20 focus:border-blue-500/50"
                />
              </div>
              <div>
                <Label htmlFor="end-time" className="text-sm font-medium">
                  End Time <span className="text-pink-500">*</span>
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1.5 bg-background/50 border-blue-500/20 focus:border-blue-500/50"
                />
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

            <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <Label htmlFor="anti-snipe" className="text-sm font-medium">Anti-Sniping</Label>
                  <p className="text-xs text-muted-foreground">
                    Extend auction if bid in final minutes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="anti-snipe"
                  type="number"
                  min="0"
                  max="10"
                  value={antiSnipeMinutes}
                  onChange={(e) => setAntiSnipeMinutes(e.target.value)}
                  className="w-20 text-center bg-background/50 border-blue-500/20"
                />
                <span className="text-xs text-muted-foreground">min</span>
              </div>
            </div>

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
