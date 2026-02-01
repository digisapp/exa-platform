"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Store,
  Plus,
  Search,
  Edit,
  Loader2,
  Globe,
  Mail,
  Package,
  Check,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_email: string;
  commission_rate: number;
  model_commission_rate: number;
  ships_internationally: boolean;
  status: string;
  product_count?: number;
  created_at: string;
}

const initialBrandForm = {
  name: "",
  slug: "",
  description: "",
  logo_url: "",
  website_url: "",
  contact_email: "",
  contact_phone: "",
  payout_email: "",
  commission_rate: 30,
  model_commission_rate: 10,
  ships_internationally: false,
  avg_ship_days: 5,
  status: "pending",
};

export default function AdminShopBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [form, setForm] = useState(initialBrandForm);

  useEffect(() => {
    fetchBrands();
  }, [statusFilter]);

  const fetchBrands = async () => {
    const supabase = createClient();
    setLoading(true);

    try {
      let query = (supabase as any)
        .from("shop_brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get product counts
      const brandIds = data?.map((b: Brand) => b.id) || [];
      const { data: productCounts } = await (supabase as any)
        .from("shop_products")
        .select("brand_id")
        .in("brand_id", brandIds);

      const countMap: Record<string, number> = {};
      productCounts?.forEach((p: any) => {
        countMap[p.brand_id] = (countMap[p.brand_id] || 0) + 1;
      });

      const brandsWithCounts = data?.map((b: Brand) => ({
        ...b,
        product_count: countMap[b.id] || 0,
      }));

      setBrands(brandsWithCounts || []);
    } catch (error) {
      console.error("Failed to fetch brands:", error);
      toast.error("Failed to load brands");
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
      slug: editingBrand ? form.slug : generateSlug(name),
    });
  };

  const saveBrand = async () => {
    if (!form.name || !form.contact_email) {
      toast.error("Name and contact email are required");
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      const brandData = {
        name: form.name,
        slug: form.slug || generateSlug(form.name),
        description: form.description || null,
        logo_url: form.logo_url || null,
        website_url: form.website_url || null,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone || null,
        payout_email: form.payout_email || null,
        commission_rate: form.commission_rate,
        model_commission_rate: form.model_commission_rate,
        ships_internationally: form.ships_internationally,
        avg_ship_days: form.avg_ship_days,
        status: form.status,
      };

      if (editingBrand) {
        const { error } = await (supabase as any)
          .from("shop_brands")
          .update(brandData)
          .eq("id", editingBrand.id);

        if (error) throw error;
        toast.success("Brand updated successfully");
      } else {
        const { error } = await (supabase as any)
          .from("shop_brands")
          .insert(brandData);

        if (error) throw error;
        toast.success("Brand created successfully");
      }

      setDialogOpen(false);
      setEditingBrand(null);
      setForm(initialBrandForm);
      fetchBrands();
    } catch (error: any) {
      console.error("Save brand error:", error);
      toast.error(error.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (brand: Brand) => {
    setEditingBrand(brand);
    setForm({
      name: brand.name,
      slug: brand.slug,
      description: brand.description || "",
      logo_url: brand.logo_url || "",
      website_url: brand.website_url || "",
      contact_email: brand.contact_email,
      contact_phone: "",
      payout_email: "",
      commission_rate: brand.commission_rate,
      model_commission_rate: brand.model_commission_rate,
      ships_internationally: brand.ships_internationally,
      avg_ship_days: 5,
      status: brand.status,
    });
    setDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingBrand(null);
    setForm(initialBrandForm);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500";
      case "pending":
        return "bg-amber-500";
      case "paused":
        return "bg-blue-500";
      case "suspended":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const filteredBrands = brands.filter((brand) =>
    brand.name.toLowerCase().includes(searchQuery.toLowerCase())
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
            <Store className="h-7 w-7 text-blue-500" />
            Manage Brands
          </h1>
          <p className="text-muted-foreground">
            {brands.length} brands registered
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Brand
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBrand ? "Edit Brand" : "Add New Brand"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Brand Name *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Acme Swimwear"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="acme-swimwear"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="A brief description of the brand..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Logo URL</label>
                  <Input
                    value={form.logo_url}
                    onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input
                    value={form.website_url}
                    onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Email *</label>
                  <Input
                    type="email"
                    value={form.contact_email}
                    onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                    placeholder="contact@brand.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Phone</label>
                  <Input
                    value={form.contact_phone}
                    onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                    placeholder="+1 555 123 4567"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Payout Email (PayPal)</label>
                <Input
                  type="email"
                  value={form.payout_email}
                  onChange={(e) => setForm({ ...form, payout_email: e.target.value })}
                  placeholder="payouts@brand.com"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">EXA Commission %</label>
                  <Input
                    type="number"
                    value={form.commission_rate}
                    onChange={(e) => setForm({ ...form, commission_rate: parseFloat(e.target.value) || 30 })}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Model Commission %</label>
                  <Input
                    type="number"
                    value={form.model_commission_rate}
                    onChange={(e) => setForm({ ...form, model_commission_rate: parseFloat(e.target.value) || 10 })}
                    min={0}
                    max={100}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Avg Ship Days</label>
                  <Input
                    type="number"
                    value={form.avg_ship_days}
                    onChange={(e) => setForm({ ...form, avg_ship_days: parseInt(e.target.value) || 5 })}
                    min={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm({ ...form, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ships Internationally</label>
                  <Select
                    value={form.ships_internationally ? "yes" : "no"}
                    onValueChange={(v) => setForm({ ...form, ships_internationally: v === "yes" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">US Only</SelectItem>
                      <SelectItem value="yes">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={saveBrand} disabled={saving} className="w-full">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingBrand ? "Update Brand" : "Create Brand"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search brands..."
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
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Brands List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
        </div>
      ) : filteredBrands.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No brands found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Add your first brand to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Brand
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBrands.map((brand) => (
            <Card key={brand.id} className="hover:border-pink-500/30 transition-all">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {brand.logo_url ? (
                      <Image
                        src={brand.logo_url}
                        alt={brand.name}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    ) : (
                      <Store className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate">{brand.name}</h3>
                      <Badge className={getStatusColor(brand.status)}>
                        {brand.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {brand.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {brand.product_count} products
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {brand.contact_email}
                      </span>
                      {brand.website_url && (
                        <a
                          href={brand.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-pink-500"
                        >
                          <Globe className="h-3 w-3" />
                          Website
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Commission Info */}
                  <div className="text-right text-sm hidden md:block">
                    <p className="text-muted-foreground">EXA: {brand.commission_rate}%</p>
                    <p className="text-muted-foreground">Model: {brand.model_commission_rate}%</p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(brand)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/shop/products?brand=${brand.id}`}>
                      <Button variant="outline" size="sm">
                        <Package className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
