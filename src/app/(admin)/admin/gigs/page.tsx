"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  Eye,
  ArrowLeft,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  ImageIcon,
  Send,
  FileEdit,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
// Email sending is done via API route to keep server-only code out of client bundle

import WorkshopsPanel from "@/components/admin/gigs/WorkshopsPanel";
import GigApplicationsPanel from "@/components/admin/gigs/GigApplicationsPanel";
import GigPreviewModal from "@/components/admin/gigs/GigPreviewModal";

interface Gig {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  cover_image_url: string | null;
  gallery_images: string[] | null;
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
    height?: string | null;
    bust?: string | null;
    waist?: string | null;
    hips?: string | null;
    shoe_size?: string | null;
    dress_size?: string | null;
    eye_color?: string | null;
    hair_color?: string | null;
    tiktok_followers?: number | null;
    tiktok_username?: string | null;
    youtube_subscribers?: number | null;
    youtube_username?: string | null;
    x_followers?: number | null;
    x_username?: string | null;
    snapchat_followers?: number | null;
    snapchat_username?: string | null;
  };
}

export default function AdminGigsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<"gigs" | "workshops">("gigs");

  // Gig state
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
  const [modelBadges, setModelBadges] = useState<Set<string>>(new Set()); // model_ids that have the event badge
  const [syncingBadges, setSyncingBadges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const supabase = createClient();

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    type: "show",
    description: "",
    cover_image_url: "",
    gallery_images: [] as string[],
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
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    loadGigs();
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedGig) {
      loadApplications(selectedGig);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        model:models(id, username, first_name, last_name, profile_photo_url, height, bust, waist, hips, shoe_size, dress_size, eye_color, hair_color, tiktok_followers, tiktok_username, youtube_subscribers, youtube_username, x_followers, x_username, snapchat_followers, snapchat_username)
      `)
      .eq("gig_id", gigId)
      .order("applied_at", { ascending: false });

    // For models without a profile photo, fall back to their first portfolio image
    const apps = data || [];
    const noPhotoModelIds = apps
      .filter((a: any) => a.model && !a.model.profile_photo_url)
      .map((a: any) => a.model.id);

    if (noPhotoModelIds.length > 0) {
      const { data: fallbackPhotos } = await (supabase as any)
        .from("content_items")
        .select("model_id, media_url")
        .in("model_id", noPhotoModelIds)
        .eq("status", "portfolio")
        .eq("media_type", "image")
        .order("created_at", { ascending: false });

      if (fallbackPhotos && fallbackPhotos.length > 0) {
        const fallbackByModel: Record<string, string> = {};
        for (const photo of fallbackPhotos) {
          if (!fallbackByModel[photo.model_id]) {
            const url = photo.media_url.startsWith("http")
              ? photo.media_url
              : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${photo.media_url}`;
            fallbackByModel[photo.model_id] = url;
          }
        }
        for (const app of apps) {
          if (app.model && !app.model.profile_photo_url && fallbackByModel[app.model.id]) {
            app.model.profile_photo_url = fallbackByModel[app.model.id];
          }
        }
      }

      // Third fallback: check media_assets for models still without a photo
      const stillNoPhoto = apps
        .filter((a: any) => a.model && !a.model.profile_photo_url)
        .map((a: any) => a.model.id);

      if (stillNoPhoto.length > 0) {
        const { data: legacyPhotos } = await (supabase
          .from("media_assets") as any)
          .select("model_id, storage_path, url, photo_url")
          .in("model_id", stillNoPhoto)
          .eq("asset_type", "portfolio")
          .order("created_at", { ascending: false });

        if (legacyPhotos && legacyPhotos.length > 0) {
          const legacyByModel: Record<string, string> = {};
          for (const photo of legacyPhotos) {
            if (!legacyByModel[photo.model_id]) {
              const raw = photo.storage_path || photo.url || photo.photo_url;
              if (raw) {
                legacyByModel[photo.model_id] = raw.startsWith("http")
                  ? raw
                  : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${raw}`;
              }
            }
          }
          for (const app of apps) {
            if (app.model && !app.model.profile_photo_url && legacyByModel[app.model.id]) {
              app.model.profile_photo_url = legacyByModel[app.model.id];
            }
          }
        }
      }
    }

    setApplications(apps);

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

    // Only check badge status for accepted/approved models to avoid URL length limits
    // with large application counts (490+ UUIDs in .in() exceeds PostgREST URL limits)
    const acceptedModelIds = apps
      .filter(a => a.status === "accepted" || a.status === "approved")
      .map(a => a.model_id);
    if (acceptedModelIds.length === 0) {
      setModelBadges(new Set());
      return;
    }

    const { data: badges } = await (supabase
      .from("model_badges") as any)
      .select("model_id")
      .eq("badge_id", badge.id)
      .in("model_id", acceptedModelIds);

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
      gallery_images: [],
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

    // Parse start date/time - extract directly from string to avoid timezone conversion
    let startDate = "";
    let startTime = "";
    if (gig.start_at) {
      startDate = gig.start_at.slice(0, 10);
      const timeMatch = gig.start_at.match(/T(\d{2}):(\d{2})/);
      if (timeMatch && (timeMatch[1] !== "00" || timeMatch[2] !== "00")) {
        startTime = `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }

    // Parse end date/time - extract directly from string to avoid timezone conversion
    let endDate = "";
    let endTime = "";
    if (gig.end_at) {
      endDate = gig.end_at.slice(0, 10);
      const timeMatch = gig.end_at.match(/T(\d{2}):(\d{2})/);
      if (timeMatch && (timeMatch[1] !== "00" || timeMatch[2] !== "00")) {
        endTime = `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }

    setFormData({
      title: gig.title,
      type: gig.type,
      description: gig.description || "",
      cover_image_url: gig.cover_image_url || "",
      gallery_images: gig.gallery_images || [],
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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, WebP, or GIF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setUploading(true);
    try {
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

      const uploadResponse = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        toast.error("Failed to upload file");
        return;
      }

      setFormData({ ...formData, cover_image_url: data.publicUrl });
      toast.success("Flyer uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload flyer");
    } finally {
      setUploading(false);
    }
  }

  async function handleGalleryImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - formData.gallery_images.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''} (max 10 total)`);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 10 * 1024 * 1024;

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type for ${file.name}. Use JPEG, PNG, WebP, or GIF.`);
        return;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
    }

    setUploadingGallery(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
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
          toast.error(data.error || `Failed to upload ${file.name}`);
          continue;
        }

        const uploadResponse = await fetch(data.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (uploadResponse.ok) {
          uploadedUrls.push(data.publicUrl);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setFormData(prev => ({
          ...prev,
          gallery_images: [...prev.gallery_images, ...uploadedUrls],
        }));
        toast.success(`${uploadedUrls.length} image${uploadedUrls.length !== 1 ? 's' : ''} uploaded!`);
      }
    } catch (error) {
      console.error("Gallery upload error:", error);
      toast.error("Failed to upload images");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  }

  function removeGalleryImage(index: number) {
    setFormData(prev => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== index),
    }));
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
        const { error } = await (supabase
          .from("gigs") as any)
          .update({
            title: formData.title,
            type: formData.type,
            description: formData.description,
            cover_image_url: formData.cover_image_url || null,
            gallery_images: formData.gallery_images.length > 0 ? formData.gallery_images : null,
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
            gallery_images: formData.gallery_images.length > 0 ? formData.gallery_images : null,
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
      await (supabase.from("gig_applications") as any)
        .delete()
        .eq("gig_id", gigId);

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

      // Send email notifications to all models with profile pictures when gig is published
      if (newStatus === "open" && gig.status !== "open") {
        toast.loading("Sending email notifications to models (this may take 30+ seconds)...", { id: "gig-announce" });
        try {
          const response = await fetch("/api/admin/gigs/announce", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gigId: gig.id }),
          });
          const result = await response.json();
          if (result.success) {
            const failedNote = result.emailsFailed > 0 ? ` (${result.emailsFailed} failed)` : "";
            toast.success(`Emails sent to ${result.emailsSent} models${failedNote}`, { id: "gig-announce" });
          } else {
            toast.error("Failed to send email notifications", { id: "gig-announce" });
          }
        } catch (emailError) {
          console.error("Error sending gig announcements:", emailError);
          toast.error("Failed to send email notifications", { id: "gig-announce" });
        }
      }

      loadGigs();
    } catch (error) {
      console.error("Error updating gig status:", error);
      toast.error("Failed to update gig status");
    } finally {
      setProcessingGig(null);
    }
  }

  async function handleApplicationAction(appId: string, action: "accepted" | "rejected" | "cancelled" | "pending") {
    setProcessingApp(appId);
    try {
      const app = applications.find(a => a.id === appId);
      if (!app) return;

      const response = await fetch(`/api/admin/gig-applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update application");
      }

      // Send notification (chat message + email) via API route to bypass RLS
      if (app.model) {
        const gig = gigs.find(g => g.id === app.gig_id);

        try {
          let eventName: string | undefined;
          if (action === "accepted" && gig?.event_id) {
            const { data: eventData } = await supabase
              .from("events")
              .select("name, short_name, year")
              .eq("id", gig.event_id)
              .single() as { data: { name: string; short_name: string; year: number } | null };
            if (eventData) {
              eventName = `${eventData.short_name} ${eventData.year}`;
            }
          }

          const isCreatorHouse = gig?.title?.toLowerCase().includes("creator house");

          await fetch("/api/admin/send-gig-notification", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              modelId: app.model.id,
              gigTitle: gig?.title,
              gigDate: gig?.start_at ? new Date(gig.start_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : undefined,
              gigLocation: gig?.location_city && gig?.location_state ? `${gig.location_city}, ${gig.location_state}` : undefined,
              eventName,
              isCreatorHouse,
              applicationId: app.id,
              gigId: gig?.id,
              gigSlug: gig?.slug,
            }),
          });
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
        }
      }

      const toastMessage = action === "accepted"
        ? "Model accepted and notified!"
        : action === "cancelled"
        ? "Model cancelled"
        : action === "pending"
        ? "Application moved back to pending"
        : "Application declined";
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

  const selectedGigObj = selectedGig ? gigs.find(g => g.id === selectedGig) || null : null;

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
            <h1 className="text-3xl font-bold">
              {activeTab === "gigs" ? "Manage Gigs" : "Manage Workshops"}
            </h1>
          </div>
        </div>
        {activeTab === "gigs" && (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gig
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("gigs")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === "gigs"
              ? "bg-background shadow-sm"
              : "hover:bg-background/50 text-muted-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Gigs
        </button>
        <button
          onClick={() => setActiveTab("workshops")}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
            activeTab === "workshops"
              ? "bg-background shadow-sm"
              : "hover:bg-background/50 text-muted-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Workshops
        </button>
      </div>

      {/* Gigs Tab Content */}
      {activeTab === "gigs" && (
        <>
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
                      <Image
                        src={formData.cover_image_url}
                        alt="Gig flyer"
                        width={128}
                        height={160}
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

              {/* Gallery Images */}
              <div className="space-y-2">
                <Label>Gallery Photos <span className="text-muted-foreground text-xs">(optional, up to 10)</span></Label>
                <div className="flex flex-wrap gap-3">
                  {formData.gallery_images.map((url, index) => (
                    <div key={index} className="relative">
                      <Image
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        width={96}
                        height={96}
                        className="w-24 h-24 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeGalleryImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {formData.gallery_images.length < 10 && (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGalleryImageUpload}
                        disabled={uploadingGallery}
                      />
                      {uploadingGallery ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formData.gallery_images.length}/10 photos • Click to add multiple at once
                </p>
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
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowPreview(true)}
                  disabled={!formData.title}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
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
      <div className="space-y-6">
        {/* Gigs — full width */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pink-500" />
              All Gigs ({gigs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[500px] overflow-y-auto">
            {gigs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No gigs created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {gigs.map((gig) => (
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
              ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Applications — full width */}
        <GigApplicationsPanel
          applications={applications}
          selectedGig={selectedGigObj}
          selectedGigId={selectedGig}
          modelBadges={modelBadges}
          syncingBadges={syncingBadges}
          processingApp={processingApp}
          onApplicationAction={handleApplicationAction}
          onSyncBadges={syncBadges}
          onSendMassEmail={async () => {}}
        />
      </div>
        </>
      )}

      {/* Workshops Tab Content */}
      {activeTab === "workshops" && (
        <WorkshopsPanel />
      )}

      {/* Gig Preview Modal */}
      <GigPreviewModal
        open={showPreview}
        onOpenChange={setShowPreview}
        formData={formData}
        events={events}
      />
    </div>
  );
}
