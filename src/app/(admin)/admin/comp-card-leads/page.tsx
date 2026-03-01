"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Search,
  RefreshCw,
  Users,
  Download,
} from "lucide-react";
import { toast } from "sonner";

interface CompCardLead {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  height: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  eye_color: string | null;
  hair_color: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  export_type: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
}

export default function CompCardLeadsPage() {
  const [leads, setLeads] = useState<CompCardLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/comp-card-leads");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLeads(data.leads || []);
    } catch {
      toast.error("Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.email.toLowerCase().includes(q) ||
      (l.first_name || "").toLowerCase().includes(q) ||
      (l.last_name || "").toLowerCase().includes(q) ||
      (l.phone || "").includes(q) ||
      (l.instagram || "").toLowerCase().includes(q)
    );
  });

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Phone", "Instagram", "Website",
      "Height", "Bust", "Waist", "Hips", "Eyes", "Hair",
      "Dress", "Shoes", "Export Type", "Downloads", "Date",
    ];
    const rows = filtered.map((l) => [
      [l.first_name, l.last_name].filter(Boolean).join(" "),
      l.email,
      l.phone || "",
      l.instagram ? `@${l.instagram}` : "",
      l.website || "",
      l.height || "",
      l.bust || "",
      l.waist || "",
      l.hips || "",
      l.eye_color || "",
      l.hair_color || "",
      l.dress_size || "",
      l.shoe_size || "",
      l.export_type || "",
      l.download_count.toString(),
      new Date(l.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `comp-card-leads-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Comp Card Leads
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={loadLeads}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{leads.length}</p>
              <p className="text-xs text-muted-foreground">Total Leads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-pink-500" />
            <div>
              <p className="text-2xl font-bold">
                {leads.reduce((s, l) => s + l.download_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total Downloads</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-violet-500" />
            <div>
              <p className="text-2xl font-bold">
                {leads.filter((l) => l.instagram).length}
              </p>
              <p className="text-xs text-muted-foreground">With Instagram</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Leads */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No leads found</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <Card key={lead.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    {/* Name + badges */}
                    <div className="flex items-center flex-wrap gap-2">
                      <p className="font-semibold">
                        {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                      </p>
                      {lead.export_type && (
                        <Badge variant="outline" className="text-xs uppercase">
                          {lead.export_type}
                        </Badge>
                      )}
                      {lead.download_count > 1 && (
                        <Badge variant="secondary" className="text-xs">
                          {lead.download_count}x downloads
                        </Badge>
                      )}
                    </div>

                    {/* Contact */}
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <span>{lead.email}</span>
                      {lead.phone && <span>{lead.phone}</span>}
                      {lead.instagram && <span>@{lead.instagram}</span>}
                      {lead.website && <span>{lead.website}</span>}
                    </div>

                    {/* Measurements */}
                    {(lead.height || lead.bust || lead.waist || lead.hips || lead.eye_color || lead.hair_color || lead.dress_size || lead.shoe_size) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground pt-1">
                        {lead.height && <span>H: {lead.height}</span>}
                        {lead.bust && <span>B: {lead.bust}</span>}
                        {lead.waist && <span>W: {lead.waist}</span>}
                        {lead.hips && <span>H: {lead.hips}</span>}
                        {lead.eye_color && <span>Eyes: {lead.eye_color}</span>}
                        {lead.hair_color && <span>Hair: {lead.hair_color}</span>}
                        {lead.dress_size && <span>Dress: {lead.dress_size}</span>}
                        {lead.shoe_size && <span>Shoes: {lead.shoe_size}</span>}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(lead.created_at).toLocaleDateString()}{" "}
                    {new Date(lead.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
