"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  RefreshCw,
  ExternalLink,
  X,
  Copy,
  Check,
  Loader2,
  Twitter,
  Building2,
  Waves,
} from "lucide-react";

interface XLead {
  id: string;
  category: "swimwear_brand" | "hotel_resort";
  brand_name: string | null;
  x_handle: string | null;
  tweet_text: string;
  tweet_url: string | null;
  tweet_id: string | null;
  author_followers: number | null;
  search_query: string | null;
  status: "new" | "reviewed" | "contacted" | "pass";
  notes: string | null;
  discovered_at: string;
  contacted_at: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-zinc-700 text-zinc-200",
  reviewed: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  contacted: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  pass: "bg-red-500/20 text-red-400 border border-red-500/30",
};

const SWIMWEAR_PITCH = (brand: string) =>
  `Hi ${brand || "there"}, we noticed your recent post — we're producing Miami Swim Week 2026 (May 26-31) and looking for brands to walk our runway. View our lineup at examodels.com/swimweek — happy to send a full deck. Interested?`;

const HOTEL_PITCH = (brand: string) =>
  `Hi ${brand || "there"}, we saw your post and thought there could be a great fit! We run EXA, a platform of 500+ professional models and content creators looking for hosted stay partnerships. We'd love to connect you with talent for content campaigns. examodels.com`;

interface Props {
  initialLeads: XLead[];
}

export function XLeadsClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState<XLead[]>(initialLeads);
  const [activeTab, setActiveTab] = useState<"swimwear_brand" | "hotel_resort">("swimwear_brand");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<XLead | null>(null);
  const [notes, setNotes] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const tabLeads = useMemo(
    () => leads.filter((l) => l.category === activeTab),
    [leads, activeTab]
  );

  const filtered = useMemo(() => {
    let list = tabLeads;
    if (statusFilter !== "all") list = list.filter((l) => l.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.brand_name?.toLowerCase().includes(q) ||
          l.x_handle?.toLowerCase().includes(q) ||
          l.tweet_text.toLowerCase().includes(q)
      );
    }
    return list;
  }, [tabLeads, statusFilter, search]);

  const newCount = (cat: "swimwear_brand" | "hotel_resort") =>
    leads.filter((l) => l.category === cat && l.status === "new").length;

  const stats = useMemo(() => {
    const base = tabLeads;
    return {
      new: base.filter((l) => l.status === "new").length,
      reviewed: base.filter((l) => l.status === "reviewed").length,
      contacted: base.filter((l) => l.status === "contacted").length,
      pass: base.filter((l) => l.status === "pass").length,
    };
  }, [tabLeads]);

  const handleRunSearch = async () => {
    setIsRunning(true);
    try {
      const res = await fetch("/api/admin/x-leads/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "all" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to run search");

      toast.success(
        `Found ${data.inserted} new leads (${data.skipped} duplicates skipped)`
      );

      // Reload leads
      const fresh = await fetch("/api/admin/x-leads/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "all" }),
      });
      if (fresh.ok) {
        // Refresh page data by re-fetching
        window.location.reload();
      }
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setIsRunning(false);
    }
  };

  const updateLead = async (id: string, update: Partial<XLead>) => {
    const res = await fetch(`/api/admin/x-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      toast.error("Failed to update lead");
      return false;
    }
    const updated = await res.json();
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...updated } : l)));
    if (selectedLead?.id === id) setSelectedLead((prev) => prev ? { ...prev, ...updated } : null);
    return true;
  };

  const handleStatusChange = async (id: string, status: XLead["status"]) => {
    await updateLead(id, { status });
  };

  const handleMarkContacted = async (lead: XLead) => {
    const ok = await updateLead(lead.id, {
      status: "contacted",
      contacted_at: new Date().toISOString(),
    });
    if (ok) toast.success("Marked as contacted");
  };

  const handleNotesSave = async (lead: XLead) => {
    await updateLead(lead.id, { notes });
  };

  const handleCopyPitch = (lead: XLead) => {
    const pitch =
      lead.category === "swimwear_brand"
        ? SWIMWEAR_PITCH(lead.brand_name || lead.x_handle || "")
        : HOTEL_PITCH(lead.brand_name || lead.x_handle || "");
    navigator.clipboard.writeText(pitch);
    setCopiedId(lead.id);
    toast.success("Pitch copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const openLead = (lead: XLead) => {
    setSelectedLead(lead);
    setNotes(lead.notes ?? "");
  };

  return (
    <div className="container px-4 md:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">X Lead Discovery</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Auto-discovered brands and hotels from X — refreshes daily at 10 AM
          </p>
        </div>
        <button
          onClick={handleRunSearch}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-sm font-semibold transition-all disabled:opacity-60"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isRunning ? "Searching X..." : "Run Search Now"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 w-fit">
        {(["swimwear_brand", "hotel_resort"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveTab(cat); setStatusFilter("all"); setSearch(""); setSelectedLead(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === cat
                ? "bg-zinc-700 text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {cat === "swimwear_brand" ? (
              <Waves className="h-4 w-4" />
            ) : (
              <Building2 className="h-4 w-4" />
            )}
            {cat === "swimwear_brand" ? "Swim Week Brands" : "Hotels & Resorts"}
            {newCount(cat) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-pink-500 text-white text-xs font-bold leading-none">
                {newCount(cat)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {(["new", "reviewed", "contacted", "pass"] as const).map((s) => (
          <div key={s} className="bg-zinc-900 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats[s]}</p>
            <p className="text-xs text-zinc-500 capitalize mt-0.5">{s}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search brand, handle, tweet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-pink-500"
          />
        </div>
        <div className="flex gap-1.5">
          {["all", "new", "reviewed", "contacted", "pass"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                statusFilter === s
                  ? "bg-pink-500 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: table + detail panel */}
      <div className={`flex gap-4 ${selectedLead ? "items-start" : ""}`}>
        {/* Table */}
        <div className={`flex-1 min-w-0 overflow-x-auto rounded-xl border border-zinc-800 ${selectedLead ? "hidden lg:block" : ""}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Brand</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">@Handle</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Tweet</th>
                <th className="text-right px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Followers</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Discovered</th>
                <th className="text-left px-4 py-3 text-xs text-zinc-500 font-semibold uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-500">
                    {leads.length === 0
                      ? 'No leads yet — click "Run Search Now" to discover brands'
                      : "No leads match your filters"}
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => openLead(lead)}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/40 cursor-pointer transition-colors ${
                      selectedLead?.id === lead.id ? "bg-zinc-800/60" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-white max-w-[140px] truncate">
                      {lead.brand_name || <span className="text-zinc-500 italic">Unknown</span>}
                    </td>
                    <td className="px-4 py-3 text-pink-400 max-w-[100px] truncate">
                      {lead.x_handle ? `@${lead.x_handle}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 max-w-xs">
                      <span className="line-clamp-2">{lead.tweet_text}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {lead.author_followers != null
                        ? lead.author_followers >= 1000
                          ? `${(lead.author_followers / 1000).toFixed(1)}K`
                          : lead.author_followers
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">
                      {formatDistanceToNow(new Date(lead.discovered_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <div className="w-full lg:w-96 shrink-0 bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
            {/* Panel header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-white truncate">{selectedLead.brand_name || "Unknown Brand"}</p>
                {selectedLead.x_handle && (
                  <p className="text-sm text-pink-400 flex items-center gap-1 mt-0.5">
                    <Twitter className="h-3.5 w-3.5" />
                    @{selectedLead.x_handle}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-zinc-500 hover:text-zinc-200 shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Full tweet */}
            <div className="bg-zinc-800/60 rounded-xl p-4 space-y-2">
              <p className="text-sm text-zinc-300 leading-relaxed">{selectedLead.tweet_text}</p>
              {selectedLead.tweet_url && (
                <a
                  href={selectedLead.tweet_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  View on X
                </a>
              )}
              {selectedLead.search_query && (
                <p className="text-xs text-zinc-600">
                  Found via: <span className="text-zinc-500">&ldquo;{selectedLead.search_query}&rdquo;</span>
                </p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Status</label>
              <select
                value={selectedLead.status}
                onChange={(e) => handleStatusChange(selectedLead.id, e.target.value as XLead["status"])}
                className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              >
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="contacted">Contacted</option>
                <option value="pass">Pass</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => handleNotesSave(selectedLead)}
                placeholder="Add notes about this lead..."
                rows={3}
                className="mt-1.5 w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={() => handleCopyPitch(selectedLead)}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white text-sm font-semibold transition-all"
              >
                {copiedId === selectedLead.id ? (
                  <>
                    <Check className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy Pitch
                  </>
                )}
              </button>
              {selectedLead.status !== "contacted" && (
                <button
                  onClick={() => handleMarkContacted(selectedLead)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm font-medium transition-all"
                >
                  <Check className="h-4 w-4" />
                  Mark as Contacted
                </button>
              )}
            </div>

            {selectedLead.contacted_at && (
              <p className="text-xs text-zinc-600 text-center">
                Contacted {formatDistanceToNow(new Date(selectedLead.contacted_at), { addSuffix: true })}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-zinc-700 mt-4 text-center">
        {filtered.length} leads shown · {leads.filter((l) => l.category === activeTab).length} total in this category
      </p>
    </div>
  );
}
