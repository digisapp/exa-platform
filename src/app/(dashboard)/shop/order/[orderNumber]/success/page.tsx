"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  CheckCircle2,
  Loader2,
  Truck,
  Package,
  Mail,
  MapPin,
} from "lucide-react";

interface OrderItem {
  id: string;
  productName: string;
  size: string;
  color: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  image: string | null;
  brand: {
    name: string;
    avgShipDays: number;
  };
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
  totals: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
  };
  status: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderSuccessPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const response = await fetch(`/api/shop/orders/${orderNumber}`);
        if (response.ok) {
          const data = await response.json();
          setOrder(data.order);
        }
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderNumber]);

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

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find this order. Please check your order number.
        </p>
        <Link href="/shop">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-4">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Thank You for Your Order!</h1>
        <p className="text-muted-foreground">
          Your order <span className="font-medium text-foreground">{order.orderNumber}</span> has been confirmed
        </p>
      </div>

      {/* Confirmation Email Notice */}
      <Card className="mb-6 bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm">
            A confirmation email has been sent to <span className="font-medium">{order.customer.email}</span>
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Order Details */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative w-16 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.productName}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.brand.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.size}{item.color && ` / ${item.color}`} × {item.quantity}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Truck className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Ships in ~{item.brand.avgShipDays} days
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {formatPrice(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{order.totals.shipping === 0 ? "Free" : formatPrice(order.totals.shipping)}</span>
              </div>
              {order.totals.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(order.totals.tax)}</span>
                </div>
              )}
              {order.totals.discount > 0 && (
                <div className="flex justify-between text-sm text-green-500">
                  <span>Discount</span>
                  <span>-{formatPrice(order.totals.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t">
                <span>Total</span>
                <span className="text-pink-500">{formatPrice(order.totals.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping Info */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping To
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium">{order.customer.name}</p>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.line1}
              </p>
              {order.shippingAddress.line2 && (
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress.line2}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.shippingAddress.country}
              </p>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{order.status}</Badge>
                <Badge variant={order.paymentStatus === "paid" ? "default" : "secondary"} className={order.paymentStatus === "paid" ? "bg-green-500" : ""}>
                  {order.paymentStatus === "paid" ? "Paid" : order.paymentStatus}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Items will ship directly from each brand. You&apos;ll receive tracking info via email.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8 justify-center">
        <Link href="/shop/orders">
          <Button variant="outline" size="lg">
            View All Orders
          </Button>
        </Link>
        <Link href="/shop">
          <Button size="lg" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
