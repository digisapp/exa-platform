"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  Link as LinkIcon,
  Copy,
  Check,
  Loader2,
  TrendingUp,
  MousePointerClick,
  ShoppingBag,
  Clock,
  Wallet,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface AffiliateCode {
  id: string;
  code: string;
  discountType: string | null;
  discountValue: number | null;
  clickCount: number;
  orderCount: number;
  totalEarnings: number;
  isActive: boolean;
}

interface Earning {
  id: string;
  orderNumber: string;
  orderStatus: string;
  orderTotal: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  availableAt: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface AffiliateData {
  model: {
    id: string;
    username: string;
    name: string;
  };
  codes: AffiliateCode[];
  earnings: {
    total: number;
    pending: number;
    available: number;
    paid: number;
    history: Earning[];
  };
}

export default function AffiliateDashboardPage() {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch("/api/shop/affiliate");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        if (result.codes?.length > 0) {
          setNewCode(result.codes[0].code);
        } else if (result.model?.username) {
          setNewCode(result.model.username.toUpperCase());
        }
      }
    } catch (error) {
      console.error("Failed to fetch affiliate data:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCode = async () => {
    if (!newCode.trim()) {
      toast.error("Please enter a code");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/shop/affiliate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: newCode }),
      });

      if (response.ok) {
        toast.success("Affiliate code saved!");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to save code");
      }
    } catch (error) {
      console.error("Save code error:", error);
      toast.error("Failed to save code");
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${baseUrl}/shop?ref=${data?.codes?.[0]?.code || newCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <DollarSign className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Affiliate Program</h1>
        <p className="text-muted-foreground mb-6">
          You need a model profile to join the affiliate program
        </p>
      </div>
    );
  }

  const activeCode = data.codes?.[0];

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-3">
        <DollarSign className="h-7 w-7 text-pink-500" />
        Shop Affiliate Dashboard
      </h1>
      <p className="text-muted-foreground mb-8">
        Earn 10% commission on every sale through your unique link
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">{formatPrice(data.earnings.total)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-xl font-bold">{formatPrice(data.earnings.pending)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Wallet className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available</p>
                <p className="text-xl font-bold">{formatPrice(data.earnings.available)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid Out</p>
                <p className="text-xl font-bold">{formatPrice(data.earnings.paid)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Affiliate Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Your Affiliate Link
            </CardTitle>
            <CardDescription>
              Share this link to earn 10% on every sale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Code</label>
              <div className="flex gap-2">
                <Input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="YOURCODE"
                  maxLength={20}
                />
                <Button onClick={saveCode} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>

            {activeCode && (
              <div className="p-4 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground mb-2">Your Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/shop?ref={activeCode.code}
                  </code>
                  <Button size="icon" variant="ghost" onClick={copyLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {activeCode && (
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <MousePointerClick className="h-4 w-4" />
                    <span className="text-xs">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold">{activeCode.clickCount}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                    <ShoppingBag className="h-4 w-4" />
                    <span className="text-xs">Orders</span>
                  </div>
                  <p className="text-2xl font-bold">{activeCode.orderCount}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-500">1</span>
              </div>
              <div>
                <p className="font-medium">Share Your Link</p>
                <p className="text-sm text-muted-foreground">
                  Post your affiliate link on social media, in your bio, or anywhere
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-500">2</span>
              </div>
              <div>
                <p className="font-medium">Someone Shops</p>
                <p className="text-sm text-muted-foreground">
                  When someone clicks your link and makes a purchase
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-pink-500">3</span>
              </div>
              <div>
                <p className="font-medium">Earn 10% Commission</p>
                <p className="text-sm text-muted-foreground">
                  You earn 10% of the sale. Available after 14-day hold period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Earnings History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Earnings History</CardTitle>
        </CardHeader>
        <CardContent>
          {data.earnings.history.length === 0 ? (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No earnings yet</p>
              <p className="text-sm text-muted-foreground">
                Share your link to start earning!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.earnings.history.map((earning) => (
                <div
                  key={earning.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium">Order #{earning.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(earning.createdAt)} • {earning.commissionRate}% of {formatPrice(earning.orderTotal)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-500">
                      +{formatPrice(earning.commissionAmount)}
                    </p>
                    <Badge
                      variant="secondary"
                      className={
                        earning.status === "paid"
                          ? "bg-green-500/20 text-green-500"
                          : earning.status === "confirmed"
                          ? "bg-blue-500/20 text-blue-500"
                          : "bg-amber-500/20 text-amber-500"
                      }
                    >
                      {earning.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
