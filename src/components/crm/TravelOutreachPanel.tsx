"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  Plus,
  Loader2,
  Instagram,
  Mail,
  Search,
  Trash2,
  Phone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TravelContact {
  id: string;
  brand_name: string;
  contact_name: string | null;
  email: string;
  email_type: string | null;
  phone: string | null;
  instagram_handle: string | null;
  website_url: string | null;
  location_city: string | null;
  location_country: string | null;
  category: string;
  notes: string | null;
  status: string;
  created_at: string;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const partnerStatusColors: Record<string, string> = {
  new: "bg-zinc-500/20 text-zinc-400",
  contacted: "bg-blue-500/20 text-blue-400",
  replied: "bg-violet-500/20 text-violet-400",
  interested: "bg-green-500/20 text-green-400",
  not_interested: "bg-red-500/20 text-red-400",
  partner: "bg-amber-500/20 text-amber-400",
};

// ─── Email templates ──────────────────────────────────────────────────────────

const DEFAULT_TRAVEL_SUBJECT =
  "EXA Travel \u00d7 {{brand_name}} \u2014 Content Partnership Proposal";

const DEFAULT_TRAVEL_BODY = `Hi {{contact_name}},

My name is Lara and I'm reaching out from EXA Models to propose an exciting content partnership with {{brand_name}}.

EXA Travel connects premium properties with our curated roster of professional models, photographers, and creative directors for fully produced content stays.

THE TEAM
We bring 10 content professionals: 8 of our top-performing models, a professional photographer, and a creative director \u2014 all experienced in delivering high-quality, brand-focused content.

THE STAY
We're seeking hosted accommodations for 10 people for a 4-night, 5-day stay at {{brand_name}}. There are no fees \u2014 your investment is the stay, and your return is a full professional content campaign.

WHAT {{brand_name}} RECEIVES
- 8 Instagram Feed Posts \u2014 one per model, high-quality editorial photography
- 8 TikTok Videos \u2014 authentic short-form content from every model
- 8 Instagram Stories \u2014 with swipe-up links directly to your booking page
- 1 Cinematic Video Reel \u2014 a professional 4\u20135 min film of the full experience
- Live Streaming \u2014 real-time content throughout the entire stay
- Trackable Booking Links \u2014 so you can measure direct ROI from our audience

Every meal, excursion, amenity, and experience during the stay will be featured and tagged across all channels, with swipe-up links driving direct bookings from our combined audience.

Would you be open to a quick call this week? I'd love to share our production reel and walk you through exactly how EXA Travel works.

Warm regards,
Lara
EXA Models | EXA Travel
partnerships@examodels.com`;

const DEFAULT_TOURISM_SUBJECT = "Influencer Partnership Opportunity";

const DEFAULT_TOURISM_BODY = `Hi {{contact_name}},

I'm Nathan, COO of EXA Models \u2014 a platform with 500+ vetted U.S.-based content creators producing high-engagement content across Instagram, TikTok, and YouTube.

Our creators specialize in destination storytelling that drives real results \u2014 bookings, traffic, and brand exposure.

WHAT WE OFFER

We can bring creators directly to your destination to produce high-quality content tailored to your marketing goals. Whether you need one creator for a focused campaign or a full group for a large-scale push, we match the right talent to your audience.

CREATOR DELIVERABLES CAN INCLUDE
\u2022 Instagram Reels, TikToks, Stories, and YouTube features
\u2022 Destination itineraries highlighting hotels, restaurants, and experiences
\u2022 High-quality licensed content for your marketing channels
\u2022 Detailed performance reporting on reach and engagement

HOW IT WORKS

You share your campaign goals

We match creators aligned with your destination and audience

Our team handles travel coordination, content direction, and publishing

You receive premium content and measurable exposure

I'd love to learn what {{brand_name}} is looking to achieve and see if this could be a fit.

Would you be available for a quick call sometime this week or next?

Best,
Nathan`;

// ─── Component ────────────────────────────────────────────────────────────────

export function TravelOutreachPanel() {
  const supabase = createClient();
  const [subTab, setSubTab] = useState<"partners" | "tourism">("partners");

  const [contacts, setContacts] = useState<TravelContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Add dialog
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    brand_name: "",
    contact_name: "",
    email: "",
    email_type: "general",
    phone: "",
    instagram_handle: "",
    website_url: "",
    location_city: "",
    location_country: "",
    notes: "",
  });

  // Send pitch dialog
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendSubject, setSendSubject] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{
    sent: number;
    failed: number;
    total: number;
  } | null>(null);

  const category = subTab === "partners" ? "travel" : "tourism_board";

  const loadContacts = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("brand_outreach_contacts") as any)
      .select("*")
      .eq("category", category)
      .order(
        subTab === "partners" ? "created_at" : "brand_name",
        { ascending: subTab !== "partners" }
      );
    setContacts(data || []);
    setLoading(false);
  }, [supabase, category, subTab]);

  useEffect(() => {
    setStatusFilter("all");
    setSearch("");
    loadContacts();
  }, [loadContacts]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await (supabase.from("brand_outreach_contacts") as any)
      .update({ status })
      .eq("id", id);
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
    setUpdatingId(null);
  }

  async function addContact() {
    if (!form.brand_name || !form.email) {
      toast.error("Name and email required");
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {
      brand_name: form.brand_name,
      contact_name: form.contact_name || null,
      email: form.email,
      status: "new",
      category,
    };
    if (subTab === "tourism") {
      payload.email_type = form.email_type;
      payload.phone = form.phone || null;
      payload.website_url = form.website_url || null;
      payload.location_city = form.location_city || null;
      payload.location_country = form.location_country || null;
      payload.notes = form.notes || null;
      payload.contact_type = "tourism";
    } else {
      payload.instagram_handle = form.instagram_handle || null;
      payload.website_url = form.website_url || null;
      payload.notes = form.notes || null;
    }
    const { error } = await (
      supabase.from("brand_outreach_contacts") as any
    ).insert(payload);
    if (error) {
      toast.error("Failed to add contact");
    } else {
      toast.success(
        subTab === "partners" ? "Partner added" : "Tourism board added"
      );
      setShowForm(false);
      setForm({
        brand_name: "",
        contact_name: "",
        email: "",
        email_type: "general",
        phone: "",
        instagram_handle: "",
        website_url: "",
        location_city: "",
        location_country: "",
        notes: "",
      });
      loadContacts();
    }
    setSaving(false);
  }

  async function deleteContact(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    await (supabase.from("brand_outreach_contacts") as any)
      .delete()
      .eq("id", id);
    toast.success("Deleted");
    loadContacts();
  }

  function openSendDialog() {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
    if (subTab === "partners") {
      setSendSubject(DEFAULT_TRAVEL_SUBJECT);
      setSendBody(DEFAULT_TRAVEL_BODY);
    } else {
      setSendSubject(DEFAULT_TOURISM_SUBJECT);
      setSendBody(DEFAULT_TOURISM_BODY);
    }
    setSendProgress(null);
    setShowSendDialog(true);
  }

  function toggleAll() {
    if (contacts.every((c) => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  async function sendPitch() {
    const selected = contacts
      .filter((c) => selectedIds.has(c.id))
      .map((c) => ({
        id: c.id,
        email: c.email,
        brand_name: c.brand_name,
        contact_name: c.contact_name,
      }));
    if (selected.length === 0) {
      toast.error("Select at least one contact");
      return;
    }
    setSending(true);
    setSendProgress({ sent: 0, failed: 0, total: selected.length });
    try {
      const res = await fetch("/api/admin/travel/send-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contacts: selected,
          subject: sendSubject,
          body: sendBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSendProgress({
        sent: data.sent,
        failed: data.failed,
        total: data.total,
      });
      toast.success(`Sent ${data.sent} / ${data.total} emails`);
      if (data.failed === 0) {
        setTimeout(() => {
          setShowSendDialog(false);
          loadContacts();
        }, 1800);
      } else {
        loadContacts();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const filtered = contacts.filter((c) => {
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    const matchSearch =
      !search ||
      c.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.location_country?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = contacts.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const accentClasses = {
    activePill:
      subTab === "partners"
        ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
        : "bg-teal-500/20 border-teal-500/40 text-teal-300",
    sendBtn:
      subTab === "partners"
        ? "border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
        : "border-teal-500/40 text-teal-400 hover:bg-teal-500/10",
    addBtn:
      subTab === "partners"
        ? "bg-violet-500 hover:bg-violet-600"
        : "bg-teal-600 hover:bg-teal-700",
    submitBtn:
      subTab === "partners"
        ? "bg-sky-600 hover:bg-sky-700 text-white"
        : "bg-teal-600 hover:bg-teal-700 text-white",
    formBtn:
      subTab === "partners"
        ? "bg-violet-500 hover:bg-violet-600"
        : "bg-teal-600 hover:bg-teal-700",
    sendIcon: subTab === "partners" ? "text-sky-400" : "text-teal-400",
    toggleLink:
      subTab === "partners"
        ? "text-sky-400 hover:text-sky-300"
        : "text-teal-400 hover:text-teal-300",
    checkboxAccent:
      subTab === "partners" ? "accent-sky-500" : "accent-teal-500",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with description */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Travel partners and tourism board outreach for EXA Travel
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl w-fit border border-zinc-800">
        <button
          onClick={() => setSubTab("partners")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === "partners"
              ? "bg-violet-500/20 text-violet-300 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4" />
          Partners
        </button>
        <button
          onClick={() => setSubTab("tourism")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            subTab === "tourism"
              ? "bg-teal-500/20 text-teal-300 shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" />
          Tourism Boards
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: "all", label: "All" },
          { key: "new", label: "New" },
          { key: "contacted", label: "Contacted" },
          { key: "replied", label: "Replied" },
          { key: "interested", label: "Interested" },
          { key: "partner", label: "Partner" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              statusFilter === key
                ? accentClasses.activePill
                : "border-zinc-700 text-muted-foreground hover:border-zinc-500"
            }`}
          >
            {label}{" "}
            {key === "all" ? contacts.length : statusCounts[key] || 0}
          </button>
        ))}
      </div>

      {/* Search + actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={
              subTab === "partners"
                ? "Search partners..."
                : "Search tourism boards..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          onClick={openSendDialog}
          size="sm"
          variant="outline"
          className={accentClasses.sendBtn}
        >
          <Mail className="h-4 w-4 mr-1.5" /> Send Pitch
        </Button>
        <Button
          onClick={() => setShowForm(true)}
          size="sm"
          className={accentClasses.addBtn}
        >
          <Plus className="h-4 w-4 mr-1.5" />{" "}
          {subTab === "partners" ? "Add Partner" : "Add Board"}
        </Button>
      </div>

      {/* Contact list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {subTab === "partners" ? (
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          ) : (
            <Globe className="h-10 w-10 mx-auto mb-3 opacity-30" />
          )}
          <p>
            No {subTab === "partners" ? "partners" : "tourism boards"} found.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((contact) => (
            <Card key={contact.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">
                      {contact.brand_name}
                    </p>
                    <Badge
                      className={
                        partnerStatusColors[contact.status] ||
                        "bg-zinc-500/20 text-zinc-400"
                      }
                    >
                      {contact.status}
                    </Badge>
                    {contact.location_country && (
                      <span className="text-xs text-muted-foreground">
                        {contact.location_city &&
                          `${contact.location_city}, `}
                        {contact.location_country}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {contact.contact_name && (
                      <span>{contact.contact_name}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {contact.email}
                    </span>
                    {contact.instagram_handle && (
                      <span className="flex items-center gap-1">
                        <Instagram className="h-3 w-3" />@
                        {contact.instagram_handle}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic truncate">
                      &ldquo;{contact.notes}&rdquo;
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={contact.status}
                    onValueChange={(v) => updateStatus(contact.id, v)}
                    disabled={updatingId === contact.id}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      {updatingId === contact.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <SelectValue />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">
                        Not Interested
                      </SelectItem>
                      <SelectItem value="partner">Partner &#10003;</SelectItem>
                    </SelectContent>
                  </Select>
                  {contact.website_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a
                        href={contact.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-500/10"
                    onClick={() =>
                      deleteContact(contact.id, contact.brand_name)
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Send Pitch dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className={`h-5 w-5 ${accentClasses.sendIcon}`} />
              {subTab === "partners"
                ? "Send Travel Partnership Pitch"
                : "Send Tourism Partnership Pitch"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recipients ({selectedIds.size} selected)</Label>
                <button
                  onClick={toggleAll}
                  className={`text-xs ${accentClasses.toggleLink}`}
                >
                  {contacts.every((c) => selectedIds.has(c.id))
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-2 bg-zinc-950">
                {contacts.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(c.id)) next.delete(c.id);
                        else next.add(c.id);
                        setSelectedIds(next);
                      }}
                      className={accentClasses.checkboxAccent}
                    />
                    <span className="text-sm font-medium flex-1">
                      {c.brand_name}
                    </span>
                    <span className="text-xs text-zinc-500 truncate max-w-[180px]">
                      {c.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label>Subject</Label>
              <Input
                value={sendSubject}
                onChange={(e) => setSendSubject(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Body */}
            <div>
              <Label>
                Email Body{" "}
                <span className="text-xs text-zinc-500 font-normal ml-1">
                  Use &#123;&#123;contact_name&#125;&#125; and
                  &#123;&#123;brand_name&#125;&#125; for personalization
                </span>
              </Label>
              <Textarea
                value={sendBody}
                onChange={(e) => setSendBody(e.target.value)}
                rows={14}
                className="mt-1 font-mono text-xs"
              />
            </div>

            {/* Progress */}
            {sendProgress && (
              <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-400">
                    {sendProgress.sent}
                  </p>
                  <p className="text-xs text-zinc-500">Sent</p>
                </div>
                {sendProgress.failed > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">
                      {sendProgress.failed}
                    </p>
                    <p className="text-xs text-zinc-500">Failed</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-300">
                    {sendProgress.total}
                  </p>
                  <p className="text-xs text-zinc-500">Total</p>
                </div>
              </div>
            )}

            <Button
              onClick={sendPitch}
              disabled={sending || selectedIds.size === 0}
              className={`w-full ${accentClasses.submitBtn}`}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" /> Send to{" "}
                  {selectedIds.size}{" "}
                  {subTab === "partners" ? "Partner" : "Board"}
                  {selectedIds.size !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add contact dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {subTab === "partners"
                ? "Add Travel Partner"
                : "Add Tourism Board"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>
                {subTab === "partners"
                  ? "Hotel / Brand Name *"
                  : "Board / Organization Name *"}
              </Label>
              <Input
                value={form.brand_name}
                onChange={(e) =>
                  setForm({ ...form, brand_name: e.target.value })
                }
                placeholder={
                  subTab === "partners" ? "UMi Tulum" : "Visit Dubai"
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) =>
                    setForm({ ...form, contact_name: e.target.value })
                  }
                  placeholder={
                    subTab === "partners" ? "Maria Santos" : "Jane Smith"
                  }
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder={
                    subTab === "partners"
                      ? "partnerships@hotel.com"
                      : "press@visitdubai.com"
                  }
                />
              </div>
            </div>

            {subTab === "partners" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Instagram</Label>
                  <Input
                    value={form.instagram_handle}
                    onChange={(e) =>
                      setForm({ ...form, instagram_handle: e.target.value })
                    }
                    placeholder="@umitulum"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={form.website_url}
                    onChange={(e) =>
                      setForm({ ...form, website_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <Label>Email Type</Label>
                    <Select
                      value={form.email_type}
                      onValueChange={(v) =>
                        setForm({ ...form, email_type: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="pr">PR</SelectItem>
                        <SelectItem value="press">Press</SelectItem>
                        <SelectItem value="partnerships">
                          Partnerships
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input
                      value={form.location_city}
                      onChange={(e) =>
                        setForm({ ...form, location_city: e.target.value })
                      }
                      placeholder="Dubai"
                    />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      value={form.location_country}
                      onChange={(e) =>
                        setForm({ ...form, location_country: e.target.value })
                      }
                      placeholder="AE"
                    />
                  </div>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    value={form.website_url}
                    onChange={(e) =>
                      setForm({ ...form, website_url: e.target.value })
                    }
                    placeholder="https://visitdubai.com"
                  />
                </div>
              </>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder={
                  subTab === "partners"
                    ? "Rooftop pool, 50 rooms, interested in content collab..."
                    : "Active influencer programs, key contacts..."
                }
              />
            </div>
            <Button
              onClick={addContact}
              disabled={saving}
              className={`w-full ${accentClasses.formBtn}`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {subTab === "partners"
                ? "Add Partner"
                : "Add Tourism Board"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
