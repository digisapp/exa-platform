"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Eye,
  AlertTriangle,
  Truck,
  ArrowRight,
  Loader2,
  
} from "lucide-react";

interface BrandStats {
  brand: {
    id: string;
    name: string;
    slug: string;
    commissionRate: number;
    status: string;
  } | null;
  stats: {
    products: {
      total: number;
      active: number;
      totalSold: number;
      totalViews: number;
    };
    inventory: {
      totalStock: number;
      lowStockCount: number;
      variantCount: number;
    };
    last30Days: {
      revenue: number;
      payout: number;
      orders: number;
      pending: number;
    };
    payouts: {
      pending: number;
    };
  } | null;
}

export default function BrandPortalPage() {
  const [data, setData] = useState<BrandStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/shop/brand/stats");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Failed to fetch brand stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!data?.brand) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Brand Portal</h1>
        <p className="text-muted-foreground mb-6">
          No shop brand account found. Contact EXA to set up your brand.
        </p>
        <Button asChild>
          <a href="mailto:support@examodels.com">Contact Support</a>
        </Button>
      </div>
    );
  }

  const { brand, stats } = data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold">{brand.name}</h1>
            <Badge className={brand.status === "active" ? "bg-green-500" : "bg-amber-500"}>
              {brand.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            EXA Shop Brand Portal • {brand.commissionRate}% platform fee
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/shop/brand/products">
            <Button variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Manage Products
            </Button>
          </Link>
          <Link href="/shop/brand/orders">
            <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              <Truck className="h-4 w-4 mr-2" />
              View Orders
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">30-Day Revenue</p>
                <p className="text-xl font-bold">{formatPrice(stats?.last30Days.revenue || 0)}</p>
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
                <p className="text-xs text-muted-foreground">30-Day Orders</p>
                <p className="text-xl font-bold">{stats?.last30Days.orders || 0}</p>
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
                <p className="text-xs text-muted-foreground">Total Sold</p>
                <p className="text-xl font-bold">{stats?.products.totalSold || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Eye className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Product Views</p>
                <p className="text-xl font-bold">{stats?.products.totalViews?.toLocaleString() || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/shop/brand/orders?status=pending" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">Pending Fulfillment</p>
                    <p className="text-sm text-muted-foreground">
                      {stats?.last30Days.pending || 0} items need shipping
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>

            {(stats?.inventory.lowStockCount || 0) > 0 && (
              <Link href="/shop/brand/products?filter=low-stock" className="block">
                <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium">Low Stock Alert</p>
                      <p className="text-sm text-muted-foreground">
                        {stats?.inventory.lowStockCount} variants need restocking
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            <Link href="/shop/brand/products/new" className="block">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Add New Product</p>
                    <p className="text-sm text-muted-foreground">
                      List a new item on EXA Shop
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          </CardContent>
        </Card>

        {/* Inventory Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Active Products</span>
                <span className="font-bold">{stats?.products.active || 0} / {stats?.products.total || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Variants</span>
                <span className="font-bold">{stats?.inventory.variantCount || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Stock</span>
                <span className="font-bold">{stats?.inventory.totalStock?.toLocaleString() || 0} units</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Low Stock Items</span>
                <span className={`font-bold ${(stats?.inventory.lowStockCount || 0) > 0 ? "text-red-500" : "text-green-500"}`}>
                  {stats?.inventory.lowStockCount || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payout Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payout Information
            </CardTitle>
            <CardDescription>
              Your earnings after platform and affiliate commissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">30-Day Gross Sales</p>
                <p className="text-2xl font-bold">{formatPrice(stats?.last30Days.revenue || 0)}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Your Payout (est)</p>
                <p className="text-2xl font-bold text-green-500">{formatPrice(stats?.last30Days.payout || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">After {brand.commissionRate}% platform fee</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground mb-1">Pending Payout</p>
                <p className="text-2xl font-bold text-amber-500">{formatPrice(stats?.payouts.pending || 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Processed bi-weekly</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
