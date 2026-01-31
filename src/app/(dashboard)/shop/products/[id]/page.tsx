"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Check,
  Truck,
  Globe,
  Star,
  Share2,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

interface ProductVariant {
  id: string;
  sku: string;
  stock: number;
  lowStock: boolean;
  price: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  isFeatured: boolean;
  totalSold: number;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    description: string | null;
    shipsInternationally: boolean;
    avgShipDays: number;
  };
  category: { id: string; name: string; slug: string } | null;
  inStock: boolean;
  totalStock: number;
  sizes: string[];
  colors: { name: string; hex: string; image?: string }[];
  variants: Record<string, ProductVariant>;
}

interface WornByModel {
  model: {
    id: string;
    name: string;
    username: string;
    photo: string | null;
  };
  event: string | null;
  photos: string[];
  isFavorite: boolean;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [wornBy, setWornBy] = useState<WornByModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const response = await fetch(`/api/shop/products/${productId}`);
        if (response.ok) {
          const data = await response.json();
          setProduct(data.product);
          setWornBy(data.wornBy || []);

          // Set default selections
          if (data.product.sizes?.length > 0) {
            setSelectedSize(data.product.sizes[0]);
          }
          if (data.product.colors?.length > 0) {
            setSelectedColor(data.product.colors[0].name);
          }
        } else {
          toast.error("Product not found");
          router.push("/shop");
        }
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [productId, router]);

  const getSelectedVariant = (): ProductVariant | null => {
    if (!product || !selectedSize) return null;
    const key = `${selectedSize}-${selectedColor || "default"}`;
    return product.variants[key] || null;
  };

  const variant = getSelectedVariant();
  const currentPrice = variant?.price || product?.price || 0;
  const inStock = variant ? variant.stock > 0 : product?.inStock ?? false;

  const handleAddToCart = async () => {
    if (!variant) {
      toast.error("Please select a size");
      return;
    }

    if (!inStock) {
      toast.error("This item is out of stock");
      return;
    }

    setAddingToCart(true);
    try {
      // Get or create session ID for guest carts
      let sessionId = localStorage.getItem("shop_session_id");
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem("shop_session_id", sessionId);
      }

      // Get affiliate code if stored
      const affiliateCode = localStorage.getItem("shop_affiliate_code");

      const response = await fetch("/api/shop/cart", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-session-id": sessionId,
        },
        body: JSON.stringify({
          variantId: variant.id,
          quantity,
          affiliateCode: affiliateCode || undefined,
        }),
      });

      if (response.ok) {
        toast.success("Added to cart!", {
          action: {
            label: "View Cart",
            onClick: () => router.push("/shop/cart"),
          },
        });
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      toast.error("Failed to add to cart");
    } finally {
      setAddingToCart(false);
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

  if (!product) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Images */}
        <div className="space-y-4">
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted">
            {product.images?.[selectedImageIndex] ? (
              <Image
                src={product.images[selectedImageIndex]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <ShoppingBag className="h-20 w-20 text-muted-foreground" />
              </div>
            )}

            {product.isFeatured && (
              <Badge className="absolute top-4 left-4 bg-pink-500">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>

          {/* Thumbnails */}
          {product.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {product.images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                    selectedImageIndex === index
                      ? "border-pink-500"
                      : "border-transparent hover:border-muted-foreground"
                  }`}
                >
                  <Image src={img} alt="" fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            {product.brand.logoUrl && (
              <Image
                src={product.brand.logoUrl}
                alt={product.brand.name}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <div>
              <Link href={`/shop?brand=${product.brand.id}`} className="text-sm text-muted-foreground hover:text-foreground">
                {product.brand.name}
              </Link>
            </div>
          </div>

          {/* Title & Price */}
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-pink-500">
                {formatPrice(currentPrice)}
              </span>
              {product.compareAtPrice && product.compareAtPrice > currentPrice && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                  <Badge className="bg-red-500">
                    {Math.round((1 - currentPrice / product.compareAtPrice) * 100)}% OFF
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}

          {/* Size Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const variantKey = `${size}-${selectedColor || "default"}`;
                const sizeVariant = product.variants[variantKey];
                const sizeInStock = sizeVariant ? sizeVariant.stock > 0 : true;

                return (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSize(size)}
                    disabled={!sizeInStock}
                    className={selectedSize === size ? "bg-pink-500 hover:bg-pink-600" : ""}
                  >
                    {size}
                    {!sizeInStock && " (Out)"}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          {product.colors.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Color: <span className="text-muted-foreground">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      selectedColor === color.name
                        ? "border-pink-500 ring-2 ring-pink-500/30"
                        : "border-border hover:border-muted-foreground"
                    }`}
                    style={{ backgroundColor: color.hex || "#ccc" }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Quantity</label>
            <Select value={quantity.toString()} onValueChange={(v) => setQuantity(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock Status */}
          {variant && (
            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-500">
                    {variant.lowStock ? `Only ${variant.stock} left!` : "In Stock"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-red-500">Out of Stock</span>
              )}
            </div>
          )}

          {/* Add to Cart */}
          <div className="flex gap-3">
            <Button
              size="lg"
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              onClick={handleAddToCart}
              disabled={!inStock || addingToCart || !selectedSize}
            >
              {addingToCart ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <ShoppingBag className="h-5 w-5 mr-2" />
              )}
              {!selectedSize ? "Select Size" : inStock ? "Add to Cart" : "Out of Stock"}
            </Button>
            <Button size="lg" variant="outline">
              <Heart className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>

          {/* Shipping Info */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    Ships in {product.brand.avgShipDays || 5} business days
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Shipped by {product.brand.name}
                  </p>
                </div>
              </div>
              {product.brand.shipsInternationally && (
                <div className="flex items-center gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">International shipping available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Worn By Models */}
      {wornBy.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-4">Worn by EXA Models</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wornBy.map((item, index) => (
              <Link key={index} href={`/@${item.model.username}`}>
                <Card className="overflow-hidden hover:border-pink-500/50 transition-colors">
                  <div className="relative aspect-square bg-muted">
                    {item.model.photo ? (
                      <Image
                        src={item.model.photo}
                        alt={item.model.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-4xl">
                        👤
                      </div>
                    )}
                    {item.isFavorite && (
                      <Badge className="absolute top-2 right-2 bg-pink-500">
                        <Heart className="h-3 w-3 mr-1" />
                        Favorite
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="font-medium text-sm">{item.model.name}</p>
                    <p className="text-xs text-muted-foreground">@{item.model.username}</p>
                    {item.event && (
                      <p className="text-xs text-pink-500 mt-1">{item.event}</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
