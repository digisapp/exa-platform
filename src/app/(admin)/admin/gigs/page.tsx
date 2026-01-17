"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Sparkles,
  MapPin,
  Users,
  Eye,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  ImageIcon,
  Send,
  FileEdit,
  Award,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { sendGigApplicationAcceptedEmail, sendGigApplicationRejectedEmail } from "@/lib/email";

interface Gig {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  cover_image_url: string | null;
  location_city: string;
  location_state: string;
  start_at: string;
  end_at: string;
  compensation_type: string;
  compensation_amount: number;
  spots: number;
  spots_filled: number;
  status: string;
  created_at: string;
  event_id: string | null;
}

interface Event {
  id: string;
  name: string;
  short_name: string;
  year: number;
}

interface Application {
  id: string;
  gig_id: string;
  model_id: string;
  status: string;
  applied_at: string;
  // Trip-specific fields
  trip_number?: number;
  spot_type?: string;
  payment_status?: string;
  instagram_handle?: string;
  instagram_followers?: number;
  digis_username?: string;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string;
  };
}

export default function AdminGigsPage() {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingGig, setEditingGig] = useState<Gig | null>(null);
  const [selectedGig, setSelectedGig] = useState<string | null>(null);
  const [processingApp, setProcessingApp] = useState<string | null>(null);
  const [processingGig, setProcessingGig] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [applicationFilter, setApplicationFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [tripFilter, setTripFilter] = useState<"all" | "1" | "2">("all");
  const [spotTypeFilter, setSpotTypeFilter] = useState<"all" | "paid" | "sponsored">("all");
  const [modelBadges, setModelBadges] = useState<Set<string>>(new Set()); // model_ids that have the event badge
  const [syncingBadges, setSyncingBadges] = useState(false);
  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    type: "show",
    description: "",
    cover_image_url: "",
    location_city: "",
    location_state: "",
    start_date: "",
    start_time: "",
    end_date: "",
    end_time: "",
    compensation_type: "paid",
    compensation_amount: 0,
    spots: 10,
    event_id: "",
  });

  useEffect(() => {
    loadGigs();
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedGig) {
      loadApplications(selectedGig);
      // Reset all filters when switching gigs
      setApplicationFilter("all");
      setTripFilter("all");
      setSpotTypeFilter("all");
    }
  }, [selectedGig]);

  async function loadGigs() {
    setLoading(true);
    const { data } = await (supabase
      .from("gigs") as any)
      .select("*")
      .order("created_at", { ascending: false });
    setGigs(data || []);
    setLoading(false);
  }

  async function loadEvents() {
    const { data } = await (supabase
      .from("events") as any)
      .select("id, name, short_name, year")
      .in("status", ["upcoming", "active"])
      .order("start_date", { ascending: true });
    setEvents(data || []);
  }

  async function loadApplications(gigId: string) {
    const { data } = await (supabase
      .from("gig_applications") as any)
      .select(`
        *,
        trip_number,
        spot_type,
        payment_status,
        instagram_handle,
        instagram_followers,
        digis_username,
        model:models(id, username, first_name, last_name, profile_photo_url)
      `)
      .eq("gig_id", gigId)
      .order("applied_at", { ascending: false });
    setApplications(data || []);

    // Load badge status for this gig's event
    const gig = gigs.find(g => g.id === gigId);
    if (gig?.event_id) {
      await loadBadgeStatus(gig.event_id, data || []);
    } else {
      setModelBadges(new Set());
    }
  }

  async function loadBadgeStatus(eventId: string, apps: Application[]) {
    // Get the badge for this event
    const { data: badge } = await (supabase
      .from("badges") as any)
      .select("id")
      .eq("event_id", eventId)
      .eq("badge_type", "event")
      .single();

    if (!badge) {
      setModelBadges(new Set());
      return;
    }

    // Get all model_badges for this badge
    const modelIds = apps.map(a => a.model_id);
    if (modelIds.length === 0) {
      setModelBadges(new Set());
      return;
    }

    const { data: badges } = await (supabase
      .from("model_badges") as any)
      .select("model_id")
      .eq("badge_id", badge.id)
      .in("model_id", modelIds);

    setModelBadges(new Set(badges?.map((b: any) => b.model_id) || []));
  }

  async function syncBadges() {
    const gig = gigs.find(g => g.id === selectedGig);
    if (!gig?.event_id) {
      toast.error("This gig is not linked to an event");
      return;
    }

    setSyncingBadges(true);
    try {
      const response = await fetch("/api/admin/sync-badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId: selectedGig }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to sync badges");
        return;
      }

      toast.success(`Synced ${data.awarded} badges`);

      // Reload badge status
      await loadBadgeStatus(gig.event_id, applications);
    } catch (error) {
      console.error("Sync badges error:", error);
      toast.error("Failed to sync badges");
    } finally {
      setSyncingBadges(false);
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      type: "show",
      description: "",
      cover_image_url: "",
      location_city: "",
      location_state: "",
      start_date: "",
      start_time: "",
      end_date: "",
      end_time: "",
      compensation_type: "paid",
      compensation_amount: 0,
      spots: 10,
      event_id: "",
    });
    setEditingGig(null);
    setShowForm(false);
  }

  function openEditForm(gig: Gig) {
    setEditingGig(gig);

    // Parse start date/time
    let startDate = "";
    let startTime = "";
    if (gig.start_at) {
      const start = new Date(gig.start_at);
      startDate = start.toISOString().slice(0, 10);
      const hours = start.getHours();
      const minutes = start.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        startTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    // Parse end date/time
    let endDate = "";
    let endTime = "";
    if (gig.end_at) {
      const end = new Date(gig.end_at);
      endDate = end.toISOString().slice(0, 10);
      const hours = end.getHours();
      const minutes = end.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        endTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }

    setFormData({
      title: gig.title,
      type: gig.type,
      description: gig.description || "",
      cover_image_url: gig.cover_image_url || "",
      location_city: gig.location_city || "",
      location_state: gig.location_state || "",
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      compensation_type: gig.compensation_type || "paid",
      compensation_amount: (gig.compensation_amount || 0) / 100,
      spots: gig.spots || 10,
      event_id: gig.event_id || "",
    });
    setShowForm(true);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, WebP, or GIF.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
      // Step 1: Get signed upload URL from our API
      const response = await fetch("/api/admin/gigs/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to get upload URL");
        return;
      }

      // Step 2: Upload directly to Supabase Storage using signed URL
      const uploadResponse = await fetch(data.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        toast.error("Failed to upload file");
        return;
      }

      // Step 3: Set the public URL
      setFormData({ ...formData, cover_image_url: data.publicUrl });
      toast.success("Flyer uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload flyer");
    } finally {
      setUploading(false);
    }
  }

  // Helper to combine date and optional time into timestamp
  function combineDateTime(date: string, time: string): string | null {
    if (!date) return null;
    if (time) {
      return `${date}T${time}:00`;
    }
    return `${date}T00:00:00`;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const startAt = combineDateTime(formData.start_date, formData.start_time);
    const endAt = combineDateTime(formData.end_date, formData.end_time);

    try {
      if (editingGig) {
        // Update existing gig
        const { error } = await (supabase
          .from("gigs") as any)
          .update({
            title: formData.title,
            type: formData.type,
            description: formData.description,
            cover_image_url: formData.cover_image_url || null,
            location_city: formData.location_city,
            location_state: formData.location_state,
            start_at: startAt,
            end_at: endAt,
            compensation_type: formData.compensation_type,
            compensation_amount: formData.compensation_amount * 100,
            spots: formData.spots,
            event_id: formData.event_id || null,
          })
          .eq("id", editingGig.id);

        if (error) throw error;
        toast.success("Gig updated successfully!");
      } else {
        // Create new gig
        const slug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
          "-" + Date.now().toString(36);

        const { error } = await (supabase
          .from("gigs") as any)
          .insert({
            title: formData.title,
            type: formData.type,
            description: formData.description,
            cover_image_url: formData.cover_image_url || null,
            location_city: formData.location_city,
            location_state: formData.location_state,
            start_at: startAt,
            end_at: endAt,
            compensation_type: formData.compensation_type,
            compensation_amount: formData.compensation_amount * 100,
            spots: formData.spots,
            slug,
            status: "draft",
            visibility: "public",
            event_id: formData.event_id || null,
          });

        if (error) throw error;
        toast.success("Gig created as draft. Click 'Publish' when ready to go live!");
      }

      resetForm();
      loadGigs();
    } catch (error) {
      console.error("Error saving gig:", error);
      toast.error(editingGig ? "Failed to update gig" : "Failed to create gig");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGig(gigId: string) {
    if (!confirm("Are you sure you want to delete this gig? This cannot be undone.")) {
      return;
    }

    setProcessingGig(gigId);
    try {
      // First delete any applications
      await (supabase.from("gig_applications") as any)
        .delete()
        .eq("gig_id", gigId);

      // Then delete the gig
      const { error } = await (supabase
        .from("gigs") as any)
        .delete()
        .eq("id", gigId);

      if (error) throw error;

      toast.success("Gig deleted");
      if (selectedGig === gigId) {
        setSelectedGig(null);
        setApplications([]);
      }
      loadGigs();
    } catch (error) {
      console.error("Error deleting gig:", error);
      toast.error("Failed to delete gig");
    } finally {
      setProcessingGig(null);
    }
  }

  async function handleToggleStatus(gig: Gig, targetStatus?: "draft" | "open" | "closed") {
    // If no target specified, cycle: draft → open, open → closed, closed → open
    let newStatus: string;
    if (targetStatus) {
      newStatus = targetStatus;
    } else if (gig.status === "draft") {
      newStatus = "open";
    } else if (gig.status === "open") {
      newStatus = "closed";
    } else {
      newStatus = "open";
    }

    setProcessingGig(gig.id);

    try {
      const { error } = await (supabase
        .from("gigs") as any)
        .update({ status: newStatus })
        .eq("id", gig.id);

      if (error) throw error;

      const messages: Record<string, string> = {
        draft: "Gig moved to draft",
        open: "Gig published! Models can now apply.",
        closed: "Gig closed",
      };
      toast.success(messages[newStatus] || "Status updated");
      loadGigs();
    } catch (error) {
      console.error("Error updating gig status:", error);
      toast.error("Failed to update gig status");
    } finally {
      setProcessingGig(null);
    }
  }

  async function handleApplicationAction(appId: string, action: "accepted" | "rejected" | "cancelled") {
    setProcessingApp(appId);
    try {
      const app = applications.find(a => a.id === appId);
      if (!app) return;

      // Update application status via API (bypasses RLS)
      const response = await fetch(`/api/admin/gig-applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update application");
      }

      // Send notification via chat for both accept and decline
      if (app.model) {
        const gig = gigs.find(g => g.id === app.gig_id);

        // Get admin's actor id
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: adminActor } = await supabase
            .from("actors")
            .select("id")
            .eq("user_id", user.id)
            .single() as { data: { id: string } | null };

          // Get model's actor id and email - use user_id from model record
          const { data: modelRecord } = await supabase
            .from("models")
            .select("user_id, email, first_name, username")
            .eq("id", app.model.id)
            .single() as { data: { user_id: string; email: string | null; first_name: string | null; username: string } | null };

          const { data: modelActor } = modelRecord ? await supabase
            .from("actors")
            .select("id")
            .eq("user_id", modelRecord.user_id)
            .eq("type", "model")
            .single() as { data: { id: string } | null } : { data: null };

          if (adminActor && modelActor) {
            // Create or get conversation
            const { data: existingConv } = await supabase
              .from("conversation_participants")
              .select("conversation_id")
              .eq("actor_id", adminActor.id) as { data: { conversation_id: string }[] | null };

            let conversationId: string | null = null;

            if (existingConv) {
              for (const cp of existingConv) {
                const { data: hasModel } = await supabase
                  .from("conversation_participants")
                  .select("actor_id")
                  .eq("conversation_id", cp.conversation_id)
                  .eq("actor_id", modelActor.id)
                  .single();
                if (hasModel) {
                  conversationId = cp.conversation_id;
                  break;
                }
              }
            }

            if (!conversationId) {
              const { data: newConv } = await (supabase
                .from("conversations") as any)
                .insert({ type: "direct" })
                .select()
                .single();
              if (newConv) {
                conversationId = newConv.id;
                await (supabase.from("conversation_participants") as any).insert([
                  { conversation_id: conversationId, actor_id: adminActor.id },
                  { conversation_id: conversationId, actor_id: modelActor.id },
                ]);
              }
            }

            if (conversationId) {
              const message = action === "accepted"
                ? `Congratulations! You've been accepted for "${gig?.title || "a gig"}". We'll be in touch with more details soon!`
                : action === "cancelled"
                ? `Your spot for "${gig?.title || "a gig"}" has been cancelled. If you have questions, please reach out to us.`
                : `Thank you for your interest in "${gig?.title || "a gig"}". Unfortunately, we weren't able to accept your application at this time. We encourage you to apply for future opportunities!`;

              await (supabase.from("messages") as any).insert({
                conversation_id: conversationId,
                sender_id: adminActor.id,
                content: message,
                is_system: false,
              });
            }
          }

          // Send email notification
          if (modelRecord?.email) {
            const modelName = modelRecord.first_name || modelRecord.username || "Model";
            const gigTitle = gig?.title || "a gig";

            try {
              if (action === "accepted") {
                // Get event info if linked
                let eventName: string | undefined;
                if (gig?.event_id) {
                  const { data: eventData } = await supabase
                    .from("events")
                    .select("name, short_name, year")
                    .eq("id", gig.event_id)
                    .single() as { data: { name: string; short_name: string; year: number } | null };
                  if (eventData) {
                    eventName = `${eventData.short_name} ${eventData.year}`;
                  }
                }

                await sendGigApplicationAcceptedEmail({
                  to: modelRecord.email,
                  modelName,
                  gigTitle,
                  gigDate: gig?.start_at ? new Date(gig.start_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : undefined,
                  gigLocation: gig?.location_city && gig?.location_state ? `${gig.location_city}, ${gig.location_state}` : undefined,
                  eventName,
                });
              } else if (action === "rejected") {
                await sendGigApplicationRejectedEmail({
                  to: modelRecord.email,
                  modelName,
                  gigTitle,
                });
              }
            } catch (emailError) {
              console.error("Failed to send email notification:", emailError);
              // Don't fail the whole operation if email fails
            }
          }
        }
      }

      const toastMessage = action === "accepted"
        ? "Model accepted and notified!"
        : action === "cancelled"
        ? "Model cancelled and notified"
        : "Application declined and model notified";
      toast.success(toastMessage);
      loadApplications(app.gig_id);
    } catch (error) {
      console.error("Error updating application:", error);
      toast.error("Failed to update application");
    } finally {
      setProcessingApp(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Gigs</h1>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Gig
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingGig ? "Edit Gig" : "Create New Gig"}</CardTitle>
            <CardDescription>
              {editingGig ? "Update the details for this gig" : "Fill in the details for the new gig"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Fashion Week Show"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v) => setFormData({ ...formData, type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="show">Show</SelectItem>
                      <SelectItem value="photoshoot">Photoshoot</SelectItem>
                      <SelectItem value="travel">Travel</SelectItem>
                      <SelectItem value="campaign">Campaign</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="hosting">Hosting</SelectItem>
                      <SelectItem value="fun">Fun</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Event Link */}
              {events.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="event">Link to Event <span className="text-muted-foreground text-xs">(optional - for badges)</span></Label>
                  <Select
                    value={formData.event_id || "none"}
                    onValueChange={(v) => setFormData({ ...formData, event_id: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an event (models get badge when accepted)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No event</SelectItem>
                      {events.map((event) => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.short_name} {event.year} - {event.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    When linked to an event, accepted models will automatically receive the event badge on their profile.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the gig..."
                  rows={3}
                />
              </div>

              {/* Flyer Upload */}
              <div className="space-y-2">
                <Label>Flyer / Cover Image <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="flex items-start gap-4">
                  {formData.cover_image_url ? (
                    <div className="relative">
                      <img
                        src={formData.cover_image_url}
                        alt="Gig flyer"
                        className="w-32 h-40 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData({ ...formData, cover_image_url: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-40 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      {uploading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-xs text-muted-foreground text-center px-2">Upload Flyer</span>
                        </>
                      )}
                    </label>
                  )}
                  <div className="text-sm text-muted-foreground">
                    <p>Upload a flyer or promotional image for this gig.</p>
                    <p className="mt-1">Recommended: Portrait orientation (e.g., 800x1000px)</p>
                    <p>Max size: 10MB</p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.location_city}
                    onChange={(e) => setFormData({ ...formData, location_city: e.target.value })}
                    placeholder="Miami"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={formData.location_state}
                    onChange={(e) => setFormData({ ...formData, location_state: e.target.value })}
                    placeholder="FL"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_time">Start Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">End Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="compensation">Compensation Type</Label>
                  <Select
                    value={formData.compensation_type}
                    onValueChange={(v) => setFormData({ ...formData, compensation_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="tfp">TFP (Trade for Print)</SelectItem>
                      <SelectItem value="perks">Perks</SelectItem>
                      <SelectItem value="exposure">Exposure</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    value={formData.compensation_amount}
                    onChange={(e) => setFormData({ ...formData, compensation_amount: parseInt(e.target.value) || 0 })}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spots">Spots Available</Label>
                  <Input
                    id="spots"
                    type="number"
                    min="1"
                    value={formData.spots}
                    onChange={(e) => setFormData({ ...formData, spots: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingGig ? "Update Gig" : "Create Gig"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Gigs List with Applications */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Gigs Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              All Gigs ({gigs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {gigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No gigs created yet</p>
              </div>
            ) : (
              gigs.map((gig) => (
                <div
                  key={gig.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedGig === gig.id
                      ? "border-pink-500 bg-pink-500/10"
                      : "hover:border-muted-foreground/50"
                  }`}
                >
                  <div
                    className="cursor-pointer"
                    onClick={() => setSelectedGig(gig.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{gig.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">{gig.type}</Badge>
                          <Badge
                            variant={gig.status === "open" ? "default" : "secondary"}
                            className={
                              gig.status === "open" ? "bg-green-500" :
                              gig.status === "draft" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                              ""
                            }
                          >
                            {gig.status === "draft" ? "Draft" : gig.status}
                          </Badge>
                          {gig.event_id && (
                            <Badge variant="outline" className="bg-pink-500/10 text-pink-500 border-pink-500/30">
                              {events.find(e => e.id === gig.event_id)?.short_name || "Event"}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">{gig.spots_filled || 0}/{gig.spots} spots</p>
                        {gig.start_at && (
                          <p className="text-muted-foreground">
                            {new Date(gig.start_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {(gig.location_city || gig.location_state) && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {gig.location_city}, {gig.location_state}
                      </div>
                    )}
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); openEditForm(gig); }}
                      disabled={processingGig === gig.id}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    {gig.status === "draft" ? (
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(gig, "open"); }}
                        disabled={processingGig === gig.id}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        {processingGig === gig.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-3 w-3 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(gig); }}
                        disabled={processingGig === gig.id}
                      >
                        {processingGig === gig.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : gig.status === "open" ? (
                          <>
                            <ToggleRight className="h-3 w-3 mr-1" />
                            Close
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-3 w-3 mr-1" />
                            Reopen
                          </>
                        )}
                      </Button>
                    )}
                    {gig.status !== "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); handleToggleStatus(gig, "draft"); }}
                        disabled={processingGig === gig.id}
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                      >
                        {processingGig === gig.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <FileEdit className="h-3 w-3 mr-1" />
                            Unpublish
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-auto"
                      onClick={(e) => { e.stopPropagation(); handleDeleteGig(gig.id); }}
                      disabled={processingGig === gig.id}
                    >
                      {processingGig === gig.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Applications Column */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Applications {selectedGig && `(${applications.length})`}
              </span>
              {/* Badge Sync Button - only show for event-linked gigs */}
              {selectedGig && gigs.find(g => g.id === selectedGig)?.event_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncBadges}
                  disabled={syncingBadges}
                  className="text-xs"
                >
                  {syncingBadges ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sync Badges
                </Button>
              )}
            </CardTitle>
            <CardDescription>
              {selectedGig
                ? `Showing applications for: ${gigs.find(g => g.id === selectedGig)?.title}`
                : "Select a gig to view applications"}
            </CardDescription>
            {/* Badge Warning - show if approved models are missing badges */}
            {selectedGig && gigs.find(g => g.id === selectedGig)?.event_id && (() => {
              const approvedWithoutBadge = applications.filter(
                a => (a.status === "accepted" || a.status === "approved") && !modelBadges.has(a.model_id)
              );
              if (approvedWithoutBadge.length > 0) {
                return (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{approvedWithoutBadge.length} approved model(s) missing event badge</span>
                  </div>
                );
              }
              return null;
            })()}
            {/* Filter Tabs */}
            {selectedGig && applications.length > 0 && (
              <div className="flex gap-1 mt-3 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => setApplicationFilter("all")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    applicationFilter === "all"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  All ({applications.length})
                </button>
                <button
                  onClick={() => setApplicationFilter("pending")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    applicationFilter === "pending"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Pending ({applications.filter(a => a.status === "pending").length})
                </button>
                <button
                  onClick={() => setApplicationFilter("approved")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    applicationFilter === "approved"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Approved ({applications.filter(a => a.status === "accepted" || a.status === "approved").length})
                </button>
                <button
                  onClick={() => setApplicationFilter("declined")}
                  className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    applicationFilter === "declined"
                      ? "bg-background shadow-sm"
                      : "hover:bg-background/50 text-muted-foreground"
                  }`}
                >
                  Declined ({applications.filter(a => a.status === "rejected" || a.status === "cancelled").length})
                </button>
              </div>
            )}
            {/* Trip-specific filters - only show for travel gigs with trip data */}
            {selectedGig && applications.some(a => a.trip_number) && (
              <div className="flex gap-4 mt-2">
                {/* Trip Number Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Trip:</span>
                  <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                    <button
                      onClick={() => setTripFilter("all")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        tripFilter === "all"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTripFilter("1")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        tripFilter === "1"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      Trip 1
                    </button>
                    <button
                      onClick={() => setTripFilter("2")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        tripFilter === "2"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      Trip 2
                    </button>
                  </div>
                </div>
                {/* Spot Type Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Type:</span>
                  <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                    <button
                      onClick={() => setSpotTypeFilter("all")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        spotTypeFilter === "all"
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSpotTypeFilter("paid")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        spotTypeFilter === "paid"
                          ? "bg-green-500/20 text-green-500 shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      Paid
                    </button>
                    <button
                      onClick={() => setSpotTypeFilter("sponsored")}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        spotTypeFilter === "sponsored"
                          ? "bg-violet-500/20 text-violet-500 shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      Sponsored
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
            {!selectedGig ? (
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a gig to view applications</p>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No applications yet</p>
              </div>
            ) : (
              applications
                .filter((app) => {
                  // Status filter
                  if (applicationFilter === "pending" && app.status !== "pending") return false;
                  if (applicationFilter === "approved" && app.status !== "accepted" && app.status !== "approved") return false;
                  if (applicationFilter === "declined" && app.status !== "rejected" && app.status !== "cancelled") return false;
                  // Trip filter
                  if (tripFilter !== "all" && app.trip_number !== parseInt(tripFilter)) return false;
                  // Spot type filter
                  if (spotTypeFilter !== "all" && app.spot_type !== spotTypeFilter) return false;
                  return true;
                })
                .length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No matching applications</p>
                </div>
              ) : applications
                .filter((app) => {
                  // Status filter
                  if (applicationFilter === "pending" && app.status !== "pending") return false;
                  if (applicationFilter === "approved" && app.status !== "accepted" && app.status !== "approved") return false;
                  if (applicationFilter === "declined" && app.status !== "rejected" && app.status !== "cancelled") return false;
                  // Trip filter
                  if (tripFilter !== "all" && app.trip_number !== parseInt(tripFilter)) return false;
                  // Spot type filter
                  if (spotTypeFilter !== "all" && app.spot_type !== spotTypeFilter) return false;
                  return true;
                })
                .map((app) => (
                <div
                  key={app.id}
                  className="p-4 rounded-lg border flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                      {app.model?.profile_photo_url ? (
                        <img
                          src={app.model.profile_photo_url}
                          alt={app.model.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          {app.model?.first_name?.charAt(0) || app.model?.username?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/${app.model?.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:text-pink-500"
                      >
                        {app.model?.first_name || app.model?.last_name
                          ? `${app.model?.first_name || ''} ${app.model?.last_name || ''}`.trim()
                          : `@${app.model?.username}`}
                      </Link>
                      {(app.model?.first_name || app.model?.last_name) && (
                        <p className="text-sm text-muted-foreground">
                          @{app.model?.username}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(app.applied_at).toLocaleDateString()}
                      </p>
                      {/* Badge status for event-linked gigs */}
                      {gigs.find(g => g.id === selectedGig)?.event_id && (
                        <div className="flex items-center gap-1 mt-1">
                          {modelBadges.has(app.model_id) ? (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                              <Award className="h-3 w-3 mr-1" />
                              Badge
                            </Badge>
                          ) : (app.status === "accepted" || app.status === "approved") ? (
                            <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No Badge
                            </Badge>
                          ) : null}
                        </div>
                      )}
                      {/* Trip-specific info */}
                      {app.trip_number && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Trip {app.trip_number}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              app.spot_type === "paid"
                                ? "bg-green-500/10 text-green-500 border-green-500/30"
                                : "bg-violet-500/10 text-violet-500 border-violet-500/30"
                            }`}
                          >
                            {app.spot_type === "paid" ? "Paid $1,400" : "Sponsored"}
                          </Badge>
                          {app.payment_status === "paid" && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                              Paid ✓
                            </Badge>
                          )}
                        </div>
                      )}
                      {app.instagram_handle && (
                        <p className="text-xs text-muted-foreground mt-1">
                          IG: @{app.instagram_handle} ({app.instagram_followers?.toLocaleString()} followers)
                        </p>
                      )}
                      {app.digis_username && (
                        <p className="text-xs text-muted-foreground">
                          Digis: {app.digis_username}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === "pending" ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplicationAction(app.id, "rejected")}
                          disabled={processingApp === app.id}
                        >
                          {processingApp === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApplicationAction(app.id, "accepted")}
                          disabled={processingApp === app.id}
                        >
                          {processingApp === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Accept
                            </>
                          )}
                        </Button>
                      </>
                    ) : app.status === "accepted" || app.status === "approved" ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accepted
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2"
                          onClick={() => handleApplicationAction(app.id, "cancelled")}
                          disabled={processingApp === app.id}
                        >
                          {processingApp === app.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className={app.status === "cancelled" ? "bg-red-500/10 text-red-500" : ""}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {app.status === "cancelled" ? "Cancelled" : app.status}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
