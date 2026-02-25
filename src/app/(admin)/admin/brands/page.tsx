"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Instagram,
  MapPin,
  Tag,
  MessageSquare,
  RefreshCw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

// ─── Shared ───────────────────────────────────────────────────────────────────

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

// ─── Accounts Tab ─────────────────────────────────────────────────────────────

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

function AccountsTab() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [verifiedTotal, setVerifiedTotal] = useState(0);
  const [unverifiedTotal, setUnverifiedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [verifiedFilter, setVerifiedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
      setVerifiedTotal(data.verifiedTotal ?? 0);
      setUnverifiedTotal(data.unverifiedTotal ?? 0);
    } catch {
      toast.error("Failed to load brands");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, tierFilter, verifiedFilter]);

  useEffect(() => { setPage(1); }, [debouncedSearch, tierFilter, verifiedFilter]);
  useEffect(() => { fetchBrands(); }, [fetchBrands]);

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

  const deleteBrand = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/brands/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete brand");
      toast.success("Brand deleted");
      setConfirmDeleteId(null);
      fetchBrands();
    } catch {
      toast.error("Failed to delete brand");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total (filtered)</p><p className="text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Verified</p><p className="text-2xl font-bold text-green-500">{verifiedTotal}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Unverified</p><p className="text-2xl font-bold text-amber-500">{unverifiedTotal}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">This page</p><p className="text-2xl font-bold">{brands.length}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Verified" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
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
            <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : brands.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-2 opacity-30" /><p>No brands found</p>
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
                    <TableHead>Coins</TableHead>
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
                            <img src={brand.logo_url} alt={brand.company_name} className="h-8 w-8 rounded object-cover border border-border" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                              <Building2 className="h-4 w-4 text-violet-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{brand.company_name}</p>
                            {brand.username && (
                              <a href={`/${brand.username}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-violet-400 flex items-center gap-0.5">
                                @{brand.username}<ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {brand.email ? (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <a href={`mailto:${brand.email}`} className="text-sm text-blue-400 hover:underline">{brand.email}</a>
                            <CopyButton value={brand.email} />
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                        {brand.website && (
                          <div className="flex items-center gap-1 mt-1">
                            <Globe className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground truncate max-w-[180px]">
                              {brand.website.replace(/^https?:\/\//, "")}
                            </a>
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          {brand.contact_name && <p className="text-sm">{brand.contact_name}</p>}
                          {brand.phone && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <a href={`tel:${brand.phone}`} className="text-xs text-muted-foreground hover:text-foreground">{brand.phone}</a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tierColors[brand.subscription_tier] || tierColors.free}`}>
                          {brand.subscription_tier}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {brand.coin_balance > 0
                          ? <span className="text-amber-400">{brand.coin_balance.toLocaleString()}</span>
                          : <span className="text-muted-foreground/40">0</span>}
                      </TableCell>
                      <TableCell>
                        {brand.is_verified ? (
                          <div className="flex items-center gap-1 text-green-500"><CheckCircle className="h-4 w-4" /><span className="text-xs">Verified</span></div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-500"><XCircle className="h-4 w-4" /><span className="text-xs">Unverified</span></div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(brand.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => toggleVerified(brand)}
                            disabled={togglingId === brand.id || deletingId === brand.id}
                            className={brand.is_verified ? "text-amber-500 border-amber-500/30 hover:bg-amber-500/10" : "text-green-500 border-green-500/30 hover:bg-green-500/10"}
                          >
                            {togglingId === brand.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : brand.is_verified ? <><ShieldOff className="h-3.5 w-3.5 mr-1" />Unverify</> : <><Shield className="h-3.5 w-3.5 mr-1" />Verify</>}
                          </Button>
                          {confirmDeleteId === brand.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm" variant="destructive"
                                onClick={() => deleteBrand(brand.id)}
                                disabled={deletingId === brand.id}
                                className="text-xs px-2"
                              >
                                {deletingId === brand.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm?"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 text-muted-foreground">Cancel</Button>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => setConfirmDeleteId(brand.id)}
                              disabled={togglingId === brand.id || deletingId === brand.id}
                              className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} brands</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Outreach Tab ─────────────────────────────────────────────────────────────

interface OutreachContact {
  id: string;
  brand_name: string;
  contact_name: string | null;
  email: string;
  email_type: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  category: string | null;
  location_city: string | null;
  location_country: string | null;
  notes: string | null;
  status: string;
  last_contacted_at: string | null;
  created_at: string;
}

const OUTREACH_PAGE_SIZE = 50;

const statusConfig: Record<string, { label: string; color: string }> = {
  new:              { label: "New",            color: "bg-muted text-muted-foreground" },
  contacted:        { label: "Contacted",      color: "bg-blue-500/20 text-blue-400" },
  responded:        { label: "Responded",      color: "bg-amber-500/20 text-amber-400" },
  interested:       { label: "Interested",     color: "bg-violet-500/20 text-violet-400" },
  not_interested:   { label: "Not Interested", color: "bg-red-500/20 text-red-400" },
  converted:        { label: "Converted",      color: "bg-green-500/20 text-green-400" },
  do_not_contact:   { label: "Do Not Contact", color: "bg-red-500/20 text-red-400" },
};

const categoryColors: Record<string, string> = {
  swimwear:    "bg-cyan-500/20 text-cyan-400",
  resort_wear: "bg-teal-500/20 text-teal-400",
  luxury:      "bg-amber-500/20 text-amber-400",
  fashion:     "bg-violet-500/20 text-violet-400",
  sunscreen:   "bg-yellow-500/20 text-yellow-400",
  skincare:    "bg-rose-500/20 text-rose-400",
  haircare:    "bg-pink-500/20 text-pink-400",
  beverage:    "bg-blue-500/20 text-blue-400",
  spirits:     "bg-orange-500/20 text-orange-400",
  wellness:    "bg-green-500/20 text-green-400",
  beauty:      "bg-purple-500/20 text-purple-400",
  medspa:      "bg-sky-500/20 text-sky-400",
};

function OutreachTab({ contactType = "outreach" }: { contactType?: "outreach" | "sponsor" }) {
  const isSponsor = contactType === "sponsor";
  const [contacts, setContacts] = useState<OutreachContact[]>([]);
  const [total, setTotal] = useState(0);
  const [globalStatusCounts, setGlobalStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search: debouncedSearch,
        status: statusFilter,
        category: categoryFilter,
        type: contactType,
      });
      const res = await fetch(`/api/admin/outreach?${params}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setGlobalStatusCounts(data.statusCounts || {});
    } catch {
      toast.error("Failed to load outreach contacts");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, statusFilter, categoryFilter]);

  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, categoryFilter]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const updateStatus = async (contact: OutreachContact, newStatus: string) => {
    setUpdatingId(contact.id);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (newStatus === "contacted" && !contact.last_contacted_at) {
        body.mark_contacted = true;
      }
      const res = await fetch(`/api/admin/outreach/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Marked as ${statusConfig[newStatus]?.label || newStatus}`);
      fetchContacts();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const markContacted = async (contact: OutreachContact) => {
    setUpdatingId(contact.id);
    try {
      const res = await fetch(`/api/admin/outreach/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: contact.status === "new" ? "contacted" : contact.status,
          mark_contacted: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success("Marked as contacted");
      fetchContacts();
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  };

  const saveNotes = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/outreach/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesValue }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast.success("Notes saved");
      setEditingNotesId(null);
      fetchContacts();
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteContact = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/outreach/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      toast.success("Contact deleted");
      setConfirmDeleteId(null);
      fetchContacts();
    } catch {
      toast.error("Failed to delete contact");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / OUTREACH_PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total (filtered)</p><p className="text-2xl font-bold">{total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">New</p><p className="text-2xl font-bold text-muted-foreground">{globalStatusCounts.new || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Contacted</p><p className="text-2xl font-bold text-blue-400">{globalStatusCounts.contacted || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Interested</p><p className="text-2xl font-bold text-violet-400">{globalStatusCounts.interested || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Converted</p><p className="text-2xl font-bold text-green-400">{globalStatusCounts.converted || 0}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search brand, contact, or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="do_not_contact">Do Not Contact</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {isSponsor ? (
                  <>
                    <SelectItem value="sunscreen">Sunscreen / SPF</SelectItem>
                    <SelectItem value="skincare">Skincare</SelectItem>
                    <SelectItem value="haircare">Haircare</SelectItem>
                    <SelectItem value="beverage">Beverage</SelectItem>
                    <SelectItem value="spirits">Spirits / Alcohol</SelectItem>
                    <SelectItem value="wellness">Wellness</SelectItem>
                    <SelectItem value="beauty">Beauty / Makeup</SelectItem>
                    <SelectItem value="medspa">Med Spa</SelectItem>
                  </>
                ) : (
                  <>
                    <SelectItem value="swimwear">Swimwear</SelectItem>
                    <SelectItem value="resort_wear">Resort Wear</SelectItem>
                    <SelectItem value="lingerie">Lingerie</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="fashion">Fashion</SelectItem>
                    <SelectItem value="activewear">Activewear</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Building2 className="h-10 w-10 mb-2 opacity-30" /><p>No contacts found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brand</TableHead>
                    <TableHead>Contact &amp; Email</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Last Contacted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      {/* Brand */}
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{contact.brand_name}</p>
                          {contact.instagram_handle && (
                            <a
                              href={`https://instagram.com/${contact.instagram_handle}`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5"
                            >
                              <Instagram className="h-3 w-3" />@{contact.instagram_handle}
                            </a>
                          )}
                          {contact.website_url && (
                            <a
                              href={contact.website_url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5"
                            >
                              <Globe className="h-3 w-3" />
                              {contact.website_url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                            </a>
                          )}
                        </div>
                      </TableCell>

                      {/* Contact & Email */}
                      <TableCell>
                        {contact.contact_name && (
                          <p className="text-sm font-medium">{contact.contact_name}</p>
                        )}
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <a href={`mailto:${contact.email}`} className="text-xs text-blue-400 hover:underline">
                            {contact.email}
                          </a>
                          <CopyButton value={contact.email} />
                        </div>
                        {contact.phone && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <a href={`tel:${contact.phone}`} className="text-xs text-muted-foreground hover:text-foreground">{contact.phone}</a>
                          </div>
                        )}
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        {contact.category && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[contact.category] || "bg-muted text-muted-foreground"}`}>
                            <Tag className="h-2.5 w-2.5" />
                            {contact.category.replaceAll("_", " ")}
                          </span>
                        )}
                      </TableCell>

                      {/* Location */}
                      <TableCell>
                        {(contact.location_city || contact.location_country) && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {[contact.location_city, contact.location_country].filter(Boolean).join(", ")}
                          </div>
                        )}
                      </TableCell>

                      {/* Notes */}
                      <TableCell className="max-w-[180px]">
                        {editingNotesId === contact.id ? (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={notesValue}
                              onChange={(e) => setNotesValue(e.target.value)}
                              rows={2}
                              className="w-full text-xs bg-muted border border-border rounded p-1 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-xs px-2 bg-violet-600 hover:bg-violet-700" onClick={() => saveNotes(contact.id)} disabled={updatingId === contact.id}>
                                {updatingId === contact.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingNotesId(null)}>Cancel</Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingNotesId(contact.id); setNotesValue(contact.notes || ""); }}
                            className="text-left w-full"
                          >
                            {contact.notes ? (
                              <p className="text-xs text-muted-foreground line-clamp-2 hover:text-foreground transition-colors">{contact.notes}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />Add note
                              </p>
                            )}
                          </button>
                        )}
                      </TableCell>

                      {/* Last Contacted */}
                      <TableCell className="text-xs text-muted-foreground">
                        {contact.last_contacted_at
                          ? new Date(contact.last_contacted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : <span className="text-muted-foreground/40">Never</span>}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Select
                          value={contact.status}
                          onValueChange={(val) => updateStatus(contact, val)}
                          disabled={updatingId === contact.id}
                        >
                          <SelectTrigger className="h-auto w-auto min-w-[7.5rem] border border-transparent hover:border-border/50 shadow-none bg-transparent p-0.5 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-full [&>svg]:ml-0.5 [&>svg]:opacity-40 [&>svg]:size-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[contact.status]?.color || statusConfig.new.color}`}>
                              {statusConfig[contact.status]?.label || contact.status}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([val, cfg]) => (
                              <SelectItem key={val} value={val}>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm" variant="outline"
                            onClick={() => markContacted(contact)}
                            disabled={updatingId === contact.id || deletingId === contact.id}
                            className="text-blue-400 border-blue-400/30 hover:bg-blue-400/10 whitespace-nowrap"
                          >
                            {updatingId === contact.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <><RefreshCw className="h-3.5 w-3.5 mr-1" />Log Contact</>}
                          </Button>
                          {confirmDeleteId === contact.id ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="sm" variant="destructive"
                                onClick={() => deleteContact(contact.id)}
                                disabled={deletingId === contact.id}
                                className="text-xs px-2"
                              >
                                {deletingId === contact.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Confirm?"}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteId(null)} className="text-xs px-2 text-muted-foreground">Cancel</Button>
                            </div>
                          ) : (
                            <Button
                              size="sm" variant="ghost"
                              onClick={() => setConfirmDeleteId(contact.id)}
                              disabled={updatingId === contact.id || deletingId === contact.id}
                              className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} contacts</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBrandsPage() {
  const [activeTab, setActiveTab] = useState<"accounts" | "outreach" | "sponsors">("accounts");

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-violet-500" />
              Brands
            </h1>
            <p className="text-sm text-muted-foreground">Manage brand accounts, outreach pipeline, and event sponsors</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "accounts" | "outreach" | "sponsors")}>
          <TabsList className="grid w-full max-w-sm grid-cols-3">
            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="h-4 w-4" />Accounts
            </TabsTrigger>
            <TabsTrigger value="outreach" className="gap-2">
              <Mail className="h-4 w-4" />Outreach
            </TabsTrigger>
            <TabsTrigger value="sponsors" className="gap-2">
              <Sparkles className="h-4 w-4" />Sponsors
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab content */}
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "outreach" && <OutreachTab contactType="outreach" />}
        {activeTab === "sponsors" && <OutreachTab contactType="sponsor" />}
      </div>
    </div>
  );
}
