"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarCheck,
  Search,
  RefreshCw,
  ExternalLink,
  Mail,
  Phone,
  Building2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BookingInquiry {
  id: string;
  model_id: string | null;
  model_username: string | null;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  inquiry_type: string;
  event_date: string | null;
  location: string | null;
  budget_range: string | null;
  details: string | null;
  source: string | null;
  status: "new" | "contacted" | "booked" | "closed";
  created_at: string;
}

const STATUSES = ["new", "contacted", "booked", "closed"] as const;

const STATUS_STYLES: Record<string, string> = {
  new: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  contacted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  booked: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  closed: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  photoshoot: "Photoshoot",
  runway: "Runway",
  event: "Event",
  campaign: "Campaign",
  content: "Content",
  other: "Other",
};

const BUDGET_LABELS: Record<string, string> = {
  under_1k: "Under $1k",
  "1k_5k": "$1k–$5k",
  "5k_15k": "$5k–$15k",
  "15k_plus": "$15k+",
  discuss: "To discuss",
};

export default function BookingInquiriesPage() {
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/booking-inquiries");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInquiries(data.inquiries || []);
    } catch {
      toast.error("Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: string) => {
    const prev = inquiries;
    setInquiries((list) =>
      list.map((i) => (i.id === id ? { ...i, status: status as BookingInquiry["status"] } : i))
    );
    try {
      const res = await fetch("/api/admin/booking-inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setInquiries(prev);
      toast.error("Failed to update status");
    }
  };

  const filtered = inquiries.filter((i) => {
    if (statusFilter !== "all" && i.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.name.toLowerCase().includes(q) ||
      i.email.toLowerCase().includes(q) ||
      (i.company || "").toLowerCase().includes(q) ||
      (i.model_username || "").toLowerCase().includes(q) ||
      (i.location || "").toLowerCase().includes(q)
    );
  });

  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarCheck className="h-6 w-6" />
          Booking Inquiries
          {newCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/30">
              {newCount} new
            </span>
          )}
        </h1>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize",
                statusFilter === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Inquiries */}
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          {inquiries.length === 0
            ? "No booking inquiries yet — they'll land here when someone hits Book on /models."
            : "No inquiries match this filter."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((i) => (
            <Card key={i.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{i.name}</p>
                      {i.model_username ? (
                        <Link
                          href={`/${i.model_username}`}
                          target="_blank"
                          className="flex items-center gap-1 text-sm text-pink-400 hover:underline notranslate"
                        >
                          @{i.model_username}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-sm text-muted-foreground">General inquiry</span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-violet-500/15 text-violet-400 border border-violet-500/30">
                        {TYPE_LABELS[i.inquiry_type] || i.inquiry_type}
                      </span>
                      {i.budget_range && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          {BUDGET_LABELS[i.budget_range] || i.budget_range}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground mt-1">
                      <a href={`mailto:${i.email}`} className="flex items-center gap-1 hover:text-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {i.email}
                      </a>
                      {i.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {i.phone}
                        </span>
                      )}
                      {i.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          {i.company}
                        </span>
                      )}
                      {(i.location || i.event_date) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[i.location, i.event_date].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0">
                    {new Date(i.created_at).toLocaleDateString()}{" "}
                    {new Date(i.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {i.source && <span className="ml-2 opacity-70">via {i.source.replace("_", " ")}</span>}
                  </p>
                </div>

                {i.details && (
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/40 rounded-lg p-3">
                    {i.details}
                  </p>
                )}

                <div className="flex gap-1.5">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(i.id, s)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all capitalize",
                        i.status === s
                          ? STATUS_STYLES[s]
                          : "border-border/60 text-muted-foreground/60 hover:text-foreground hover:border-border"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
