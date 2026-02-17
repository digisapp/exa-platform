"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Search,
  Building2,
  Mail,
  Globe,
  Phone,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Brand {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  website: string | null;
  phone: string | null;
  username: string | null;
  logo_url: string | null;
  subscription_tier: string;
  is_verified: boolean;
  coin_balance: number;
  created_at: string;
}

const PAGE_SIZE = 25;

const tierColors: Record<string, string> = {
  free: "bg-muted text-muted-foreground",
  basic: "bg-blue-500/20 text-blue-400",
  pro: "bg-violet-500/20 text-violet-400",
  enterprise: "bg-amber-500/20 text-amber-400",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

export default function AdminBrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBrands = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search: debouncedSearch,
        tier: tierFilter,
        verified: verifiedFilter,
      });
      const res = await fetch(`/api/admin/brands?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setBrands(data.brands || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tierFilter, verifiedFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tierFilter, verifiedFilter]);

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const toggleVerified = async (brand: Brand) => {
    setTogglingId(brand.id);
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: !brand.is_verified }),
      });
      if (!res.ok) throw new Error("Failed to update brand");
      toast.success(brand.is_verified ? "Brand unverified" : "Brand verified — approval email sent");
      fetchBrands();
    } catch {
      toast.error("Failed to update brand");
    } finally {
      setTogglingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const verifiedCount = brands.filter((b) => b.is_verified).length;
  const unverifiedCount = brands.filter((b) => !b.is_verified).length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-6 w-6 text-violet-500" />
                Brands
              </h1>
              <p className="text-sm text-muted-foreground">{total} total brand accounts</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Verified</p>
              <p className="text-2xl font-bold text-green-500">{verifiedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Unverified</p>
              <p className="text-2xl font-bold text-amber-500">{unverifiedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">This page</p>
              <p className="text-2xl font-bold">{brands.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Verified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="unverified">Unverified</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : brands.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Building2 className="h-10 w-10 mb-2 opacity-30" />
                <p>No brands found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Brand</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {brands.map((brand) => (
                      <TableRow key={brand.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {brand.logo_url ? (
                              <img
                                src={brand.logo_url}
                                alt={brand.company_name}
                                className="h-8 w-8 rounded object-cover border border-border"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                <Building2 className="h-4 w-4 text-violet-400" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-sm">{brand.company_name}</p>
                              {brand.username && (
                                <p className="text-xs text-muted-foreground">@{brand.username}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {brand.email ? (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <a
                                href={`mailto:${brand.email}`}
                                className="text-sm text-blue-400 hover:underline"
                              >
                                {brand.email}
                              </a>
                              <CopyButton value={brand.email} />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                          {brand.website && (
                            <div className="flex items-center gap-1 mt-1">
                              <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <a
                                href={brand.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[180px]"
                              >
                                {brand.website.replace(/^https?:\/\//, "")}
                              </a>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            {brand.contact_name && (
                              <p className="text-sm">{brand.contact_name}</p>
                            )}
                            {brand.phone && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <a
                                  href={`tel:${brand.phone}`}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  {brand.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[brand.subscription_tier] || tierColors.free}`}>
                            {brand.subscription_tier}
                          </span>
                        </TableCell>
                        <TableCell>
                          {brand.is_verified ? (
                            <div className="flex items-center gap-1 text-green-500">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-xs">Verified</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-500">
                              <XCircle className="h-4 w-4" />
                              <span className="text-xs">Unverified</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(brand.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleVerified(brand)}
                            disabled={togglingId === brand.id}
                            className={brand.is_verified
                              ? "text-amber-500 border-amber-500/30 hover:bg-amber-500/10"
                              : "text-green-500 border-green-500/30 hover:bg-green-500/10"
                            }
                          >
                            {togglingId === brand.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : brand.is_verified ? (
                              <><ShieldOff className="h-3.5 w-3.5 mr-1" />Unverify</>
                            ) : (
                              <><Shield className="h-3.5 w-3.5 mr-1" />Verify</>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} · {total} brands
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
