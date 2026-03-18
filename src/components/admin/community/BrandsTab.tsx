"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  CheckCircle,
  Clock,
  ExternalLink,
  Globe,
  Loader2,
  Mail,
} from "lucide-react";
import { ApproveRejectButtons } from "@/components/admin/AdminActions";

interface Brand {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  bio: string | null;
  subscription_tier: string;
  is_verified: boolean;
  form_data: {
    industry?: string;
    budget_range?: string;
  } | null;
  created_at: string;
}

export default function BrandsTab() {
  const supabase = createClient();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsFilter, setBrandsFilter] = useState<"pending" | "approved" | "all">("pending");

  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    let query = (supabase.from("brands") as any).select("*");

    if (brandsFilter === "pending") {
      query = query.eq("is_verified", false);
    } else if (brandsFilter === "approved") {
      query = query.eq("is_verified", true);
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    setBrands(data || []);
    setBrandsLoading(false);
  }, [supabase, brandsFilter]);

  useEffect(() => {
    void loadBrands();
  }, [loadBrands]);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Select value={brandsFilter} onValueChange={(v: "pending" | "approved" | "all") => setBrandsFilter(v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter brands" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="all">All Brands</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Showing {brands.length} {brandsFilter === "all" ? "brands" : brandsFilter === "pending" ? "pending" : "approved"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {brandsFilter === "pending" ? "Pending Brand Inquiries" : brandsFilter === "approved" ? "Approved Brands" : "All Brands"}
          </CardTitle>
          <CardDescription>
            {brandsFilter === "pending" ? "Partnership requests awaiting approval" : brandsFilter === "approved" ? "Verified brand partners" : "All brand inquiries and partners"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {brandsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : brands.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{brandsFilter === "pending" ? "No pending brand inquiries" : brandsFilter === "approved" ? "No approved brands yet" : "No brands yet"}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="p-4 rounded-lg bg-muted/50 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                        {brand.company_name?.charAt(0).toUpperCase() || "B"}
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{brand.company_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {brand.contact_name}
                        </p>
                      </div>
                    </div>
                    {brand.is_verified ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/50">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/50">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground truncate">{brand.email}</span>
                    </div>
                    {brand.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline truncate flex items-center gap-1">
                          Website <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                    {brand.form_data?.industry && (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{brand.form_data.industry}</span>
                      </div>
                    )}
                    {brand.form_data?.budget_range && (
                      <div className="text-muted-foreground">
                        Budget: {brand.form_data.budget_range.replace(/_/g, " ")}
                      </div>
                    )}
                  </div>
                  {brand.bio && (
                    <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded">
                      {brand.bio}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(brand.created_at).toLocaleDateString()}
                    </span>
                    {!brand.is_verified && (
                      <ApproveRejectButtons id={brand.id} type="brand" onSuccess={() => { loadBrands(); }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
