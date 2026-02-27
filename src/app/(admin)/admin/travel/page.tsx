"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { format } from "date-fns";
import {
  Plane,
  Building2,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  Instagram,
  Globe,
  Mail,
  ExternalLink,
  Search,
  Edit,
  Trash2,
  ArrowLeft,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TravelTrip {
  id: string;
  title: string;
  slug: string;
  location_city: string;
  location_state: string;
  start_at: string;
  end_at: string | null;
  compensation_type: string;
  compensation_amount: number;
  spots: number;
  spots_filled: number;
  status: string;
  cover_image_url: string | null;
  description: string | null;
  applicant_count?: number;
}

interface TravelPartner {
  id: string;
  brand_name: string;
  contact_name: string | null;
  email: string;
  email_type: string | null;
  instagram_handle: string | null;
  website_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface TravelApplicant {
  id: string;
  gig_id: string;
  model_id: string;
  status: string;
  applied_at: string;
  instagram_handle: string | null;
  instagram_followers: number | null;
  spot_type: string | null;
  payment_status: string | null;
  admin_note: string | null;
  note: string | null;
  trip: { title: string; location_city: string; location_state: string } | null;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const tripStatusColors: Record<string, string> = {
  open:      "bg-green-500/20 text-green-400",
  upcoming:  "bg-blue-500/20 text-blue-400",
  closed:    "bg-zinc-500/20 text-zinc-400",
  cancelled: "bg-red-500/20 text-red-400",
};

const partnerStatusColors: Record<string, string> = {
  new:             "bg-zinc-500/20 text-zinc-400",
  contacted:       "bg-blue-500/20 text-blue-400",
  replied:         "bg-violet-500/20 text-violet-400",
  interested:      "bg-green-500/20 text-green-400",
  not_interested:  "bg-red-500/20 text-red-400",
  partner:         "bg-amber-500/20 text-amber-400",
};

const appStatusColors: Record<string, string> = {
  pending:  "bg-amber-500/20 text-amber-400",
  approved: "bg-green-500/20 text-green-400",
  declined: "bg-red-500/20 text-red-400",
  waitlist: "bg-blue-500/20 text-blue-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTravelPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"trips" | "partners" | "applicants">("trips");

  const tabs = [
    { id: "trips" as const,      label: "Trips",      icon: Plane },
    { id: "partners" as const,   label: "Partners",   icon: Building2 },
    { id: "applicants" as const, label: "Applicants", icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Admin
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Plane className="h-6 w-6 text-violet-400" />
            EXA Travel
          </h1>
          <p className="text-muted-foreground text-sm">Manage trips, hotel partners, and model applications</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl w-fit border border-zinc-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-violet-500/20 text-violet-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "trips"      && <TripsTab supabase={supabase} />}
      {activeTab === "partners"   && <PartnersTab supabase={supabase} />}
      {activeTab === "applicants" && <ApplicantsTab supabase={supabase} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIPS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function TripsTab({ supabase }: { supabase: any }) {
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TravelTrip | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TravelTrip | null>(null);
  const [applicants, setApplicants] = useState<TravelApplicant[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [processingApp, setProcessingApp] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", location_city: "", location_state: "", description: "",
    start_at: "", end_at: "", compensation_type: "hosted",
    compensation_amount: 0, spots: 10, status: "upcoming",
  });

  const loadTrips = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("gigs") as any)
      .select("*, gig_applications(count)")
      .eq("type", "travel")
      .order("start_at", { ascending: true });
    setTrips(
      (data || []).map((g: any) => ({
        ...g,
        applicant_count: g.gig_applications?.[0]?.count ?? 0,
      }))
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  async function loadApplicants(gig: TravelTrip) {
    setSelectedTrip(gig);
    setAppLoading(true);
    const { data } = await (supabase.from("gig_applications") as any)
      .select("*, model:models(id, username, first_name, last_name, profile_photo_url)")
      .eq("gig_id", gig.id)
      .order("applied_at", { ascending: false });
    setApplicants(data || []);
    setAppLoading(false);
  }

  function openCreate() {
    setEditingTrip(null);
    setForm({ title: "", location_city: "", location_state: "", description: "",
      start_at: "", end_at: "", compensation_type: "hosted", compensation_amount: 0,
      spots: 10, status: "upcoming" });
    setShowForm(true);
  }

  function openEdit(trip: TravelTrip) {
    setEditingTrip(trip);
    setForm({
      title: trip.title,
      location_city: trip.location_city,
      location_state: trip.location_state,
      description: trip.description || "",
      start_at: trip.start_at ? trip.start_at.slice(0, 10) : "",
      end_at: trip.end_at ? trip.end_at.slice(0, 10) : "",
      compensation_type: trip.compensation_type,
      compensation_amount: trip.compensation_amount,
      spots: trip.spots,
      status: trip.status,
    });
    setShowForm(true);
  }

  async function saveTrip() {
    if (!form.title || !form.location_city || !form.start_at) {
      toast.error("Title, city, and start date are required");
      return;
    }
    setSaving(true);
    const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const payload = {
      title: form.title,
      slug: editingTrip ? editingTrip.slug : `${slug}-${Date.now()}`,
      type: "travel",
      location_city: form.location_city,
      location_state: form.location_state,
      description: form.description || null,
      start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      compensation_type: form.compensation_type,
      compensation_amount: Number(form.compensation_amount),
      spots: Number(form.spots),
      status: form.status,
      visibility: "public",
    };

    const { error } = editingTrip
      ? await (supabase.from("gigs") as any).update(payload).eq("id", editingTrip.id)
      : await (supabase.from("gigs") as any).insert(payload);

    if (error) { toast.error("Failed to save trip"); }
    else { toast.success(editingTrip ? "Trip updated" : "Trip created"); setShowForm(false); loadTrips(); }
    setSaving(false);
  }

  async function updateTripStatus(id: string, status: string) {
    const { error } = await (supabase.from("gigs") as any).update({ status }).eq("id", id);
    if (error) toast.error("Failed to update");
    else { toast.success("Status updated"); loadTrips(); }
  }

  async function deleteTrip(id: string) {
    if (!confirm("Delete this trip?")) return;
    await (supabase.from("gigs") as any).delete().eq("id", id);
    toast.success("Trip deleted");
    loadTrips();
  }

  async function updateAppStatus(appId: string, status: string) {
    setProcessingApp(appId);
    const { error } = await (supabase.from("gig_applications") as any)
      .update({ status, reviewed_at: new Date().toISOString() }).eq("id", appId);
    if (error) toast.error("Failed to update");
    else { toast.success(`Application ${status}`); if (selectedTrip) loadApplicants(selectedTrip); }
    setProcessingApp(null);
  }

  if (loading) return <LoadingSpinner />;

  // Applicant detail view
  if (selectedTrip) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTrip(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Trips
          </Button>
          <div>
            <h2 className="font-semibold">{selectedTrip.title}</h2>
            <p className="text-sm text-muted-foreground">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />
              {selectedTrip.location_city}, {selectedTrip.location_state}
            </p>
          </div>
        </div>

        {appLoading ? <LoadingSpinner /> : applicants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No applications yet</div>
        ) : (
          <div className="space-y-3">
            {applicants.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={app.model?.profile_photo_url || undefined} />
                    <AvatarFallback>{app.model?.first_name?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">
                        {app.model?.first_name} {app.model?.last_name}
                      </p>
                      <Badge className={appStatusColors[app.status] || "bg-zinc-500/20 text-zinc-400"}>
                        {app.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {app.instagram_handle && (
                        <span className="flex items-center gap-1">
                          <Instagram className="h-3 w-3" />
                          @{app.instagram_handle}
                          {app.instagram_followers && ` · ${(app.instagram_followers / 1000).toFixed(0)}K`}
                        </span>
                      )}
                      {app.spot_type && <span>· {app.spot_type}</span>}
                      <span>· Applied {format(new Date(app.applied_at), "MMM d")}</span>
                    </div>
                    {app.note && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{app.note}&rdquo;</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/${app.model?.username}`} target="_blank">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    {app.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => updateAppStatus(app.id, "approved")}
                          disabled={processingApp === app.id}
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >
                          {processingApp === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateAppStatus(app.id, "declined")}
                          disabled={processingApp === app.id}
                          className="text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{trips.length} trips</p>
        <Button onClick={openCreate} size="sm" className="bg-violet-500 hover:bg-violet-600">
          <Plus className="h-4 w-4 mr-1.5" /> New Trip
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Plane className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No travel trips yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {trips.map((trip) => (
            <Card key={trip.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Cover image or placeholder */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-violet-500/10 flex items-center justify-center overflow-hidden">
                    {trip.cover_image_url ? (
                      <Image src={trip.cover_image_url} alt={trip.title} width={128} height={128} className="w-full h-full object-cover" />
                    ) : (
                      <Plane className="h-8 w-8 text-violet-400/40" />
                    )}
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate">{trip.title}</h3>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={tripStatusColors[trip.status] || "bg-zinc-500/20 text-zinc-400"}>
                            {trip.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {trip.location_city}{trip.location_state ? `, ${trip.location_state}` : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(trip.start_at), "MMM d, yyyy")}
                          {trip.end_at && ` – ${format(new Date(trip.end_at), "MMM d")}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {trip.spots_filled}/{trip.spots} spots
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadApplicants(trip)}
                        className="text-xs"
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {trip.applicant_count} applicants
                      </Button>

                      <Select value={trip.status} onValueChange={(v) => updateTripStatus(trip.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button size="sm" variant="ghost" onClick={() => openEdit(trip)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => deleteTrip(trip.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/travel`} target="_blank">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTrip ? "Edit Trip" : "New Travel Trip"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Dominican Republic Villa Retreat" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City *</Label>
                <Input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })}
                  placeholder="Punta Cana" />
              </div>
              <div>
                <Label>Country / State</Label>
                <Input value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })}
                  placeholder="Dominican Republic" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Compensation Type</Label>
                <Select value={form.compensation_type} onValueChange={(v) => setForm({ ...form, compensation_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hosted">Hosted (free)</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="revenue_share">Revenue Share</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount ($)</Label>
                <Input type="number" value={form.compensation_amount}
                  onChange={(e) => setForm({ ...form, compensation_amount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Model Spots</Label>
                <Input type="number" value={form.spots}
                  onChange={(e) => setForm({ ...form, spots: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="open">Open (taking apps)</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="What's included, schedule highlights..." />
            </div>
            <Button onClick={saveTrip} disabled={saving} className="w-full bg-violet-500 hover:bg-violet-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingTrip ? "Save Changes" : "Create Trip"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_TRAVEL_SUBJECT = "EXA Travel × {{brand_name}} — Content Partnership Proposal";

const DEFAULT_TRAVEL_BODY = `Hi {{contact_name}},

My name is Lara and I'm reaching out from EXA Models to propose an exciting content partnership with {{brand_name}}.

EXA Travel connects premium properties with our curated roster of professional models, photographers, and creative directors for fully produced content stays.

THE TEAM
We bring 10 content professionals: 8 of our top-performing models, a professional photographer, and a creative director — all experienced in delivering high-quality, brand-focused content.

THE STAY
We're seeking hosted accommodations for 10 people for a 4-night, 5-day stay at {{brand_name}}. There are no fees — your investment is the stay, and your return is a full professional content campaign.

WHAT {{brand_name}} RECEIVES
- 8 Instagram Feed Posts — one per model, high-quality editorial photography
- 8 TikTok Videos — authentic short-form content from every model
- 8 Instagram Stories — with swipe-up links directly to your booking page
- 1 Cinematic Video Reel — a professional 4–5 min film of the full experience
- Live Streaming — real-time content throughout the entire stay
- Trackable Booking Links — so you can measure direct ROI from our audience

Every meal, excursion, amenity, and experience during the stay will be featured and tagged across all channels, with swipe-up links driving direct bookings from our combined audience.

Would you be open to a quick call this week? I'd love to share our production reel and walk you through exactly how EXA Travel works.

Warm regards,
Lara
EXA Models | EXA Travel
partnerships@examodels.com`;

function PartnersTab({ supabase }: { supabase: any }) {
  const [partners, setPartners] = useState<TravelPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Send pitch state
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendSubject, setSendSubject] = useState(DEFAULT_TRAVEL_SUBJECT);
  const [sendBody, setSendBody] = useState(DEFAULT_TRAVEL_BODY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ sent: number; failed: number; total: number } | null>(null);

  const [form, setForm] = useState({
    brand_name: "", contact_name: "", email: "",
    instagram_handle: "", website_url: "", notes: "",
  });

  const loadPartners = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("brand_outreach_contacts") as any)
      .select("*")
      .eq("category", "travel")
      .order("created_at", { ascending: false });
    setPartners(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadPartners(); }, [loadPartners]);

  async function updateStatus(id: string, status: string) {
    setUpdatingId(id);
    await (supabase.from("brand_outreach_contacts") as any).update({ status }).eq("id", id);
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
    setUpdatingId(null);
  }

  async function addPartner() {
    if (!form.brand_name || !form.email) { toast.error("Brand name and email required"); return; }
    setSaving(true);
    const { error } = await (supabase.from("brand_outreach_contacts") as any).insert({
      ...form, category: "travel", status: "new",
    });
    if (error) toast.error("Failed to add partner");
    else { toast.success("Partner added"); setShowForm(false); setForm({ brand_name: "", contact_name: "", email: "", instagram_handle: "", website_url: "", notes: "" }); loadPartners(); }
    setSaving(false);
  }

  async function deletePartner(id: string, name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    await (supabase.from("brand_outreach_contacts") as any).delete().eq("id", id);
    toast.success("Deleted");
    loadPartners();
  }

  function openSendDialog() {
    // Pre-select all partners
    setSelectedIds(new Set(partners.map((p) => p.id)));
    setSendSubject(DEFAULT_TRAVEL_SUBJECT);
    setSendBody(DEFAULT_TRAVEL_BODY);
    setSendProgress(null);
    setShowSendDialog(true);
  }

  function toggleAll(list: TravelPartner[]) {
    if (list.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((p) => p.id)));
    }
  }

  async function sendPitch() {
    const contacts = partners
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, brand_name: p.brand_name, contact_name: p.contact_name }));

    if (contacts.length === 0) { toast.error("Select at least one partner"); return; }
    setSending(true);
    setSendProgress({ sent: 0, failed: 0, total: contacts.length });

    try {
      const res = await fetch("/api/admin/travel/send-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, subject: sendSubject, body: sendBody }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSendProgress({ sent: data.sent, failed: data.failed, total: data.total });
      toast.success(`Sent ${data.sent} / ${data.total} emails`);
      if (data.failed === 0) {
        setTimeout(() => { setShowSendDialog(false); loadPartners(); }, 1800);
      } else {
        loadPartners();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const filtered = partners.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSearch = !search || p.brand_name.toLowerCase().includes(search.toLowerCase())
      || p.contact_name?.toLowerCase().includes(search.toLowerCase())
      || p.email.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const statusCounts = partners.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Stats strip */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: "all", label: "All", count: partners.length },
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
                ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                : "border-zinc-700 text-muted-foreground hover:border-zinc-500"
            }`}
          >
            {label} {key === "all" ? partners.length : (statusCounts[key] || 0)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={openSendDialog} size="sm" variant="outline" className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10">
          <Mail className="h-4 w-4 mr-1.5" /> Send Pitch
        </Button>
        <Button onClick={() => setShowForm(true)} size="sm" className="bg-violet-500 hover:bg-violet-600">
          <Plus className="h-4 w-4 mr-1.5" /> Add Partner
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No partners found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((partner) => (
            <Card key={partner.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{partner.brand_name}</p>
                    <Badge className={partnerStatusColors[partner.status] || "bg-zinc-500/20 text-zinc-400"}>
                      {partner.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {partner.contact_name && <span>{partner.contact_name}</span>}
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />{partner.email}
                    </span>
                    {partner.instagram_handle && (
                      <span className="flex items-center gap-1">
                        <Instagram className="h-3 w-3" />@{partner.instagram_handle}
                      </span>
                    )}
                  </div>
                  {partner.notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic truncate">&ldquo;{partner.notes}&rdquo;</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Status selector */}
                  <Select
                    value={partner.status}
                    onValueChange={(v) => updateStatus(partner.id, v)}
                    disabled={updatingId === partner.id}
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      {updatingId === partner.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="replied">Replied</SelectItem>
                      <SelectItem value="interested">Interested</SelectItem>
                      <SelectItem value="not_interested">Not Interested</SelectItem>
                      <SelectItem value="partner">Partner ✓</SelectItem>
                    </SelectContent>
                  </Select>

                  {partner.website_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={partner.website_url} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:bg-red-500/10"
                    onClick={() => deletePartner(partner.id, partner.brand_name)}
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
              <Mail className="h-5 w-5 text-sky-400" />
              Send Travel Partnership Pitch
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Recipients ({selectedIds.size} selected)</Label>
                <button
                  onClick={() => toggleAll(partners)}
                  className="text-xs text-sky-400 hover:text-sky-300"
                >
                  {partners.every((p) => selectedIds.has(p.id)) ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 border border-zinc-800 rounded-lg p-2 bg-zinc-950">
                {partners.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p.id)}
                      onChange={() => {
                        const next = new Set(selectedIds);
                        if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                        setSelectedIds(next);
                      }}
                      className="accent-sky-500"
                    />
                    <span className="text-sm font-medium flex-1">{p.brand_name}</span>
                    <span className="text-xs text-zinc-500 truncate max-w-[180px]">{p.email}</span>
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
                  Use &#123;&#123;contact_name&#125;&#125; and &#123;&#123;brand_name&#125;&#125; for personalization
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
                  <p className="text-lg font-bold text-green-400">{sendProgress.sent}</p>
                  <p className="text-xs text-zinc-500">Sent</p>
                </div>
                {sendProgress.failed > 0 && (
                  <div className="text-center">
                    <p className="text-lg font-bold text-red-400">{sendProgress.failed}</p>
                    <p className="text-xs text-zinc-500">Failed</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-lg font-bold text-zinc-300">{sendProgress.total}</p>
                  <p className="text-xs text-zinc-500">Total</p>
                </div>
              </div>
            )}

            <Button
              onClick={sendPitch}
              disabled={sending || selectedIds.size === 0}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white"
            >
              {sending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Sending...</>
              ) : (
                <><Mail className="h-4 w-4 mr-2" /> Send to {selectedIds.size} Partner{selectedIds.size !== 1 ? "s" : ""}</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add partner dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Travel Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Hotel / Brand Name *</Label>
              <Input value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })}
                placeholder="UMi Tulum" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contact Name</Label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Maria Santos" />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="partnerships@hotel.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram_handle} onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
                  placeholder="@umitulum" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })}
                  placeholder="https://..." />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2} placeholder="Rooftop pool, 50 rooms, interested in content collab..." />
            </div>
            <Button onClick={addPartner} disabled={saving} className="w-full bg-violet-500 hover:bg-violet-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Add Partner
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPLICANTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ApplicantsTab({ supabase }: { supabase: any }) {
  const [applicants, setApplicants] = useState<TravelApplicant[]>([]);
  const [trips, setTrips] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripFilter, setTripFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: travelGigs } = await (supabase.from("gigs") as any)
      .select("id, title").eq("type", "travel").order("start_at", { ascending: true });
    setTrips(travelGigs || []);

    if (!travelGigs?.length) { setLoading(false); return; }

    const gigIds = travelGigs.map((g: any) => g.id);
    const { data: apps } = await (supabase.from("gig_applications") as any)
      .select(`
        *,
        model:models(id, username, first_name, last_name, profile_photo_url),
        trip:gigs!gig_applications_gig_id_fkey(title, location_city, location_state)
      `)
      .in("gig_id", gigIds)
      .order("applied_at", { ascending: false });

    setApplicants(apps || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(appId: string, status: string) {
    setProcessingId(appId);
    const { error } = await (supabase.from("gig_applications") as any)
      .update({ status, reviewed_at: new Date().toISOString() }).eq("id", appId);
    if (error) toast.error("Failed to update");
    else {
      toast.success(`Application ${status}`);
      setApplicants((prev) => prev.map((a) => a.id === appId ? { ...a, status } : a));
    }
    setProcessingId(null);
  }

  const filtered = applicants.filter((a) => {
    const matchTrip = tripFilter === "all" || a.gig_id === tripFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const name = `${a.model?.first_name} ${a.model?.last_name} ${a.model?.username}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase())
      || a.instagram_handle?.toLowerCase().includes(search.toLowerCase());
    return matchTrip && matchStatus && matchSearch;
  });

  const pending = applicants.filter((a) => a.status === "pending").length;
  const approved = applicants.filter((a) => a.status === "approved").length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4">
        <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <p className="text-xl font-bold text-amber-400">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
          <p className="text-xl font-bold text-green-400">{approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-zinc-500/10 border border-zinc-500/20 text-center">
          <p className="text-xl font-bold">{applicants.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-48" placeholder="Search models..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All trips" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trips</SelectItem>
            {trips.map((t) => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No applications found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={app.model?.profile_photo_url || undefined} />
                  <AvatarFallback>{app.model?.first_name?.[0] || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">
                      {app.model?.first_name} {app.model?.last_name}
                    </p>
                    <Badge className={appStatusColors[app.status] || "bg-zinc-500/20 text-zinc-400"}>
                      {app.status}
                    </Badge>
                    {app.spot_type && (
                      <Badge variant="outline" className="text-xs">{app.spot_type}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                    {app.trip && (
                      <span className="flex items-center gap-1">
                        <Plane className="h-3 w-3" />
                        {app.trip.title}
                      </span>
                    )}
                    {app.instagram_handle && (
                      <span className="flex items-center gap-1">
                        <Instagram className="h-3 w-3" />
                        @{app.instagram_handle}
                        {app.instagram_followers && ` · ${(app.instagram_followers / 1000).toFixed(0)}K`}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(app.applied_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {app.note && <p className="text-xs text-muted-foreground mt-1 italic truncate">&ldquo;{app.note}&rdquo;</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${app.model?.username}`} target="_blank">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {app.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => updateStatus(app.id, "approved")}
                        disabled={processingId === app.id}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30"
                        variant="outline"
                      >
                        {processingId === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(app.id, "declined")}
                        disabled={processingId === app.id}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );
}
