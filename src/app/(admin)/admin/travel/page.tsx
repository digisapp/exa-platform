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
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Plus,
  Loader2,
  Instagram,
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
  application_deadline: string | null;
  require_id_verification: boolean;
  applicant_count?: number;
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
  confirmed_at: string | null;
  trip: { title: string; start_at?: string; location_city: string; location_state: string } | null;
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

// Keys match the DB CHECK constraint values (pending/accepted/rejected/
// withdrawn/waitlist) — NOT the display words "approved"/"declined".
const appStatusColors: Record<string, string> = {
  pending:   "bg-amber-500/20 text-amber-400",
  accepted:  "bg-green-500/20 text-green-400",
  rejected:  "bg-red-500/20 text-red-400",
  withdrawn: "bg-zinc-500/20 text-zinc-400",
  waitlist:  "bg-blue-500/20 text-blue-400",
};

// Route all application decisions through the admin API route — it enforces
// capacity + the travel 18+/verified-ID gate, handles badges and waitlist
// promotion, and audit-logs. On acceptance it also fires the standard
// congrats chat message + email (same pattern as /admin/gigs).
async function submitAppDecision(
  app: TravelApplicant,
  status: string,
  trip?: { title: string; start_at?: string; location_city?: string; location_state?: string }
): Promise<boolean> {
  const res = await fetch(`/api/admin/gig-applications/${app.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    toast.error(data.error || "Failed to update");
    return false;
  }
  toast.success(`Application ${status}`);

  if (status === "accepted") {
    const tripInfo = trip || app.trip || undefined;
    fetch("/api/admin/send-gig-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accepted",
        modelId: app.model_id,
        gigTitle: tripInfo?.title,
        gigDate: tripInfo?.start_at
          ? format(new Date(tripInfo.start_at), "MMMM d, yyyy")
          : undefined,
        gigLocation: tripInfo
          ? [tripInfo.location_city, tripInfo.location_state].filter(Boolean).join(", ") || undefined
          : undefined,
      }),
    }).catch(() => toast.error("Accepted, but the notification email failed to send"));
  }
  return true;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTravelPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"trips" | "applicants">("trips");

  const tabs = [
    { id: "trips" as const,      label: "Trips",      icon: Plane },
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
          <p className="text-muted-foreground text-sm">Manage travel trips and model applications</p>
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

  const emptyForm = {
    title: "", location_city: "", location_state: "", description: "",
    start_at: "", end_at: "", application_deadline: "", compensation_type: "hosted",
    compensation_amount: 0, spots: 10, status: "upcoming",
    cover_image_url: "", require_id_verification: false,
  };
  const [form, setForm] = useState(emptyForm);

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
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(trip: TravelTrip) {
    setEditingTrip(trip);
    setForm({
      title: trip.title,
      location_city: trip.location_city,
      location_state: trip.location_state || "",
      description: trip.description || "",
      start_at: trip.start_at ? trip.start_at.slice(0, 10) : "",
      end_at: trip.end_at ? trip.end_at.slice(0, 10) : "",
      application_deadline: trip.application_deadline ? trip.application_deadline.slice(0, 10) : "",
      compensation_type: trip.compensation_type,
      // Stored in cents platform-wide; the form edits dollars.
      compensation_amount: (trip.compensation_amount || 0) / 100,
      spots: trip.spots,
      status: trip.status,
      cover_image_url: trip.cover_image_url || "",
      require_id_verification: trip.require_id_verification ?? false,
    });
    setShowForm(true);
  }

  async function saveTrip() {
    if (!form.title || !form.location_city || !form.start_at) {
      toast.error("Title, city, and start date are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...(editingTrip ? { id: editingTrip.id } : {}),
      title: form.title,
      location_city: form.location_city,
      location_state: form.location_state || null,
      description: form.description || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null,
      compensation_type: form.compensation_type,
      compensation_amount: Math.round(Number(form.compensation_amount) * 100),
      spots: Number(form.spots),
      status: form.status,
      cover_image_url: form.cover_image_url || null,
      require_id_verification: form.require_id_verification,
    };

    const res = await fetch("/api/admin/travel/trips", {
      method: editingTrip ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) { toast.error(data.error || "Failed to save trip"); }
    else { toast.success(editingTrip ? "Trip updated" : "Trip created"); setShowForm(false); loadTrips(); }
    setSaving(false);
  }

  async function updateTripStatus(id: string, status: string) {
    const res = await fetch("/api/admin/travel/trips", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed to update");
    else { toast.success("Status updated"); loadTrips(); }
  }

  async function deleteTrip(id: string) {
    if (!confirm("Delete this trip?")) return;
    const res = await fetch("/api/admin/travel/trips", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed to delete trip");
    else { toast.success("Trip deleted"); loadTrips(); }
  }

  async function updateAppStatus(app: TravelApplicant, status: string) {
    setProcessingApp(app.id);
    const ok = await submitAppDecision(app, status, selectedTrip || undefined);
    if (ok && selectedTrip) loadApplicants(selectedTrip);
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
                      {app.status === "accepted" && (
                        <Badge className={app.confirmed_at ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}>
                          {app.confirmed_at ? "✓ confirmed" : "awaiting confirmation"}
                        </Badge>
                      )}
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
                          onClick={() => updateAppStatus(app, "accepted")}
                          disabled={processingApp === app.id}
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        >
                          {processingApp === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateAppStatus(app, "rejected")}
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
                          {trip.require_id_verification && (
                            <Badge className="bg-cyan-500/20 text-cyan-400" title="Verified ID required to accept">
                              ID required
                            </Badge>
                          )}
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
                        <Link href={`/travel/${trip.slug}`} target="_blank">
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" value={form.application_deadline}
                  onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} />
              </div>
              <div>
                <Label>Cover Image URL</Label>
                <Input value={form.cover_image_url} placeholder="https://…"
                  onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} />
              </div>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={form.require_id_verification}
                onChange={(e) => setForm({ ...form, require_id_verification: e.target.checked })}
                className="h-4 w-4 accent-violet-500"
              />
              <span className="text-sm">
                Require verified ID to accept
                <span className="block text-xs text-muted-foreground">
                  Models can apply, but can&apos;t be accepted until an admin has verified their government ID.
                </span>
              </span>
            </label>
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
        trip:gigs!gig_applications_gig_id_fkey(title, start_at, location_city, location_state)
      `)
      .in("gig_id", gigIds)
      .order("applied_at", { ascending: false });

    setApplicants(apps || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(app: TravelApplicant, status: string) {
    setProcessingId(app.id);
    const ok = await submitAppDecision(app, status);
    if (ok) {
      setApplicants((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
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
  const approved = applicants.filter((a) => a.status === "accepted").length;

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
            <SelectItem value="accepted">Approved</SelectItem>
            <SelectItem value="rejected">Declined</SelectItem>
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
                    {app.status === "accepted" && (
                      <Badge className={app.confirmed_at ? "bg-emerald-500/20 text-emerald-400" : "bg-zinc-500/20 text-zinc-400"}>
                        {app.confirmed_at ? "✓ confirmed" : "awaiting confirmation"}
                      </Badge>
                    )}
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
                        onClick={() => updateStatus(app, "accepted")}
                        disabled={processingId === app.id}
                        className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/30"
                        variant="outline"
                      >
                        {processingId === app.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateStatus(app, "rejected")}
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
