"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ShoppingBag,
  Package,
  Store,
  Truck,
  DollarSign,
  TrendingUp,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ShopStats {
  brands: { total: number; active: number };
  products: { total: number; active: number; lowStock: number };
  orders: { total: number; pending: number; shipped: number; revenue: number };
  affiliates: { total: number; earnings: number };
}

export default function AdminShopPage() {
  const [stats, setStats] = useState<ShopStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const supabase = createClient();

      try {
        // Fetch all stats in parallel
        const [
          brandsResult,
          activeBrandsResult,
          productsResult,
          activeProductsResult,
          lowStockResult,
          ordersResult,
          pendingOrdersResult,
          shippedOrdersResult,
          revenueResult,
          affiliatesResult,
          earningsResult,
        ] = await Promise.all([
          (supabase as any).from("shop_brands").select("*", { count: "exact", head: true }),
          (supabase as any).from("shop_brands").select("*", { count: "exact", head: true }).eq("status", "active"),
          (supabase as any).from("shop_products").select("*", { count: "exact", head: true }),
          (supabase as any).from("shop_products").select("*", { count: "exact", head: true }).eq("is_active", true),
          (supabase as any).from("shop_product_variants").select("*", { count: "exact", head: true }).lt("stock_quantity", 5),
          (supabase as any).from("shop_orders").select("*", { count: "exact", head: true }),
          (supabase as any).from("shop_orders").select("*", { count: "exact", head: true }).in("status", ["pending", "confirmed"]),
          (supabase as any).from("shop_orders").select("*", { count: "exact", head: true }).eq("status", "shipped"),
          (supabase as any).from("shop_orders").select("total").eq("payment_status", "paid"),
          (supabase as any).from("shop_affiliate_codes").select("*", { count: "exact", head: true }),
          (supabase as any).from("shop_affiliate_earnings").select("commission_amount"),
        ]);

        const totalRevenue = revenueResult.data?.reduce((sum: number, o: any) => sum + (o.total || 0), 0) || 0;
        const totalEarnings = earningsResult.data?.reduce((sum: number, e: any) => sum + (e.commission_amount || 0), 0) || 0;

        setStats({
          brands: {
            total: brandsResult.count || 0,
            active: activeBrandsResult.count || 0,
          },
          products: {
            total: productsResult.count || 0,
            active: activeProductsResult.count || 0,
            lowStock: lowStockResult.count || 0,
          },
          orders: {
            total: ordersResult.count || 0,
            pending: pendingOrdersResult.count || 0,
            shipped: shippedOrdersResult.count || 0,
            revenue: totalRevenue,
          },
          affiliates: {
            total: affiliatesResult.count || 0,
            earnings: totalEarnings,
          },
        });
      } catch (error) {
        console.error("Failed to fetch shop stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-pink-500" />
            Shop Admin
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage EXA Swim Shop brands, products, and orders
          </p>
        </div>
        <Link href="/shop" target="_blank">
          <Button variant="outline" className="gap-2">
            <Store className="h-4 w-4" />
            View Shop
          </Button>
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Store className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Brands</p>
                <p className="text-xl font-bold">{stats?.brands.active} / {stats?.brands.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Package className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{stats?.products.active} / {stats?.products.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats?.orders.revenue || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <Truck className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-bold">{stats?.orders.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/shop/brands">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-blue-500" />
                Manage Brands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Add, edit, and manage swimwear brands. Configure commission rates and payout settings.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>{stats?.brands.active}</strong> active brands
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shop/products">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-purple-500" />
                Manage Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Add products, manage variants, update inventory, and set pricing.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>{stats?.products.lowStock}</strong> low stock items
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shop/orders">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-500" />
                Manage Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View all orders, track fulfillment, and manage returns.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>{stats?.orders.pending}</strong> need attention
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shop/affiliates">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" />
                Model Affiliates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View model affiliate codes, earnings, and performance metrics.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  <strong>{formatPrice(stats?.affiliates.earnings || 0)}</strong> total earnings
                </span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shop/payouts">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Brand Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Process brand payouts and view payout history.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">Manage payouts</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shop/analytics">
          <Card className="hover:border-pink-500/50 transition-all cursor-pointer group">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-cyan-500" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View sales trends, top products, and brand performance.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm">View reports</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
