"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Store,
  Loader2,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";

interface RevenueDay {
  date: string;
  revenue: number;
  orders: number;
}

interface TopProduct {
  name: string;
  brand: string;
  totalSold: number;
  revenue: number;
}

interface BrandRevenue {
  name: string;
  revenue: number;
  orders: number;
  exaCut: number;
}

interface TopAffiliate {
  username: string;
  orders: number;
  earnings: number;
}

interface Analytics {
  revenue: RevenueDay[];
  topProducts: TopProduct[];
  brandRevenue: BrandRevenue[];
  topAffiliates: TopAffiliate[];
  kpis: {
    totalRevenue: number;
    totalOrders: number;
    avgOrderValue: number;
    totalAffiliateCommissions: number;
  };
}

const COLORS = ["#ec4899", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminShopAnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  const formatPrice = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchAnalytics = useCallback(async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      const daysAgo = parseInt(period);
      const since = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

      // Fetch paid orders in range
      const { data: orders } = await (supabase as any)
        .from("shop_orders")
        .select(`
          id,
          total,
          affiliate_commission,
          created_at,
          items:shop_order_items(
            line_total,
            product_name,
            brand:shop_brands(id, name, commission_rate)
          )
        `)
        .eq("payment_status", "paid")
        .gte("created_at", since)
        .order("created_at", { ascending: true });

      // Fetch top products by total_sold
      const { data: products } = await (supabase as any)
        .from("shop_products")
        .select(`
          name,
          total_sold,
          retail_price,
          brand:shop_brands(name)
        `)
        .gt("total_sold", 0)
        .order("total_sold", { ascending: false })
        .limit(8);

      // Fetch top affiliates
      const { data: affiliateCodes } = await (supabase as any)
        .from("shop_affiliate_codes")
        .select(`
          order_count,
          total_earnings,
          model:models(username)
        `)
        .gt("order_count", 0)
        .order("total_earnings", { ascending: false })
        .limit(5);

      // Build revenue by day
      const dayMap = new Map<string, RevenueDay>();
      // Pre-fill all days in range
      for (let i = daysAgo - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dayMap.set(key, { date: key, revenue: 0, orders: 0 });
      }
      (orders || []).forEach((o: any) => {
        const key = new Date(o.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const existing = dayMap.get(key);
        if (existing) {
          existing.revenue += o.total;
          existing.orders += 1;
        }
      });

      // Build brand revenue map
      const brandMap = new Map<string, BrandRevenue>();
      (orders || []).forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
          const b = item.brand;
          if (!b) return;
          const existing = brandMap.get(b.id) ?? {
            name: b.name,
            revenue: 0,
            orders: 0,
            exaCut: 0,
          };
          existing.revenue += item.line_total;
          existing.exaCut += Math.round(item.line_total * (b.commission_rate || 30) / 100);
          existing.orders += 1;
          brandMap.set(b.id, existing);
        });
      });

      const paidOrders = orders || [];
      const totalRevenue = paidOrders.reduce((s: number, o: any) => s + o.total, 0);
      const totalOrders = paidOrders.length;
      const totalAffiliateCommissions = paidOrders.reduce((s: number, o: any) => s + (o.affiliate_commission || 0), 0);

      setAnalytics({
        revenue: Array.from(dayMap.values()),
        topProducts: (products || []).map((p: any) => ({
          name: p.name,
          brand: p.brand?.name || "",
          totalSold: p.total_sold,
          revenue: p.retail_price * p.total_sold,
        })),
        brandRevenue: Array.from(brandMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
        topAffiliates: (affiliateCodes || []).map((a: any) => ({
          username: a.model?.username || "unknown",
          orders: a.order_count,
          earnings: a.total_earnings,
        })),
        kpis: {
          totalRevenue,
          totalOrders,
          avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
          totalAffiliateCommissions,
        },
      });
    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/shop"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop Admin
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-cyan-500" />
            Shop Analytics
          </h1>
          <p className="text-muted-foreground">Sales trends, top products, and brand performance</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : analytics ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-green-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold">{formatPrice(analytics.kpis.totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20">
                    <ShoppingBag className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Orders</p>
                    <p className="text-xl font-bold">{analytics.kpis.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20">
                    <TrendingUp className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Order Value</p>
                    <p className="text-xl font-bold">{formatPrice(analytics.kpis.avgOrderValue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-pink-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/20">
                    <Users className="h-5 w-5 text-pink-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Affiliate Commissions</p>
                    <p className="text-xl font-bold">{formatPrice(analytics.kpis.totalAffiliateCommissions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-500" />
                Revenue Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.kpis.totalOrders === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No orders in this period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analytics.revenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: "#888" }}
                      interval={period === "7" ? 0 : period === "30" ? 4 : 9}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#888" }}
                      tickFormatter={(v) => `$${(v / 100).toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(v: number | undefined) => [formatPrice(v ?? 0), "Revenue"]}
                      contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                      labelStyle={{ color: "#aaa" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#ec4899"
                      strokeWidth={2}
                      fill="url(#revenueGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Top Products */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-purple-500" />
                  Top Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topProducts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No sales yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.brand}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold">{formatPrice(p.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{p.totalSold} sold</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Brand Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-blue-500" />
                  Revenue by Brand
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.brandRevenue.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">No sales yet</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.brandRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#888" }} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                      <Tooltip
                        formatter={(v: number | undefined) => [formatPrice(v ?? 0), "Revenue"]}
                        contentStyle={{ background: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
                        labelStyle={{ color: "#aaa" }}
                      />
                      <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                        {analytics.brandRevenue.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Affiliates */}
          {analytics.topAffiliates.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-pink-500" />
                  Top Affiliates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.topAffiliates.map((a, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}</span>
                      <p className="flex-1 text-sm font-medium">@{a.username}</p>
                      <p className="text-sm text-muted-foreground">{a.orders} orders</p>
                      <p className="text-sm font-bold text-green-500">{formatPrice(a.earnings)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Failed to load analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
