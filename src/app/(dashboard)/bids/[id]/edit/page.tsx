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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { coinsToUsd, formatUsd } from "@/lib/coin-config";
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
} from "lucide-react";
import { toast } from "sonner";

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
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const parsedStartingPrice = parseInt(startingPrice) || 0;
  const parsedReservePrice = parseInt(reservePrice) || 0;
  const parsedBuyNowPrice = parseInt(buyNowPrice) || 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/bids/manage">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Auction</h1>
          <p className="text-muted-foreground">
            Update your draft auction details
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cover Image</CardTitle>
            <CardDescription>Add an eye-catching image for your auction</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {coverImageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-800">
                  <Image
                    src={coverImageUrl}
                    alt="Cover"
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => setCoverImageUrl(null)}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center aspect-video rounded-lg border-2 border-dashed border-zinc-700 hover:border-zinc-600 cursor-pointer transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload an image
                      </span>
                    </>
                  )}
                </label>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Auction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Exclusive Video Call + Custom Content"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this auction special..."
                className="mt-1.5 min-h-[100px]"
              />
            </div>

            <div>
              <Label htmlFor="deliverables">What the winner gets</Label>
              <Textarea
                id="deliverables"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="List what the winner will receive..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-400" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="starting-price">Starting Price (coins) *</Label>
              <div className="relative mt-1.5">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                <Input
                  id="starting-price"
                  type="number"
                  min="10"
                  step="10"
                  value={startingPrice}
                  onChange={(e) => setStartingPrice(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                = {formatUsd(coinsToUsd(parsedStartingPrice))}
              </p>
            </div>

            <div>
              <Label htmlFor="reserve-price" className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-violet-400" />
                Reserve Price (optional)
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
                  placeholder="Minimum price to sell"
                  className="pl-10"
                />
              </div>
              {parsedReservePrice > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatUsd(coinsToUsd(parsedReservePrice))}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Auction won&apos;t sell unless bidding reaches this amount
              </p>
            </div>

            <div>
              <Label htmlFor="buy-now-price" className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-400" />
                Buy Now Price (optional)
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
                  placeholder="Instant purchase price"
                  className="pl-10"
                />
              </div>
              {parsedBuyNowPrice > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  = {formatUsd(coinsToUsd(parsedBuyNowPrice))}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Allow fans to win instantly at this price
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timing */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-violet-400" />
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time *</Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="anti-snipe">Anti-Sniping (minutes)</Label>
              <Input
                id="anti-snipe"
                type="number"
                min="0"
                max="10"
                value={antiSnipeMinutes}
                onChange={(e) => setAntiSnipeMinutes(e.target.value)}
                className="mt-1.5 w-24"
              />
              <p className="text-xs text-muted-foreground mt-1 flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                Extend auction if bid placed in final minutes (0 to disable)
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="allow-auto-bid">Allow Auto-Bidding</Label>
                <p className="text-xs text-muted-foreground">
                  Let bidders set a maximum amount to bid automatically
                </p>
              </div>
              <Switch
                id="allow-auto-bid"
                checked={allowAutoBid}
                onCheckedChange={setAllowAutoBid}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={submitting}
            className="flex-1"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Draft
          </Button>
          <Button
            onClick={() => handleSubmit(true)}
            disabled={submitting}
            className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Gavel className="h-4 w-4 mr-2" />
            )}
            Save & Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
