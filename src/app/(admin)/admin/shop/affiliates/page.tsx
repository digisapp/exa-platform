"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Search,
  Loader2,
  DollarSign,
  MousePointerClick,
  ShoppingBag,
  TrendingUp,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface AffiliateCode {
  id: string;
  code: string;
  discount_type: string | null;
  discount_value: number | null;
  click_count: number;
  order_count: number;
  total_earnings: number;
  is_active: boolean;
  created_at: string;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  };
}

interface AffiliateEarning {
  id: string;
  order_total: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  available_at: string | null;
  paid_at: string | null;
  created_at: string;
  order: {
    id: string;
    order_number: string;
    status: string;
  };
}

export default function AdminShopAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateCode | null>(null);
  const [earnings, setEarnings] = useState<AffiliateEarning[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchAffiliates();
  }, [statusFilter]);

  const fetchAffiliates = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      let query = (supabase as any)
        .from("shop_affiliate_codes")
        .select(`
          *,
          model:models(id, username, first_name, last_name, profile_photo_url)
        `)
        .order("total_earnings", { ascending: false });

      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      } else if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAffiliates(data || []);
    } catch (error) {
      console.error("Failed to fetch affiliates:", error);
      toast.error("Failed to load affiliates");
    } finally {
      setLoading(false);
    }
  };

  const fetchEarnings = async (modelId: string) => {
    const supabase = createClient();
    setEarningsLoading(true);

    try {
      const { data, error } = await (supabase as any)
        .from("shop_affiliate_earnings")
        .select(`
          *,
          order:shop_orders(id, order_number, status)
        `)
        .eq("model_id", modelId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setEarnings(data || []);
    } catch (error) {
      console.error("Failed to fetch earnings:", error);
    } finally {
      setEarningsLoading(false);
    }
  };

  const toggleAffiliateStatus = async (affiliate: AffiliateCode) => {
    const supabase = createClient();

    try {
      const { error } = await (supabase as any)
        .from("shop_affiliate_codes")
        .update({ is_active: !affiliate.is_active })
        .eq("id", affiliate.id);

      if (error) throw error;
      toast.success(affiliate.is_active ? "Affiliate deactivated" : "Affiliate activated");
      fetchAffiliates();
    } catch (error) {
      toast.error("Failed to update affiliate status");
    }
  };

  const openDetails = async (affiliate: AffiliateCode) => {
    setSelectedAffiliate(affiliate);
    setDetailsDialogOpen(true);
    fetchEarnings(affiliate.model.id);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500";
      case "confirmed": return "bg-blue-500";
      case "pending": return "bg-amber-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const filteredAffiliates = affiliates.filter((affiliate) => {
    const query = searchQuery.toLowerCase();
    return (
      affiliate.code.toLowerCase().includes(query) ||
      affiliate.model?.username?.toLowerCase().includes(query) ||
      `${affiliate.model?.first_name} ${affiliate.model?.last_name}`.toLowerCase().includes(query)
    );
  });

  // Calculate totals
  const totals = {
    affiliates: affiliates.length,
    activeAffiliates: affiliates.filter(a => a.is_active).length,
    totalClicks: affiliates.reduce((sum, a) => sum + a.click_count, 0),
    totalOrders: affiliates.reduce((sum, a) => sum + a.order_count, 0),
    totalEarnings: affiliates.reduce((sum, a) => sum + a.total_earnings, 0),
  };

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
          <Users className="h-7 w-7 text-pink-500" />
          Model Affiliates
        </h1>
        <p className="text-muted-foreground">
          Manage affiliate codes and track model earnings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Affiliates</p>
            <p className="text-xl font-bold">{totals.activeAffiliates}/{totals.affiliates}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Clicks</p>
            <p className="text-xl font-bold">{totals.totalClicks.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Orders</p>
            <p className="text-xl font-bold">{totals.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Conversion</p>
            <p className="text-xl font-bold">
              {totals.totalClicks > 0 ? ((totals.totalOrders / totals.totalClicks) * 100).toFixed(1) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Earnings</p>
            <p className="text-xl font-bold text-green-500">{formatPrice(totals.totalEarnings)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Affiliates List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredAffiliates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No affiliates found</h3>
            <p className="text-muted-foreground">
              Models can create affiliate codes from their dashboard
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAffiliates.map((affiliate) => (
            <Card key={affiliate.id} className="hover:border-pink-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Model Photo */}
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {affiliate.model?.profile_photo_url ? (
                      <Image
                        src={affiliate.model.profile_photo_url}
                        alt={affiliate.model.username}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    ) : (
                      <Users className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-pink-500">{affiliate.code}</span>
                      <Badge variant={affiliate.is_active ? "default" : "secondary"}>
                        {affiliate.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {affiliate.discount_type && (
                        <Badge variant="outline">
                          {affiliate.discount_type === "percent"
                            ? `${affiliate.discount_value}% off`
                            : `$${(affiliate.discount_value || 0) / 100} off`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      @{affiliate.model?.username} • {affiliate.model?.first_name} {affiliate.model?.last_name}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                        <MousePointerClick className="h-3 w-3" />
                        Clicks
                      </div>
                      <p className="font-bold">{affiliate.click_count.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                        <ShoppingBag className="h-3 w-3" />
                        Orders
                      </div>
                      <p className="font-bold">{affiliate.order_count}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                        <TrendingUp className="h-3 w-3" />
                        Conv.
                      </div>
                      <p className="font-bold">
                        {affiliate.click_count > 0
                          ? ((affiliate.order_count / affiliate.click_count) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
                        <DollarSign className="h-3 w-3" />
                        Earned
                      </div>
                      <p className="font-bold text-green-500">{formatPrice(affiliate.total_earnings)}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetails(affiliate)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={affiliate.is_active ? "destructive" : "default"}
                      size="sm"
                      onClick={() => toggleAffiliateStatus(affiliate)}
                    >
                      {affiliate.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Earnings Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Affiliate Details - {selectedAffiliate?.code}
            </DialogTitle>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-6 py-4">
              {/* Model Info */}
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {selectedAffiliate.model?.profile_photo_url ? (
                    <Image
                      src={selectedAffiliate.model.profile_photo_url}
                      alt={selectedAffiliate.model.username}
                      width={64}
                      height={64}
                      className="object-cover"
                    />
                  ) : (
                    <Users className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {selectedAffiliate.model?.first_name} {selectedAffiliate.model?.last_name}
                  </p>
                  <p className="text-muted-foreground">@{selectedAffiliate.model?.username}</p>
                  <Link
                    href={`/admin/models/${selectedAffiliate.model?.id}`}
                    className="text-sm text-pink-500 hover:underline"
                  >
                    View Profile →
                  </Link>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-lg font-bold">{selectedAffiliate.click_count.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Orders</p>
                    <p className="text-lg font-bold">{selectedAffiliate.order_count}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Conversion</p>
                    <p className="text-lg font-bold">
                      {selectedAffiliate.click_count > 0
                        ? ((selectedAffiliate.order_count / selectedAffiliate.click_count) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-green-500/30">
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">Earned</p>
                    <p className="text-lg font-bold text-green-500">{formatPrice(selectedAffiliate.total_earnings)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Earnings History */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Recent Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  {earningsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                    </div>
                  ) : earnings.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No earnings yet</p>
                  ) : (
                    <div className="space-y-2">
                      {earnings.map((earning) => (
                        <div
                          key={earning.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted"
                        >
                          <div>
                            <p className="font-medium">Order #{earning.order?.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(earning.created_at)} • {earning.commission_rate}% of {formatPrice(earning.order_total)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-500">
                              +{formatPrice(earning.commission_amount)}
                            </p>
                            <Badge className={getStatusColor(earning.status)}>
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
