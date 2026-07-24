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
  Mic2,
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
  Camera,
  Shirt,
  Mail,
  Phone,
  Copy,
  Send,
  Globe,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TourStop {
  id: string;
  title: string;
  slug: string;
  location_name: string | null;
  location_city: string;
  location_state: string | null;
  location_country: string | null;
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
  applicant_count?: number;
  pending_count?: number;
  accepted_count?: number;
  designer_count?: number;
  media_count?: number;
}

interface ModelApplicant {
  id: string;
  gig_id: string;
  model_id: string;
  status: string;
  applied_at: string;
  instagram_handle: string | null;
  instagram_followers: number | null;
  admin_note: string | null;
  note: string | null;
  stop: { title: string; start_at?: string; location_city: string; location_state: string | null } | null;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string | null;
  } | null;
}

interface RoleApplication {
  id: string;
  gig_id: string;
  role: "designer" | "media";
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  instagram_handle: string | null;
  website_url: string | null;
  media_type: string | null;
  message: string | null;
  status: string;
  created_at: string;
  gig: { title: string; start_at: string | null; location_city: string | null } | null;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const stopStatusColors: Record<string, string> = {
  open:      "bg-green-500/20 text-green-400",
  upcoming:  "bg-blue-500/20 text-blue-400",
  closed:    "bg-zinc-500/20 text-zinc-400",
  completed: "bg-violet-500/20 text-violet-400",
  cancelled: "bg-red-500/20 text-red-400",
};

// Keys match the gig_applications DB CHECK constraint values.
const appStatusColors: Record<string, string> = {
  pending:   "bg-amber-500/20 text-amber-400",
  accepted:  "bg-green-500/20 text-green-400",
  rejected:  "bg-red-500/20 text-red-400",
  withdrawn: "bg-zinc-500/20 text-zinc-400",
  waitlist:  "bg-blue-500/20 text-blue-400",
};

const roleAppStatusColors: Record<string, string> = {
  new:       "bg-blue-500/20 text-blue-400",
  contacted: "bg-amber-500/20 text-amber-400",
  accepted:  "bg-green-500/20 text-green-400",
  declined:  "bg-zinc-500/20 text-zinc-400",
};

const MEDIA_TYPE_LABELS: Record<string, string> = {
  photographer: "Photographer",
  videographer: "Videographer",
  press_pr: "Press / PR",
  other: "Media",
};

// Route model application decisions through the admin API route — it enforces
// capacity, bumps spots_filled, audit-logs, and on acceptance fires the
// standard congrats chat message + email (same pattern as /admin/travel).
async function submitAppDecision(
  app: ModelApplicant,
  status: string,
  stop?: { title: string; start_at?: string; location_city?: string; location_state?: string | null }
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
    const stopInfo = stop || app.stop || undefined;
    fetch("/api/admin/send-gig-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accepted",
        modelId: app.model_id,
        gigTitle: stopInfo?.title,
        gigDate: stopInfo?.start_at
          ? format(new Date(stopInfo.start_at), "MMMM d, yyyy")
          : undefined,
        gigLocation: stopInfo
          ? [stopInfo.location_city, stopInfo.location_state].filter(Boolean).join(", ") || undefined
          : undefined,
      }),
    }).catch(() => toast.error("Accepted, but the notification email failed to send"));
  }
  return true;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminTourPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"stops" | "models" | "roles" | "blast">("stops");

  const tabs = [
    { id: "stops" as const,  label: "Tour Stops",        icon: Mic2 },
    { id: "models" as const, label: "Model Applicants",  icon: Users },
    { id: "roles" as const,  label: "Designers & Media", icon: Camera },
    { id: "blast" as const,  label: "Media Blast",       icon: Send },
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mic2 className="h-6 w-6 text-pink-400" />
            Tour Dates
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage the live tour schedule — model, designer, and media applications
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tour" target="_blank">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Public page
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 p-1 rounded-xl w-fit border border-zinc-800 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-pink-500/20 text-pink-300 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "stops"  && <StopsTab supabase={supabase} />}
      {activeTab === "models" && <ModelApplicantsTab supabase={supabase} />}
      {activeTab === "roles"  && <RoleApplicationsTab supabase={supabase} />}
      {activeTab === "blast"  && <MediaBlastTab supabase={supabase} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOUR STOPS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function StopsTab({ supabase }: { supabase: any }) {
  const [stops, setStops] = useState<TourStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStop, setEditingStop] = useState<TourStop | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedStop, setSelectedStop] = useState<TourStop | null>(null);
  const [applicants, setApplicants] = useState<ModelApplicant[]>([]);
  const [appLoading, setAppLoading] = useState(false);
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Use a JPEG, PNG, or WebP image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large — 10MB max");
      return;
    }
    setUploadingCover(true);
    try {
      const res = await fetch("/api/admin/tour/upload-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to get upload URL");
        return;
      }
      const put = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        toast.error("Upload failed");
        return;
      }
      setForm((prev) => ({ ...prev, cover_image_url: data.publicUrl }));
      toast.success("Cover uploaded");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingCover(false);
    }
  }

  const emptyForm = {
    title: "", location_name: "", location_city: "", location_state: "", location_country: "",
    description: "", start_at: "", end_at: "", application_deadline: "",
    compensation_type: "none", compensation_amount: 0, spots: 10, status: "upcoming",
    cover_image_url: "",
  };
  const [form, setForm] = useState(emptyForm);

  const loadStops = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("gigs") as any)
      .select("*, gig_applications(status), tour_applications(role)")
      .eq("type", "tour")
      .order("start_at", { ascending: true });
    setStops(
      (data || []).map((g: any) => {
        const apps: { status: string }[] = g.gig_applications || [];
        const roleApps: { role: string }[] = g.tour_applications || [];
        return {
          ...g,
          applicant_count: apps.length,
          pending_count: apps.filter((a) => a.status === "pending").length,
          accepted_count: apps.filter((a) => a.status === "accepted").length,
          designer_count: roleApps.filter((a) => a.role === "designer").length,
          media_count: roleApps.filter((a) => a.role === "media").length,
        };
      })
    );
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadStops(); }, [loadStops]);

  async function loadApplicants(gig: TourStop) {
    setSelectedStop(gig);
    setAppLoading(true);
    const { data } = await (supabase.from("gig_applications") as any)
      .select("*, model:models(id, username, first_name, last_name, profile_photo_url)")
      .eq("gig_id", gig.id)
      .order("applied_at", { ascending: false });
    setApplicants(data || []);
    setAppLoading(false);
  }

  function openCreate() {
    setEditingStop(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(stop: TourStop) {
    setEditingStop(stop);
    setForm({
      title: stop.title,
      location_name: stop.location_name || "",
      location_city: stop.location_city,
      location_state: stop.location_state || "",
      location_country: stop.location_country || "",
      description: stop.description || "",
      start_at: stop.start_at ? stop.start_at.slice(0, 10) : "",
      end_at: stop.end_at ? stop.end_at.slice(0, 10) : "",
      application_deadline: stop.application_deadline ? stop.application_deadline.slice(0, 10) : "",
      compensation_type: stop.compensation_type || "none",
      // Stored in cents platform-wide; the form edits dollars.
      compensation_amount: (stop.compensation_amount || 0) / 100,
      spots: stop.spots,
      status: stop.status,
      cover_image_url: stop.cover_image_url || "",
    });
    setShowForm(true);
  }

  async function saveStop() {
    if (!form.title || !form.location_city || !form.start_at) {
      toast.error("Show name, city, and date are required");
      return;
    }
    setSaving(true);
    const payload = {
      ...(editingStop ? { id: editingStop.id } : {}),
      title: form.title,
      location_name: form.location_name || null,
      location_city: form.location_city,
      location_state: form.location_state || null,
      location_country: form.location_country || null,
      description: form.description || null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: form.end_at ? new Date(form.end_at).toISOString() : null,
      application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : null,
      compensation_type: form.compensation_type,
      compensation_amount: Math.round(Number(form.compensation_amount) * 100),
      spots: Number(form.spots),
      status: form.status,
      cover_image_url: form.cover_image_url || null,
    };

    const res = await fetch("/api/admin/tour/stops", {
      method: editingStop ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!res.ok) { toast.error(data.error || "Failed to save stop"); }
    else { toast.success(editingStop ? "Stop updated" : "Tour stop created"); setShowForm(false); loadStops(); }
    setSaving(false);
  }

  async function updateStopStatus(id: string, status: string) {
    const res = await fetch("/api/admin/tour/stops", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed to update");
    else { toast.success("Status updated"); loadStops(); }
  }

  async function deleteStop(id: string) {
    if (!confirm("Delete this tour stop?")) return;
    const res = await fetch("/api/admin/tour/stops", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error || "Failed to delete stop");
    else { toast.success("Stop deleted"); loadStops(); }
  }

  async function updateAppStatus(app: ModelApplicant, status: string) {
    setProcessingApp(app.id);
    const ok = await submitAppDecision(app, status, selectedStop || undefined);
    if (ok && selectedStop) loadApplicants(selectedStop);
    setProcessingApp(null);
  }

  if (loading) return <LoadingSpinner />;

  // Applicant detail view
  if (selectedStop) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setSelectedStop(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Stops
          </Button>
          <div>
            <h2 className="font-semibold">{selectedStop.title}</h2>
            <p className="text-sm text-muted-foreground">
              <MapPin className="inline h-3.5 w-3.5 mr-1" />
              {[selectedStop.location_city, selectedStop.location_state].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>

        {appLoading ? <LoadingSpinner /> : applicants.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No model applications yet</div>
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
        <p className="text-sm text-muted-foreground">{stops.length} tour stops</p>
        <Button onClick={openCreate} size="sm" className="bg-pink-500 hover:bg-pink-600">
          <Plus className="h-4 w-4 mr-1.5" /> New Tour Stop
        </Button>
      </div>

      {stops.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mic2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No tour stops yet. Add your first show date.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {stops.map((stop) => (
            <Card key={stop.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  {/* Cover image or placeholder */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 bg-pink-500/10 flex items-center justify-center overflow-hidden">
                    {stop.cover_image_url ? (
                      <Image src={stop.cover_image_url} alt={stop.title} width={128} height={128} className="w-full h-full object-cover" />
                    ) : (
                      <Mic2 className="h-8 w-8 text-pink-400/40" />
                    )}
                  </div>

                  <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold truncate">{stop.title}</h3>
                        <Badge className={stopStatusColors[stop.status] || "bg-zinc-500/20 text-zinc-400"}>
                          {stop.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {[stop.location_name, stop.location_city, stop.location_state].filter(Boolean).join(", ")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(stop.start_at), "MMM d, yyyy")}
                          {stop.end_at && ` – ${format(new Date(stop.end_at), "MMM d")}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {stop.spots_filled}/{stop.spots} spots
                        </span>
                      </div>
                      {/* Application funnel at a glance */}
                      <p className="mt-1.5 text-xs">
                        <span className="text-amber-400">{stop.pending_count} pending</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-green-400">{stop.accepted_count} accepted models</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-violet-300">{stop.designer_count} designers</span>
                        <span className="text-muted-foreground"> · </span>
                        <span className="text-cyan-300">{stop.media_count} media</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadApplicants(stop)}
                        className="text-xs"
                      >
                        <Users className="h-3.5 w-3.5 mr-1" />
                        {stop.applicant_count} model applicants
                      </Button>

                      <Select value={stop.status} onValueChange={(v) => updateStopStatus(stop.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button size="sm" variant="ghost" onClick={() => openEdit(stop)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10" onClick={() => deleteStop(stop.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/gigs/${stop.slug}`} target="_blank">
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
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              {editingStop ? "Edit Tour Stop" : "New Tour Stop"}
              {editingStop && (
                <Link
                  href={`/gigs/${editingStop.slug}`}
                  target="_blank"
                  className="text-xs font-normal text-pink-400 hover:text-pink-300 flex items-center gap-1"
                >
                  Preview gig page <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5">
            {/* ── Basics ── */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Show</p>
              <div>
                <Label>Show Name *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="EXA Runway Night — Miami" />
              </div>
              <div>
                <Label>Venue</Label>
                <Input value={form.location_name} onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                  placeholder="Faena Forum" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>City *</Label>
                  <Input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })}
                    placeholder="Miami" />
                </div>
                <div>
                  <Label>State</Label>
                  <Input value={form.location_state} onChange={(e) => setForm({ ...form, location_state: e.target.value })}
                    placeholder="FL" />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input value={form.location_country} onChange={(e) => setForm({ ...form, location_country: e.target.value })}
                    placeholder="USA" />
                </div>
              </div>
            </div>

            {/* ── Cover ── */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Cover Image</p>
              <div className="flex items-center gap-3">
                <div className="w-24 h-16 rounded-lg overflow-hidden bg-pink-500/10 border border-zinc-800 flex items-center justify-center shrink-0">
                  {form.cover_image_url ? (
                    <img src={form.cover_image_url} alt="Cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <Mic2 className="h-5 w-5 text-pink-400/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="inline-flex">
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                      uploadingCover
                        ? "border-zinc-700 text-zinc-500"
                        : "border-pink-500/40 text-pink-300 hover:bg-pink-500/10"
                    }`}>
                      {uploadingCover ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {uploadingCover ? "Uploading…" : form.cover_image_url ? "Replace image" : "Upload image"}
                    </span>
                  </label>
                  <Input
                    value={form.cover_image_url}
                    placeholder="…or paste an image URL"
                    className="h-8 text-xs"
                    onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* ── Dates ── */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Dates</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Show Date *</Label>
                  <Input type="date" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Application Deadline</Label>
                <Input type="date" value={form.application_deadline}
                  onChange={(e) => setForm({ ...form, application_deadline: e.target.value })} />
              </div>
            </div>

            {/* ── Compensation ── */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Model Compensation</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <Select value={form.compensation_type} onValueChange={(v) => setForm({ ...form, compensation_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not listed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="tfp">TFP (photos)</SelectItem>
                      <SelectItem value="perks">Perks</SelectItem>
                      <SelectItem value="exposure">Exposure</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ($)</Label>
                  <Input type="number" value={form.compensation_amount}
                    onChange={(e) => setForm({ ...form, compensation_amount: Number(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* ── Capacity ── */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Capacity &amp; Status</p>
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
                      <SelectItem value="upcoming">Upcoming (announced)</SelectItem>
                      <SelectItem value="open">Open (taking apps)</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Description ── */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Description</p>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4} placeholder="What's the show, who's involved, what to expect..." />
            </div>

            <Button onClick={saveStop} disabled={saving || uploadingCover} className="w-full bg-pink-500 hover:bg-pink-600">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingStop ? "Save Changes" : "Create Tour Stop"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL APPLICANTS TAB (all stops)
// ═══════════════════════════════════════════════════════════════════════════════

function ModelApplicantsTab({ supabase }: { supabase: any }) {
  const [applicants, setApplicants] = useState<ModelApplicant[]>([]);
  const [stops, setStops] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [stopFilter, setStopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: tourGigs } = await (supabase.from("gigs") as any)
      .select("id, title").eq("type", "tour").order("start_at", { ascending: true });
    setStops(tourGigs || []);

    if (!tourGigs?.length) { setLoading(false); return; }

    const gigIds = tourGigs.map((g: any) => g.id);
    const { data: apps } = await (supabase.from("gig_applications") as any)
      .select(`
        *,
        model:models(id, username, first_name, last_name, profile_photo_url),
        stop:gigs!gig_applications_gig_id_fkey(title, start_at, location_city, location_state)
      `)
      .in("gig_id", gigIds)
      .order("applied_at", { ascending: false });

    setApplicants(apps || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(app: ModelApplicant, status: string) {
    setProcessingId(app.id);
    const ok = await submitAppDecision(app, status);
    if (ok) {
      setApplicants((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    }
    setProcessingId(null);
  }

  const filtered = applicants.filter((a) => {
    const matchStop = stopFilter === "all" || a.gig_id === stopFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const name = `${a.model?.first_name} ${a.model?.last_name} ${a.model?.username}`.toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase())
      || a.instagram_handle?.toLowerCase().includes(search.toLowerCase());
    return matchStop && matchStatus && matchSearch;
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
        <Select value={stopFilter} onValueChange={setStopFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All stops" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stops</SelectItem>
            {stops.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
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
          <p>No model applications found.</p>
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
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                    {app.stop && (
                      <span className="flex items-center gap-1">
                        <Mic2 className="h-3 w-3" />
                        {app.stop.title}
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

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGNERS & MEDIA TAB
// ═══════════════════════════════════════════════════════════════════════════════

function RoleApplicationsTab({ supabase }: { supabase: any }) {
  const [apps, setApps] = useState<RoleApplication[]>([]);
  const [stops, setStops] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState("all");
  const [stopFilter, setStopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: tourGigs } = await (supabase.from("gigs") as any)
      .select("id, title").eq("type", "tour").order("start_at", { ascending: true });
    setStops(tourGigs || []);

    // Admin RLS policy on tour_applications allows direct reads/updates here.
    const { data } = await (supabase.from("tour_applications") as any)
      .select("*, gig:gigs!tour_applications_gig_id_fkey(title, start_at, location_city)")
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function updateStatus(app: RoleApplication, status: string) {
    const { error } = await (supabase.from("tour_applications") as any)
      .update({ status })
      .eq("id", app.id);
    if (error) { toast.error("Failed to update"); return; }
    setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, status } : a)));
    toast.success(`Marked ${status}`);
  }

  const filtered = apps.filter((a) => {
    const matchRole = roleFilter === "all" || a.role === roleFilter;
    const matchStop = stopFilter === "all" || a.gig_id === stopFilter;
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const haystack = `${a.name} ${a.company || ""} ${a.email} ${a.instagram_handle || ""}`.toLowerCase();
    const matchSearch = !search || haystack.includes(search.toLowerCase());
    return matchRole && matchStop && matchStatus && matchSearch;
  });

  function copyList(field: "email" | "phone") {
    const values = [...new Set(filtered.map((a) => a[field]).filter(Boolean))];
    if (!values.length) { toast.error(`No ${field}s in the current view`); return; }
    navigator.clipboard.writeText(values.join(", "));
    toast.success(`${values.length} ${field}s copied`);
  }

  function exportCsv() {
    const header = "role,name,email,phone,company,instagram,website,media_type,show,status,applied";
    const rows = filtered.map((a) =>
      [
        a.role, a.name, a.email, a.phone || "", a.company || "",
        a.instagram_handle || "", a.website_url || "", a.media_type || "",
        a.gig?.title || "", a.status, format(new Date(a.created_at), "yyyy-MM-dd"),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tour-applications.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const designers = apps.filter((a) => a.role === "designer").length;
  const media = apps.filter((a) => a.role === "media").length;
  const fresh = apps.filter((a) => a.status === "new").length;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex gap-4 flex-wrap">
        <div className="px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
          <p className="text-xl font-bold text-violet-400">{designers}</p>
          <p className="text-xs text-muted-foreground">Designers</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
          <p className="text-xl font-bold text-cyan-400">{media}</p>
          <p className="text-xs text-muted-foreground">Media</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <p className="text-xl font-bold text-blue-400">{fresh}</p>
          <p className="text-xs text-muted-foreground">New</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 w-48" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="designer">Designers</SelectItem>
            <SelectItem value="media">Media</SelectItem>
          </SelectContent>
        </Select>
        <Select value={stopFilter} onValueChange={setStopFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stops</SelectItem>
            {stops.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button size="sm" variant="outline" onClick={() => copyList("email")}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Copy emails
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyList("phone")}>
            <Phone className="h-3.5 w-3.5 mr-1" /> Copy phones
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Copy className="h-3.5 w-3.5 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No designer or media applications yet.</p>
          <p className="text-xs mt-1">They come in from the Apply buttons on /tour.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((app) => (
            <Card key={app.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center ${
                  app.role === "designer" ? "bg-violet-500/15" : "bg-cyan-500/15"
                }`}>
                  {app.role === "designer"
                    ? <Shirt className="h-5 w-5 text-violet-400" />
                    : <Camera className="h-5 w-5 text-cyan-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{app.name}</p>
                    {app.company && <span className="text-xs text-muted-foreground">· {app.company}</span>}
                    <Badge variant="outline" className="text-xs capitalize">
                      {app.role === "media" ? MEDIA_TYPE_LABELS[app.media_type || "other"] : "Designer"}
                    </Badge>
                    <Badge className={roleAppStatusColors[app.status] || "bg-zinc-500/20 text-zinc-400"}>
                      {app.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-muted-foreground">
                    {app.gig && (
                      <span className="flex items-center gap-1">
                        <Mic2 className="h-3 w-3" />
                        {app.gig.title}
                      </span>
                    )}
                    <a href={`mailto:${app.email}`} className="flex items-center gap-1 text-cyan-400 hover:underline">
                      <Mail className="h-3 w-3" />
                      {app.email}
                    </a>
                    {app.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {app.phone}
                      </span>
                    )}
                    {app.instagram_handle && (
                      <a
                        href={`https://instagram.com/${app.instagram_handle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-pink-400 hover:underline"
                      >
                        <Instagram className="h-3 w-3" />
                        @{app.instagram_handle.replace(/^@/, "")}
                      </a>
                    )}
                    {app.website_url && (
                      <a href={app.website_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
                        <Globe className="h-3 w-3" />
                        site
                      </a>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(app.created_at), "MMM d, yyyy")}
                    </span>
                  </div>
                  {app.message && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{app.message}&rdquo;</p>}
                </div>
                <div className="shrink-0">
                  <Select value={app.status} onValueChange={(v) => updateStatus(app, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA BLAST TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MediaBlastTab({ supabase }: { supabase: any }) {
  const [audience, setAudience] = useState<"roster" | "tour">("roster");
  const [recipients, setRecipients] = useState<{ id: string | null; name: string; email: string }[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{ done: number; sent: number; skipped: number; failed: number } | null>(null);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    const res = await fetch(`/api/admin/tour/media-blast?audience=${audience}`);
    if (res.ok) {
      const data = await res.json();
      setRecipients(data.recipients || []);
    } else {
      toast.error("Failed to load recipients");
      setRecipients([]);
    }
    setLoadingRecipients(false);
  }, [audience]);

  useEffect(() => { loadRecipients(); }, [loadRecipients]);

  async function sendBlast() {
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    if (recipients.length === 0) {
      toast.error("No recipients");
      return;
    }
    if (!confirm(`Send this email to ${recipients.length} media contact(s)?`)) return;

    setSending(true);
    let done = 0, sent = 0, skipped = 0, failed = 0;
    setProgress({ done, sent, skipped, failed });

    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      try {
        const res = await fetch("/api/admin/tour/media-blast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipients: batch, subject: subject.trim(), message: message.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          sent += data.emailsSent || 0;
          skipped += data.emailsSkipped || 0;
          failed += data.emailsFailed || 0;
        } else {
          failed += batch.length;
        }
      } catch {
        failed += batch.length;
      }
      done += batch.length;
      setProgress({ done, sent, skipped, failed });
    }

    setSending(false);
    if (failed === 0) toast.success(`Blast sent — ${sent} delivered${skipped ? `, ${skipped} unsubscribed` : ""}`);
    else toast.error(`Sent ${sent}, failed ${failed}`);
  }

  async function copyPhones() {
    const { data } = await (supabase.from("media_contacts") as any)
      .select("phone, status")
      .not("phone", "is", null)
      .not("status", "in", '("do_not_contact","not_interested")');
    const phones = [...new Set((data || []).map((c: any) => c.phone).filter(Boolean))];
    if (!phones.length) { toast.error("No phone numbers on the roster"); return; }
    navigator.clipboard.writeText(phones.join(", "));
    toast.success(`${phones.length} phone numbers copied`);
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v: any) => setAudience(v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="roster">Full media roster</SelectItem>
                <SelectItem value="tour">Tour media applicants only</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1.5">
              {loadingRecipients
                ? "Counting recipients…"
                : `${recipients.length} recipient(s). Opt-outs ("do not contact" / "not interested") and unsubscribes are excluded automatically.`}
            </p>
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              className="mt-1"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="EXA Tour — new show dates announced"
              maxLength={200}
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              className="mt-1"
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={"We just announced new tour dates...\n\nThe email greets each contact by name, includes your message, and links to the Tour Dates page."}
              maxLength={5000}
            />
          </div>

          {progress && (
            <p className="text-sm text-muted-foreground">
              {progress.done}/{recipients.length} processed ·{" "}
              <span className="text-green-400">{progress.sent} sent</span>
              {progress.skipped > 0 && <> · <span className="text-zinc-400">{progress.skipped} unsubscribed</span></>}
              {progress.failed > 0 && <> · <span className="text-red-400">{progress.failed} failed</span></>}
            </p>
          )}

          <Button
            onClick={sendBlast}
            disabled={sending || loadingRecipients || recipients.length === 0}
            className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            {sending ? "Sending…" : `Email ${recipients.length} media contact(s)`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-sm flex items-center gap-2">
                <Phone className="h-4 w-4 text-cyan-400" /> Mass text
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                SMS sending isn&apos;t live yet — Twilio credentials aren&apos;t configured in Vercel, so
                sends would silently no-op. Phone numbers are being collected from every media
                application; copy them to text from your phone for now.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={copyPhones}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy phones
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The full roster lives in{" "}
        <Link href="/admin/community" className="text-cyan-400 hover:underline">Community → Media</Link>
        {" "}— tour media applicants are added there automatically.
      </p>
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
