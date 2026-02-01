"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  Edit,
  Loader2,
  Check,
  AlertTriangle,
  Eye,
  Star,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  brand_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  wholesale_price: number;
  retail_price: number;
  compare_at_price: number | null;
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  total_sold: number;
  view_count: number;
  created_at: string;
  brand?: { id: string; name: string };
  category?: { id: string; name: string };
  variants?: Variant[];
}

interface Variant {
  id: string;
  sku: string;
  size: string;
  color: string | null;
  color_hex: string | null;
  stock_quantity: number;
  price_override: number | null;
  is_active: boolean;
}

interface Brand {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

const initialProductForm = {
  brand_id: "",
  category_id: "",
  name: "",
  slug: "",
  description: "",
  wholesale_price: 0,
  retail_price: 0,
  compare_at_price: 0,
  images: [] as string[],
  is_active: true,
  is_featured: false,
};

export default function AdminShopProductsPage() {
  const searchParams = useSearchParams();
  const brandFilter = searchParams.get("brand") || "all";

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(initialProductForm);
  const [imageInput, setImageInput] = useState("");
  const [variantForm, setVariantForm] = useState({
    sku: "",
    size: "",
    color: "",
    color_hex: "",
    stock_quantity: 0,
    price_override: "",
  });

  useEffect(() => {
    fetchData();
  }, [brandFilter, statusFilter]);

  const fetchData = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      // Fetch brands and categories
      const [brandsRes, categoriesRes] = await Promise.all([
        (supabase as any).from("shop_brands").select("id, name").eq("status", "active"),
        (supabase as any).from("shop_categories").select("id, name, slug"),
      ]);

      setBrands(brandsRes.data || []);
      setCategories(categoriesRes.data || []);

      // Fetch products with related data
      let query = (supabase as any)
        .from("shop_products")
        .select(`
          *,
          brand:shop_brands(id, name),
          category:shop_categories(id, name),
          variants:shop_product_variants(*)
        `)
        .order("created_at", { ascending: false });

      if (brandFilter !== "all") {
        query = query.eq("brand_id", brandFilter);
      }

      if (statusFilter === "active") {
        query = query.eq("is_active", true);
      } else if (statusFilter === "inactive") {
        query = query.eq("is_active", false);
      } else if (statusFilter === "featured") {
        query = query.eq("is_featured", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleNameChange = (name: string) => {
    setForm({
      ...form,
      name,
      slug: editingProduct ? form.slug : generateSlug(name),
    });
  };

  const addImage = () => {
    if (imageInput && !form.images.includes(imageInput)) {
      setForm({ ...form, images: [...form.images, imageInput] });
      setImageInput("");
    }
  };

  const removeImage = (url: string) => {
    setForm({ ...form, images: form.images.filter((i) => i !== url) });
  };

  const saveProduct = async () => {
    if (!form.name || !form.brand_id || !form.retail_price) {
      toast.error("Name, brand, and retail price are required");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const productData = {
        brand_id: form.brand_id,
        category_id: form.category_id || null,
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        description: form.description || null,
        wholesale_price: Math.round(form.wholesale_price * 100),
        retail_price: Math.round(form.retail_price * 100),
        compare_at_price: form.compare_at_price ? Math.round(form.compare_at_price * 100) : null,
        images: form.images,
        is_active: form.is_active,
        is_featured: form.is_featured,
      };

      if (editingProduct) {
        const { error } = await (supabase as any)
          .from("shop_products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await (supabase as any)
          .from("shop_products")
          .insert(productData);

        if (error) throw error;
        toast.success("Product created successfully");
      }

      setDialogOpen(false);
      setEditingProduct(null);
      setForm(initialProductForm);
      fetchData();
    } catch (error: any) {
      console.error("Save product error:", error);
      toast.error(error.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const saveVariant = async () => {
    if (!selectedProduct || !variantForm.sku || !variantForm.size) {
      toast.error("SKU and size are required");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const { error } = await (supabase as any)
        .from("shop_product_variants")
        .insert({
          product_id: selectedProduct.id,
          sku: variantForm.sku,
          size: variantForm.size,
          color: variantForm.color || null,
          color_hex: variantForm.color_hex || null,
          stock_quantity: variantForm.stock_quantity,
          price_override: variantForm.price_override ? Math.round(parseFloat(variantForm.price_override) * 100) : null,
        });

      if (error) throw error;
      toast.success("Variant added successfully");
      setVariantDialogOpen(false);
      setVariantForm({ sku: "", size: "", color: "", color_hex: "", stock_quantity: 0, price_override: "" });
      fetchData();
    } catch (error: any) {
      console.error("Save variant error:", error);
      toast.error(error.message || "Failed to save variant");
    } finally {
      setSaving(false);
    }
  };

  const deleteVariant = async (variantId: string) => {
    if (!confirm("Are you sure you want to delete this variant?")) return;

    const supabase = createClient();
    const { error } = await (supabase as any)
      .from("shop_product_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      toast.error("Failed to delete variant");
    } else {
      toast.success("Variant deleted");
      fetchData();
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      brand_id: product.brand_id,
      category_id: product.category_id || "",
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      wholesale_price: product.wholesale_price / 100,
      retail_price: product.retail_price / 100,
      compare_at_price: product.compare_at_price ? product.compare_at_price / 100 : 0,
      images: product.images || [],
      is_active: product.is_active,
      is_featured: product.is_featured,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setForm({
      ...initialProductForm,
      brand_id: brandFilter !== "all" ? brandFilter : "",
    });
    setDialogOpen(true);
  };

  const openVariantDialog = (product: Product) => {
    setSelectedProduct(product);
    setVariantForm({ sku: "", size: "", color: "", color_hex: "", stock_quantity: 0, price_override: "" });
    setVariantDialogOpen(true);
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getTotalStock = (variants: Variant[] = []) => {
    return variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/shop"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Shop Admin
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Package className="h-7 w-7 text-purple-500" />
            Manage Products
          </h1>
          <p className="text-muted-foreground">
            {products.length} products
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand *</label>
                  <Select
                    value={form.brand_id}
                    onValueChange={(v) => setForm({ ...form, brand_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={form.category_id}
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Product Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Beach Bikini Set"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="beach-bikini-set"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Product description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Wholesale $ *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.wholesale_price}
                    onChange={(e) => setForm({ ...form, wholesale_price: parseFloat(e.target.value) || 0 })}
                    placeholder="25.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Retail $ *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.retail_price}
                    onChange={(e) => setForm({ ...form, retail_price: parseFloat(e.target.value) || 0 })}
                    placeholder="75.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Compare At $</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.compare_at_price}
                    onChange={(e) => setForm({ ...form, compare_at_price: parseFloat(e.target.value) || 0 })}
                    placeholder="99.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Images</label>
                <div className="flex gap-2">
                  <Input
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    placeholder="https://image-url.com/image.jpg"
                  />
                  <Button type="button" onClick={addImage} variant="secondary">
                    Add
                  </Button>
                </div>
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative group">
                        <div className="w-16 h-16 rounded border overflow-hidden">
                          <Image src={url} alt="" width={64} height={64} className="object-cover" />
                        </div>
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={form.is_active ? "active" : "inactive"}
                    onValueChange={(v) => setForm({ ...form, is_active: v === "active" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Featured</label>
                  <Select
                    value={form.is_featured ? "yes" : "no"}
                    onValueChange={(v) => setForm({ ...form, is_featured: v === "yes" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes - Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={saveProduct} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingProduct ? "Update Product" : "Create Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Variant Dialog */}
      <Dialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Variant - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">SKU *</label>
                <Input
                  value={variantForm.sku}
                  onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
                  placeholder="ABC-123-SM"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Size *</label>
                <Input
                  value={variantForm.size}
                  onChange={(e) => setVariantForm({ ...variantForm, size: e.target.value })}
                  placeholder="S, M, L, XL..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Color</label>
                <Input
                  value={variantForm.color}
                  onChange={(e) => setVariantForm({ ...variantForm, color: e.target.value })}
                  placeholder="Black, White..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Color Hex</label>
                <Input
                  value={variantForm.color_hex}
                  onChange={(e) => setVariantForm({ ...variantForm, color_hex: e.target.value })}
                  placeholder="#000000"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Stock Quantity</label>
                <Input
                  type="number"
                  value={variantForm.stock_quantity}
                  onChange={(e) => setVariantForm({ ...variantForm, stock_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price Override $</label>
                <Input
                  type="number"
                  step="0.01"
                  value={variantForm.price_override}
                  onChange={(e) => setVariantForm({ ...variantForm, price_override: e.target.value })}
                  placeholder="Leave blank for default"
                />
              </div>
            </div>
            <Button onClick={saveVariant} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Add Variant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={brandFilter} onValueChange={(v) => window.location.href = `/admin/shop/products?brand=${v}`}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Brands" />
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No products found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Add your first product to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProducts.map((product) => {
            const totalStock = getTotalStock(product.variants);
            const isLowStock = totalStock < 10 && totalStock > 0;
            const isOutOfStock = totalStock === 0;

            return (
              <Card key={product.id} className="hover:border-pink-500/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.name}
                          width={80}
                          height={80}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        {!product.is_active && <Badge variant="secondary">Inactive</Badge>}
                        {product.is_featured && <Badge className="bg-amber-500"><Star className="h-3 w-3 mr-1" />Featured</Badge>}
                        {isOutOfStock && <Badge variant="destructive">Out of Stock</Badge>}
                        {isLowStock && <Badge className="bg-amber-500"><AlertTriangle className="h-3 w-3 mr-1" />Low Stock</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.brand?.name} • {product.category?.name || "Uncategorized"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="font-bold text-pink-500">{formatPrice(product.retail_price)}</span>
                        <span className="text-muted-foreground">Wholesale: {formatPrice(product.wholesale_price)}</span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="h-3 w-3" />
                          {product.view_count}
                        </span>
                        <span className="text-muted-foreground">{product.total_sold} sold</span>
                      </div>
                    </div>

                    {/* Variants Summary */}
                    <div className="text-right text-sm hidden md:block">
                      <p>{product.variants?.length || 0} variants</p>
                      <p className={isLowStock || isOutOfStock ? "text-red-500" : "text-muted-foreground"}>
                        {totalStock} in stock
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(product)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openVariantDialog(product)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Variants List */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Variants:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.variants.map((variant) => (
                          <div
                            key={variant.id}
                            className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-xs"
                          >
                            {variant.color_hex && (
                              <div
                                className="w-3 h-3 rounded-full border"
                                style={{ backgroundColor: variant.color_hex }}
                              />
                            )}
                            <span>{variant.size}</span>
                            {variant.color && <span className="text-muted-foreground">/ {variant.color}</span>}
                            <span className={variant.stock_quantity < 5 ? "text-red-500" : "text-muted-foreground"}>
                              ({variant.stock_quantity})
                            </span>
                            <button
                              onClick={() => deleteVariant(variant.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
