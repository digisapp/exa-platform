"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Truck,
  Search,
  Loader2,
  MapPin,
  Package,
  Mail,
  Phone,
  Eye,
  DollarSign,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  product_name: string;
  variant_sku: string;
  variant_size: string;
  variant_color: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  fulfillment_status: string;
  tracking_number: string | null;
  tracking_carrier: string | null;
  brand: { id: string; name: string };
}

interface Order {
  id: string;
  order_number: string;
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  shipping_address_line1: string;
  shipping_address_line2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string;
  shipping_country: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  payment_status: string;
  status: string;
  affiliate_code: string | null;
  affiliate_commission: number;
  created_at: string;
  paid_at: string | null;
  items?: OrderItem[];
  affiliate_model?: { id: string; first_name: string; last_name: string; username: string };
}

export default function AdminShopOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, paymentFilter]);

  const fetchOrders = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      let query = (supabase as any)
        .from("shop_orders")
        .select(`
          *,
          items:shop_order_items(
            *,
            brand:shop_brands(id, name)
          ),
          affiliate_model:models(id, first_name, last_name, username)
        `)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (paymentFilter !== "all") {
        query = query.eq("payment_status", paymentFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const supabase = createClient();

    try {
      const { error } = await (supabase as any)
        .from("shop_orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Order status updated");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to update order status");
    }
  };

  const updateItemFulfillment = async (itemId: string, fulfillmentStatus: string, trackingNumber?: string, trackingCarrier?: string) => {
    const supabase = createClient();

    try {
      const updateData: any = { fulfillment_status: fulfillmentStatus };
      if (trackingNumber) updateData.tracking_number = trackingNumber;
      if (trackingCarrier) updateData.tracking_carrier = trackingCarrier;
      if (fulfillmentStatus === "shipped") updateData.shipped_at = new Date().toISOString();
      if (fulfillmentStatus === "delivered") updateData.delivered_at = new Date().toISOString();

      const { error } = await (supabase as any)
        .from("shop_order_items")
        .update(updateData)
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Item updated");
      fetchOrders();
    } catch (error) {
      toast.error("Failed to update item");
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500";
      case "shipped": return "bg-blue-500";
      case "processing": return "bg-purple-500";
      case "confirmed": return "bg-cyan-500";
      case "pending": return "bg-amber-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500";
      case "pending": return "bg-amber-500";
      case "failed": return "bg-red-500";
      case "refunded": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const filteredOrders = orders.filter((order) => {
    const query = searchQuery.toLowerCase();
    return (
      order.order_number.toLowerCase().includes(query) ||
      order.customer_name.toLowerCase().includes(query) ||
      order.customer_email.toLowerCase().includes(query)
    );
  });

  const openDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
  };

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending" || o.status === "confirmed").length,
    shipped: orders.filter(o => o.status === "shipped").length,
    revenue: orders.filter(o => o.payment_status === "paid").reduce((sum, o) => sum + o.total, 0),
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
          <Truck className="h-7 w-7 text-amber-500" />
          Shop Orders
        </h1>
        <p className="text-muted-foreground">
          Manage all shop orders and fulfillment
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Shipped</p>
            <p className="text-2xl font-bold text-blue-500">{stats.shipped}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">Revenue</p>
            <p className="text-2xl font-bold text-green-500">{formatPrice(stats.revenue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
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
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try a different search term" : "Orders will appear here when customers make purchases"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:border-pink-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-mono font-bold">{order.order_number}</span>
                      <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                      <Badge className={getPaymentStatusColor(order.payment_status)}>{order.payment_status}</Badge>
                      {order.affiliate_code && (
                        <Badge variant="outline">Affiliate: {order.affiliate_code}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{order.customer_name}</span>
                      <span>{order.customer_email}</span>
                      <span>{formatDate(order.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span><strong>{order.items?.length || 0}</strong> items</span>
                      <span className="font-bold text-green-500">{formatPrice(order.total)}</span>
                      {order.affiliate_commission > 0 && (
                        <span className="text-pink-500">
                          Affiliate: {formatPrice(order.affiliate_commission)} to @{order.affiliate_model?.username}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(v) => updateOrderStatus(order.id, v)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => openDetails(order)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              {/* Customer Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Customer</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {selectedOrder.customer_email}
                    </p>
                    {selectedOrder.customer_phone && (
                      <p className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {selectedOrder.customer_phone}
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3 w-3 mt-1 text-muted-foreground" />
                      <div>
                        <p>{selectedOrder.shipping_address_line1}</p>
                        {selectedOrder.shipping_address_line2 && <p>{selectedOrder.shipping_address_line2}</p>}
                        <p>
                          {selectedOrder.shipping_city}, {selectedOrder.shipping_state} {selectedOrder.shipping_postal_code}
                        </p>
                        <p>{selectedOrder.shipping_country}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                        <div className="flex-1">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.brand?.name} • SKU: {item.variant_sku} • {item.variant_size}
                            {item.variant_color && ` / ${item.variant_color}`} • Qty: {item.quantity}
                          </p>
                          {item.tracking_number && (
                            <p className="text-sm text-blue-500 mt-1">
                              {item.tracking_carrier}: {item.tracking_number}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(item.fulfillment_status)}>
                            {item.fulfillment_status}
                          </Badge>
                          <span className="font-medium">{formatPrice(item.line_total)}</span>
                          <Select
                            value={item.fulfillment_status}
                            onValueChange={(v) => updateItemFulfillment(item.id, v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="shipped">Shipped</SelectItem>
                              <SelectItem value="delivered">Delivered</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Order Totals */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>{formatPrice(selectedOrder.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax</span>
                      <span>{formatPrice(selectedOrder.tax_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-bold">
                      <span>Total</span>
                      <span className="text-green-500">{formatPrice(selectedOrder.total)}</span>
                    </div>
                    {selectedOrder.affiliate_commission > 0 && (
                      <div className="flex justify-between pt-2 border-t text-pink-500">
                        <span>Affiliate Commission (@{selectedOrder.affiliate_model?.username})</span>
                        <span>{formatPrice(selectedOrder.affiliate_commission)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
