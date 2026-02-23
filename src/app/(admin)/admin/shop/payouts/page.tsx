"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  DollarSign,
  Store,
  Loader2,
  Check,
  Clock,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface BrandOwed {
  brand_id: string;
  brand_name: string;
  brand_email: string;
  payout_email: string | null;
  commission_rate: number;
  model_commission_rate: number;
  gross_sales: number;
  our_commission: number;
  affiliate_commission: number;
  net_payout: number;
  order_count: number;
  item_ids: string[];
}

interface Payout {
  id: string;
  brand_id: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  our_commission: number;
  affiliate_commission: number;
  net_payout: number;
  order_count: number;
  status: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  created_at: string;
  brand: { name: string } | null;
}

export default function AdminShopPayoutsPage() {
  const [brandsOwed, setBrandsOwed] = useState<BrandOwed[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState<BrandOwed | null>(null);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("paypal");
  const [paymentReference, setPaymentReference] = useState("");

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch all paid order items with brand commission info
      const { data: orderItems, error: itemsError } = await (supabase as any)
        .from("shop_order_items")
        .select(`
          id,
          line_total,
          brand_id,
          order:shop_orders!inner(payment_status),
          brand:shop_brands(id, name, contact_email, payout_email, commission_rate, model_commission_rate)
        `)
        .eq("order.payment_status", "paid");

      if (itemsError) throw itemsError;

      // Fetch all payouts + payout history
      const { data: existingPayouts, error: payoutsError } = await (supabase as any)
        .from("shop_brand_payouts")
        .select(`*, brand:shop_brands(name)`)
        .order("created_at", { ascending: false });

      if (payoutsError) throw payoutsError;

      setPayouts(existingPayouts || []);

      // Build set of item IDs already covered by paid/processing payouts
      const paidItemIds = new Set<string>();
      (existingPayouts || []).forEach((p: any) => {
        if (p.status === "paid" || p.status === "processing") {
          (p.order_item_ids || []).forEach((id: string) => paidItemIds.add(id));
        }
      });

      // Group remaining unpaid items by brand
      const brandMap = new Map<string, BrandOwed>();
      (orderItems || []).forEach((item: any) => {
        if (paidItemIds.has(item.id)) return;
        const b = item.brand;
        if (!b) return;

        const existing: BrandOwed = brandMap.get(b.id) ?? {
          brand_id: b.id,
          brand_name: b.name,
          brand_email: b.contact_email,
          payout_email: b.payout_email,
          commission_rate: b.commission_rate,
          model_commission_rate: b.model_commission_rate,
          gross_sales: 0,
          our_commission: 0,
          affiliate_commission: 0,
          net_payout: 0,
          order_count: 0,
          item_ids: [] as string[],
        };

        const gross = item.line_total;
        const exa = Math.round(gross * b.commission_rate / 100);
        const affiliate = Math.round(gross * b.model_commission_rate / 100);

        existing.gross_sales += gross;
        existing.our_commission += exa;
        existing.affiliate_commission += affiliate;
        existing.net_payout += gross - exa - affiliate;
        existing.order_count += 1;
        existing.item_ids.push(item.id);

        brandMap.set(b.id, existing);
      });

      setBrandsOwed(
        Array.from(brandMap.values()).sort((a, b) => b.net_payout - a.net_payout)
      );
    } catch (err) {
      console.error("Failed to fetch payout data:", err);
      toast.error("Failed to load payout data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openPayoutDialog = (brand: BrandOwed) => {
    setSelectedBrand(brand);
    setPaymentMethod("paypal");
    setPaymentReference("");
    setPayoutDialogOpen(true);
  };

  const createPayout = async () => {
    if (!selectedBrand) return;
    setSaving(true);
    const supabase = createClient();

    try {
      const now = new Date().toISOString();
      const { error } = await (supabase as any)
        .from("shop_brand_payouts")
        .insert({
          brand_id: selectedBrand.brand_id,
          period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          period_end: now,
          gross_sales: selectedBrand.gross_sales,
          our_commission: selectedBrand.our_commission,
          affiliate_commission: selectedBrand.affiliate_commission,
          net_payout: selectedBrand.net_payout,
          order_item_ids: selectedBrand.item_ids,
          order_count: selectedBrand.order_count,
          status: "paid",
          paid_at: now,
          payment_method: paymentMethod,
          payment_reference: paymentReference || null,
        });

      if (error) throw error;

      toast.success(
        `Payout of ${formatPrice(selectedBrand.net_payout)} recorded for ${selectedBrand.brand_name}`
      );
      setPayoutDialogOpen(false);
      fetchData();
    } catch (err: any) {
      console.error("Create payout error:", err);
      toast.error(err.message || "Failed to create payout");
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500";
      case "processing": return "bg-blue-500";
      case "pending": return "bg-amber-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const totalOwed = brandsOwed.reduce((sum, b) => sum + b.net_payout, 0);
  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.net_payout, 0);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/shop"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop Admin
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <DollarSign className="h-7 w-7 text-green-500" />
          Brand Payouts
        </h1>
        <p className="text-muted-foreground">
          Track and process payments owed to brands from completed orders
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-amber-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Owed</p>
                <p className="text-2xl font-bold text-amber-500">{formatPrice(totalOwed)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Brands to Pay</p>
                <p className="text-2xl font-bold">{brandsOwed.length}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500/30">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-muted-foreground">Total Paid Out</p>
                <p className="text-2xl font-bold text-green-500">{formatPrice(totalPaid)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Unpaid Balances */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Unpaid Balance
            </h2>
            {brandsOwed.length === 0 ? (
              <Card>
                <CardContent className="p-10 text-center">
                  <Check className="h-10 w-10 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">All brands are paid up</p>
                  <p className="text-sm text-muted-foreground mt-1">No outstanding balances</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {brandsOwed.map((brand) => (
                  <Card key={brand.brand_id} className="hover:border-amber-500/30 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Store className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold">{brand.brand_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {brand.payout_email || brand.brand_email}
                            </p>
                          </div>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Gross Sales</p>
                            <p className="font-medium">{formatPrice(brand.gross_sales)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">EXA ({brand.commission_rate}%)</p>
                            <p className="font-medium">−{formatPrice(brand.our_commission)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Models ({brand.model_commission_rate}%)</p>
                            <p className="font-medium">−{formatPrice(brand.affiliate_commission)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">{brand.order_count} orders</p>
                            <p className="text-lg font-bold text-green-500">{formatPrice(brand.net_payout)}</p>
                          </div>
                          <Button size="sm" onClick={() => openPayoutDialog(brand)}>
                            Mark Paid
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Payout History */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Payout History
            </h2>
            {payouts.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">No payouts recorded yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {payouts.map((payout) => (
                  <Card key={payout.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                            <Store className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{payout.brand?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(payout.period_start)} – {formatDate(payout.period_end)}
                              {payout.payment_method && ` · ${payout.payment_method}`}
                              {payout.payment_reference && ` · ref: ${payout.payment_reference}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs text-muted-foreground">{payout.order_count} orders</p>
                            <p className="text-xs text-muted-foreground">Gross: {formatPrice(payout.gross_sales)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-500">{formatPrice(payout.net_payout)}</p>
                            {payout.paid_at && (
                              <p className="text-xs text-muted-foreground">{formatDate(payout.paid_at)}</p>
                            )}
                          </div>
                          <Badge className={getStatusColor(payout.status)}>{payout.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Record Payout Dialog */}
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payout — {selectedBrand?.brand_name}</DialogTitle>
          </DialogHeader>
          {selectedBrand && (
            <div className="space-y-4 py-2">
              {/* Breakdown */}
              <div className="rounded-lg bg-muted p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Sales</span>
                  <span>{formatPrice(selectedBrand.gross_sales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    EXA Commission ({selectedBrand.commission_rate}%)
                  </span>
                  <span>−{formatPrice(selectedBrand.our_commission)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Model Commissions ({selectedBrand.model_commission_rate}%)
                  </span>
                  <span>−{formatPrice(selectedBrand.affiliate_commission)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Net Payout</span>
                  <span className="text-green-500">{formatPrice(selectedBrand.net_payout)}</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Send to: {selectedBrand.payout_email || selectedBrand.brand_email}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Reference / Transaction ID (optional)</label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. PAY-1234567890"
                />
              </div>

              <Button onClick={createPayout} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirm Payout of {formatPrice(selectedBrand.net_payout)}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
