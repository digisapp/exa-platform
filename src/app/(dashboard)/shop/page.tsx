"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
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
  Search,
  Loader2,
  Star,
  ArrowRight,
  Tag,
} from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
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
  brand: Brand;
  category: { id: string; name: string; slug: string } | null;
  inStock: boolean;
  sizes: string[];
  colors: { name: string; hex: string }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  children: Category[];
}

export default function ShopPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const categoryFilter = searchParams.get("category") || "";
  const brandFilter = searchParams.get("brand") || "";
  const sortBy = searchParams.get("sort") || "newest";

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (categoryFilter) params.set("category", categoryFilter);
      if (brandFilter) params.set("brand_id", brandFilter);
      params.set("sort", sortBy);
      params.set("limit", "24");

      const response = await fetch(`/api/shop/products?${params}`);
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, brandFilter, sortBy]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    async function fetchFilters() {
      try {
        const [catRes, brandRes] = await Promise.all([
          fetch("/api/shop/categories"),
          fetch("/api/shop/brands"),
        ]);

        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories);
        }
        if (brandRes.ok) {
          const brandData = await brandRes.json();
          setBrands(brandData.brands);
        }
      } catch (error) {
        console.error("Failed to fetch filters:", error);
      }
    }
    fetchFilters();
  }, []);

  // Handle affiliate referral code from URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      localStorage.setItem("shop_affiliate_code", refCode.toUpperCase());
      toast.success(`Affiliate code ${refCode.toUpperCase()} applied!`, {
        description: "You're shopping with a model's link",
        icon: <Tag className="h-4 w-4" />,
      });
      // Remove ref from URL to clean it up
      const params = new URLSearchParams(searchParams.toString());
      params.delete("ref");
      const newUrl = params.toString() ? `/shop?${params}` : "/shop";
      router.replace(newUrl);
    }
  }, [searchParams, router]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/shop?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilter("q", searchQuery);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShoppingBag className="h-8 w-8 text-pink-500" />
            EXA Swim Shop
          </h1>
          <p className="text-muted-foreground mt-1">
            Exclusive pieces from Miami Swim Week designers
          </p>
        </div>

        <Link href="/shop/cart">
          <Button variant="outline" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            View Cart
          </Button>
        </Link>
      </div>

      {/* Hero Banner */}
      <Card className="mb-4 overflow-hidden bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border-pink-500/20">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
              <Badge className="mb-3 bg-pink-500">Miami Swim Week · May 26–31, 2026</Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">Wear the runway. Own the moment.</h2>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Shop exclusive pieces direct from Miami Swim Week designers — the same suits on the runway, available now for models and fans alike.
              </p>
              <Button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
                Shop the Collection
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="hidden md:block w-48 h-48 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center">
              <ShoppingBag className="h-20 w-20 text-pink-500/50" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Opportunity Banner */}
      <Card className="mb-8 overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-950/40 via-purple-950/30 to-pink-950/40">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5 justify-center">
            <span className="text-xl">👙</span>
            <span className="text-xs font-semibold uppercase tracking-widest text-violet-400">For Models — How it works</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {[
              { step: "1", label: "Buy a suit", desc: "from a Swim Week designer" },
              { step: "2", label: "Shoot content", desc: "in the piece, show it off" },
              { step: "3", label: "Tag the brand", desc: "on Instagram & TikTok" },
              { step: "4", label: "Get seen", desc: "designers cast from content" },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex flex-col items-center text-center gap-2">
                <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  <span className="text-sm font-bold text-violet-400">{step}</span>
                </div>
                <p className="text-sm font-semibold leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/shows/miami-swim-week-2026">
              <Button size="sm" className="bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 text-white">
                View Swim Week 2026
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/models">
              <Button size="sm" variant="outline" className="border-violet-500/40 hover:border-violet-500">
                Browse Models
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search swimwear..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex gap-2">
          <Select value={categoryFilter || "all"} onValueChange={(v) => updateFilter("category", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={brandFilter || "all"} onValueChange={(v) => updateFilter("brand", v === "all" ? "" : v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => updateFilter("sort", v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="price_asc">Price: Low-High</SelectItem>
              <SelectItem value="price_desc">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active Filters */}
      {(categoryFilter || brandFilter || searchParams.get("q")) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {searchParams.get("q") && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchParams.get("q")}
              <button onClick={() => { setSearchQuery(""); updateFilter("q", ""); }}>×</button>
            </Badge>
          )}
          {categoryFilter && (
            <Badge variant="secondary" className="gap-1">
              {categories.find(c => c.slug === categoryFilter)?.name || categoryFilter}
              <button onClick={() => updateFilter("category", "")}>×</button>
            </Badge>
          )}
          {brandFilter && (
            <Badge variant="secondary" className="gap-1">
              {brands.find(b => b.id === brandFilter)?.name || "Brand"}
              <button onClick={() => updateFilter("brand", "")}>×</button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/shop")}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Products Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No products found</h3>
          <p className="text-muted-foreground mb-4">
            Try adjusting your filters or search query
          </p>
          <Button variant="outline" onClick={() => router.push("/shop")}>
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <Link key={product.id} href={`/shop/products/${product.id}`}>
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
                      <ShoppingBag className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}

                  {product.isFeatured && (
                    <Badge className="absolute top-2 left-2 bg-pink-500">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}

                  {!product.inStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Badge variant="secondary">Out of Stock</Badge>
                    </div>
                  )}

                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <Badge className="absolute top-2 right-2 bg-red-500">
                      Sale
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">
                    {product.brand.name}
                  </p>
                  <h3 className="font-medium text-sm line-clamp-2 mb-2">
                    {product.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-pink-500">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  {product.colors.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {product.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ backgroundColor: color.hex || "#ccc" }}
                          title={color.name}
                        />
                      ))}
                      {product.colors.length > 4 && (
                        <span className="text-xs text-muted-foreground">
                          +{product.colors.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Load More */}
      {products.length >= 24 && (
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More
          </Button>
        </div>
      )}
    </div>
  );
}
