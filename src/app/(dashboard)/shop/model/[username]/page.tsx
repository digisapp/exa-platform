"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag,
  Heart,
  ArrowLeft,
  Loader2,
  Star,
  Instagram,
  Tag,
  Sparkles,
  ExternalLink,
} from "lucide-react";


interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  totalSold: number;
  brand: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  };
  inStock: boolean;
  sizes: string[];
  colors: { name: string; hex: string }[];
  isFavorite: boolean;
  wornAtEvent: string | null;
  modelPhotos: string[];
}

interface ModelShopData {
  model: {
    id: string;
    username: string;
    name: string;
    fullName: string;
    photo: string | null;
    bio: string | null;
    instagram: string | null;
  };
  affiliateCode: string | null;
  discount: { type: string; value: number } | null;
  favorites: Product[];
  products: Product[];
  recommended: Product[];
  stats: {
    productCount: number;
    favoriteCount: number;
  };
}

export default function ModelStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [data, setData] = useState<ModelShopData | null>(null);
  const [loading, setLoading] = useState(true);
  const [affiliateApplied, setAffiliateApplied] = useState(false);

  useEffect(() => {
    async function fetchModelShop() {
      try {
        const response = await fetch(`/api/shop/model/${username}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);

          // Auto-apply affiliate code to session
          if (result.affiliateCode) {
            localStorage.setItem("shop_affiliate_code", result.affiliateCode);
            setAffiliateApplied(true);
          }
        } else {
          router.push("/shop");
        }
      } catch (error) {
        console.error("Failed to fetch model shop:", error);
        router.push("/shop");
      } finally {
        setLoading(false);
      }
    }

    fetchModelShop();
  }, [username, router]);

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDiscount = (discount: { type: string; value: number } | null) => {
    if (!discount) return null;
    if (discount.type === "percent") {
      return `${discount.value}% OFF`;
    }
    return `$${(discount.value / 100).toFixed(0)} OFF`;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { model, affiliateCode, discount, favorites, products, recommended, stats } = data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link href="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Back to Shop
      </Link>

      {/* Model Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-3xl" />
        <Card className="relative overflow-hidden border-pink-500/30">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Profile Photo */}
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-pink-500/50 shadow-lg shadow-pink-500/20">
                  {model.photo ? (
                    <Image
                      src={model.photo}
                      alt={model.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center text-4xl text-white font-bold">
                      {model.name?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-500">
                  <Sparkles className="h-3 w-3 mr-1" />
                  EXA Model
                </Badge>
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl md:text-3xl font-bold mb-1">{model.name}&apos;s Shop</h1>
                <p className="text-muted-foreground mb-3">@{model.username}</p>

                {model.bio && (
                  <p className="text-sm text-muted-foreground mb-4 max-w-md">
                    {model.bio}
                  </p>
                )}

                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {model.instagram && (
                    <a
                      href={`https://instagram.com/${model.instagram}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <Instagram className="h-4 w-4 mr-2" />
                        @{model.instagram}
                      </Button>
                    </a>
                  )}

                  <Link href={`/@${model.username}`}>
                    <Button variant="outline" size="sm">
                      View Full Profile
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Affiliate Banner */}
              {affiliateCode && (
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30">
                  <Tag className="h-6 w-6 mx-auto text-pink-500 mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Shop with {model.name}&apos;s code</p>
                  <p className="text-xl font-bold text-pink-500">{affiliateCode}</p>
                  {discount && (
                    <Badge className="mt-2 bg-green-500">{formatDiscount(discount)}</Badge>
                  )}
                  {affiliateApplied && (
                    <p className="text-xs text-green-500 mt-2">✓ Auto-applied at checkout</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-pink-500/10 to-transparent border-pink-500/20">
          <CardContent className="p-4 text-center">
            <Heart className="h-6 w-6 mx-auto text-pink-500 mb-2" />
            <p className="text-2xl font-bold">{stats.favoriteCount}</p>
            <p className="text-sm text-muted-foreground">{model.name}&apos;s Picks</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent border-purple-500/20">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-6 w-6 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold">{stats.productCount}</p>
            <p className="text-sm text-muted-foreground">Products Worn</p>
          </CardContent>
        </Card>
      </div>

      {/* Favorites Section */}
      {favorites.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {model.name}&apos;s Favorites
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {favorites.map((product) => (
              <ProductCard key={product.id} product={product} affiliateCode={affiliateCode} />
            ))}
          </div>
        </section>
      )}

      {/* All Products Section */}
      {products.length > favorites.length && (
        <section className="mb-12">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            All Products {model.name} Has Worn
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products
              .filter((p) => !p.isFavorite)
              .map((product) => (
                <ProductCard key={product.id} product={product} affiliateCode={affiliateCode} />
              ))}
          </div>
        </section>
      )}

      {/* Recommended Section */}
      {recommended.length > 0 && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            You Might Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommended.map((product: any) => (
              <Link key={product.id} href={`/shop/products/${product.id}${affiliateCode ? `?ref=${affiliateCode}` : ""}`}>
                <Card className="group overflow-hidden hover:border-pink-500/50 transition-all">
                  <div className="relative aspect-[3/4] bg-muted">
                    {product.images?.[0] ? (
                      <Image
                        src={product.images[0]}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{product.brand.name}</p>
                    <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
                    <p className="font-bold text-pink-500">{formatPrice(product.price)}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {products.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-medium mb-2">{model.name}&apos;s shop is coming soon!</h2>
            <p className="text-muted-foreground mb-6">
              Check back later for products worn by {model.name}
            </p>
            <Link href="/shop">
              <Button>Browse All Products</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  affiliateCode,
}: {
  product: Product;
  affiliateCode: string | null;
}) {
  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <Link href={`/shop/products/${product.id}${affiliateCode ? `?ref=${affiliateCode}` : ""}`}>
      <Card className="group overflow-hidden hover:border-pink-500/50 transition-all hover:shadow-lg hover:shadow-pink-500/10">
        <div className="relative aspect-[3/4] bg-muted">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {product.isFavorite && (
            <Badge className="absolute top-2 left-2 bg-pink-500">
              <Heart className="h-3 w-3 mr-1" />
              Fave
            </Badge>
          )}

          {!product.inStock && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary">Out of Stock</Badge>
            </div>
          )}

          {product.wornAtEvent && (
            <Badge className="absolute bottom-2 left-2 right-2 bg-black/70 text-xs justify-center">
              {product.wornAtEvent}
            </Badge>
          )}
        </div>

        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">{product.brand.name}</p>
          <h3 className="font-medium text-sm line-clamp-1">{product.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-pink-500">{formatPrice(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>

          {product.colors.length > 0 && (
            <div className="flex gap-1 mt-2">
              {product.colors.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  className="w-3 h-3 rounded-full border border-border"
                  style={{ backgroundColor: color.hex || "#ccc" }}
                />
              ))}
              {product.colors.length > 4 && (
                <span className="text-xs text-muted-foreground">+{product.colors.length - 4}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
