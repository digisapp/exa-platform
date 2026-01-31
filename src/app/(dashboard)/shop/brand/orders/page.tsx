"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  Truck,
  Package,
  Check,
  MapPin,
  Clock,
  Search,
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  productName: string;
  sku: string;
  size: string;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  fulfillmentStatus: string;
  shippedAt: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
}

interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    email: string;
  };
  shippingAddress: {
    line1: string;
    line2: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  status: string;
  paymentStatus: string;
  paidAt: string;
  items: OrderItem[];
  totalRevenue: number;
}

export default function BrandOrdersPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Tracking modal state
  const [selectedItem, setSelectedItem] = useState<OrderItem | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("USPS");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);

      const response = await fetch(`/api/shop/brand/orders?${params}`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateTracking = async () => {
    if (!selectedItem || !trackingNumber) {
      toast.error("Please enter tracking number");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/shop/brand/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          trackingNumber,
          trackingCarrier,
          fulfillmentStatus: "shipped",
        }),
      });

      if (response.ok) {
        toast.success("Tracking info added and item marked as shipped!");
        setSelectedItem(null);
        setTrackingNumber("");
        fetchOrders();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update");
      }
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const markDelivered = async (itemId: string) => {
    try {
      const response = await fetch("/api/shop/brand/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId,
          fulfillmentStatus: "delivered",
        }),
      });

      if (response.ok) {
        toast.success("Marked as delivered");
        fetchOrders();
      }
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-green-500";
      case "shipped":
        return "bg-blue-500";
      case "confirmed":
        return "bg-amber-500";
      case "pending":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      order.orderNumber.toLowerCase().includes(query) ||
      order.customer.name.toLowerCase().includes(query) ||
      order.customer.email.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link href="/shop/brand" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <Truck className="h-7 w-7" />
          Orders
        </h1>

        <div className="flex gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-[200px]"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              const url = new URL(window.location.href);
              if (v) {
                url.searchParams.set("status", v);
              } else {
                url.searchParams.delete("status");
              }
              window.history.pushState({}, "", url);
              fetchOrders();
            }}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Shipped</p>
              <p className="text-2xl font-bold text-blue-500">{stats.shipped}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-muted-foreground">Total Items</p>
              <p className="text-2xl font-bold">{stats.totalItems}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-2">No orders found</h2>
            <p className="text-muted-foreground">
              {statusFilter
                ? `No orders with status "${statusFilter}"`
                : "Orders will appear here when customers purchase your products"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {order.customer.name} • {formatDate(order.paidAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPrice(order.totalRevenue)}</p>
                    <p className="text-sm text-muted-foreground">{order.items.length} item(s)</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Shipping Address */}
                <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-muted">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">{order.customer.name}</p>
                    <p className="text-muted-foreground">
                      {order.shippingAddress.line1}
                      {order.shippingAddress.line2 && `, ${order.shippingAddress.line2}`}
                    </p>
                    <p className="text-muted-foreground">
                      {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                    </p>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          SKU: {item.sku} • Size: {item.size}
                          {item.color && ` • ${item.color}`} • Qty: {item.quantity}
                        </p>
                        {item.trackingNumber && (
                          <p className="text-sm text-blue-500 mt-1">
                            {item.trackingCarrier}: {item.trackingNumber}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(item.fulfillmentStatus)}>
                          {item.fulfillmentStatus}
                        </Badge>

                        {item.fulfillmentStatus === "pending" || item.fulfillmentStatus === "confirmed" ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setTrackingNumber(item.trackingNumber || "");
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Ship
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Tracking Information</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className="text-sm font-medium">Carrier</label>
                                  <Select value={trackingCarrier} onValueChange={setTrackingCarrier}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="USPS">USPS</SelectItem>
                                      <SelectItem value="UPS">UPS</SelectItem>
                                      <SelectItem value="FedEx">FedEx</SelectItem>
                                      <SelectItem value="DHL">DHL</SelectItem>
                                      <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <label className="text-sm font-medium">Tracking Number</label>
                                  <Input
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter tracking number"
                                  />
                                </div>
                                <Button
                                  className="w-full"
                                  onClick={updateTracking}
                                  disabled={saving}
                                >
                                  {saving ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                  )}
                                  Mark as Shipped
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : item.fulfillmentStatus === "shipped" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markDelivered(item.id)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Delivered
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
