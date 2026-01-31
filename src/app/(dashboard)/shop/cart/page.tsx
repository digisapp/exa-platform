"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
  ShoppingBag,
  ArrowLeft,
  Loader2,
  Trash2,
  Tag,
  AlertCircle,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  variantId: string;
  sku: string;
  size: string;
  color: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
  inStock: boolean;
  stockAvailable: number;
  image: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    brand: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

interface Cart {
  id: string;
  affiliateCode: string | null;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export default function CartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const cancelled = searchParams.get("cancelled") === "true";

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const sessionId = localStorage.getItem("shop_session_id");
      const response = await fetch("/api/shop/cart", {
        headers: sessionId ? { "x-session-id": sessionId } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setCart({
          id: data.cart?.id,
          affiliateCode: data.cart?.affiliateCode,
          items: data.items || [],
          subtotal: data.subtotal || 0,
          itemCount: data.itemCount || 0,
        });
      }
    } catch (error) {
      console.error("Failed to fetch cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId: string, newQuantity: number) => {
    setUpdating(itemId);
    try {
      const sessionId = localStorage.getItem("shop_session_id");
      const response = await fetch("/api/shop/cart", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        body: JSON.stringify({ itemId, quantity: newQuantity }),
      });

      if (response.ok) {
        await fetchCart();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update quantity");
      }
    } catch (error) {
      console.error("Update quantity error:", error);
      toast.error("Failed to update quantity");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdating(itemId);
    try {
      const sessionId = localStorage.getItem("shop_session_id");
      const response = await fetch(`/api/shop/cart?itemId=${itemId}`, {
        method: "DELETE",
        headers: sessionId ? { "x-session-id": sessionId } : {},
      });

      if (response.ok) {
        await fetchCart();
        toast.success("Item removed from cart");
      } else {
        toast.error("Failed to remove item");
      }
    } catch (error) {
      console.error("Remove item error:", error);
      toast.error("Failed to remove item");
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = () => {
    if (!cart?.items?.length) return;
    router.push("/shop/checkout");
  };

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

  const hasItems = cart?.items && cart.items.length > 0;
  const hasStockIssues = cart?.items?.some((item) => !item.inStock);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Continue Shopping
      </Link>

      {/* Cancelled Order Notice */}
      {cancelled && (
        <Card className="mb-6 border-amber-500/50 bg-amber-500/10">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm">Your checkout was cancelled. Your cart items are still here.</p>
          </CardContent>
        </Card>
      )}

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <ShoppingCart className="h-7 w-7" />
        Your Cart
        {hasItems && (
          <Badge variant="secondary">{cart.itemCount} item{cart.itemCount !== 1 ? "s" : ""}</Badge>
        )}
      </h1>

      {!hasItems ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Discover amazing swimwear from 50+ designer brands
            </p>
            <Link href="/shop">
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Start Shopping
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-4">
            {cart.items.map((item) => (
              <Card key={item.id} className={!item.inStock ? "border-red-500/50" : ""}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <Link href={`/shop/products/${item.product.id}`} className="flex-shrink-0">
                      <div className="relative w-24 h-32 rounded-lg overflow-hidden bg-muted">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {item.product.brand.name}
                          </p>
                          <Link href={`/shop/products/${item.product.id}`}>
                            <h3 className="font-medium hover:text-pink-500 transition-colors line-clamp-1">
                              {item.product.name}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Size: {item.size}
                            {item.color && ` / ${item.color}`}
                          </p>
                        </div>
                        <p className="font-bold text-pink-500 whitespace-nowrap">
                          {formatPrice(item.lineTotal)}
                        </p>
                      </div>

                      {/* Stock Warning */}
                      {!item.inStock && (
                        <Badge variant="destructive" className="mt-2">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Out of Stock
                        </Badge>
                      )}

                      {/* Quantity & Remove */}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={item.quantity.toString()}
                            onValueChange={(v) => updateQuantity(item.id, parseInt(v))}
                            disabled={updating === item.id}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: Math.min(item.stockAvailable, 10) }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                  {n}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-muted-foreground">
                            × {formatPrice(item.price)}
                          </span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={updating === item.id}
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        >
                          {updating === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Promo Code */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Button variant="outline" size="icon">
                    <Tag className="h-4 w-4" />
                  </Button>
                </div>

                {cart.affiliateCode && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <Tag className="h-4 w-4" />
                    Code applied: {cart.affiliateCode}
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-green-500">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-muted-foreground">Calculated at checkout</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-pink-500">{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  onClick={handleCheckout}
                  disabled={hasStockIssues}
                >
                  {hasStockIssues ? (
                    "Remove out of stock items"
                  ) : (
                    <>
                      Checkout
                      <ShoppingBag className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Secure checkout powered by Stripe
                </p>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                <p>• Free shipping on all orders</p>
                <p>• Store credit only for returns (EXA shipping errors)</p>
                <p>• Items ship directly from brands</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
