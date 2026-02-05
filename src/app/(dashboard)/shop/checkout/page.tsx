"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  CreditCard,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  size: string;
  color: string | null;
  quantity: number;
  price: number;
  lineTotal: number;
  image: string | null;
  product: {
    name: string;
    brand: { name: string };
  };
}

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<{ items: CartItem[]; subtotal: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const fetchCart = useCallback(async () => {
    try {
      const sessionId = localStorage.getItem("shop_session_id");
      const response = await fetch("/api/shop/cart", {
        headers: sessionId ? { "x-session-id": sessionId } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.items?.length) {
          router.push("/shop/cart");
          return;
        }
        setCart({
          items: data.items,
          subtotal: data.subtotal,
        });
      }
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      router.push("/shop/cart");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!email || !name || !address1 || !city || !state || !postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const sessionId = localStorage.getItem("shop_session_id");
      const response = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {}),
        },
        body: JSON.stringify({
          email,
          name,
          phone: phone || undefined,
          shippingAddress: {
            line1: address1,
            line2: address2 || undefined,
            city,
            state,
            postalCode,
            country: "US",
          },
          billingSameAsShipping: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Redirect to Stripe checkout
        if (data.url) {
          window.location.href = data.url;
        }
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to proceed to checkout");
    } finally {
      setSubmitting(false);
    }
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

  if (!cart?.items?.length) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <Link href="/shop/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Cart
      </Link>

      <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
        <CreditCard className="h-7 w-7" />
        Checkout
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="grid md:grid-cols-5 gap-6">
          {/* Shipping Form */}
          <div className="md:col-span-3 space-y-6">
            {/* Contact */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 555-5555"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address1">Address *</Label>
                  <Input
                    id="address1"
                    placeholder="123 Main St"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address2">Apartment, suite, etc.</Label>
                  <Input
                    id="address2"
                    placeholder="Apt 4B"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input
                      id="city"
                      placeholder="Miami"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State *</Label>
                    <Select value={state} onValueChange={setState}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="w-1/2">
                  <Label htmlFor="postalCode">ZIP Code *</Label>
                  <Input
                    id="postalCode"
                    placeholder="33139"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.product.name}
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
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.product.brand.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.size}{item.color && ` / ${item.color}`} × {item.quantity}
                        </p>
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
                    <span>{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-green-500">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-muted-foreground">Calculated next</span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Estimated Total</span>
                    <span className="text-pink-500">{formatPrice(cart.subtotal)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  {submitting ? "Processing..." : "Continue to Payment"}
                </Button>

                <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                  <Lock className="h-3 w-3" />
                  Secure checkout powered by Stripe
                </p>
              </CardContent>
            </Card>

            {/* Policies */}
            <Card>
              <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
                <p className="font-medium text-foreground">Shop Policies</p>
                <p>• Items ship directly from brands (3-7 business days)</p>
                <p>• Store credit only for returns due to EXA errors</p>
                <p>• Contact support@examodels.com for issues</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
