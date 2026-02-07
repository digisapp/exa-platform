"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  GraduationCap,
  Calendar,
  DollarSign,
  Search,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
// Email sending is done via API route to keep server-only code out of client bundle

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
  };
}

interface Workshop {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  cover_image_url: string | null;
  location_name: string | null;
  location_city: string | null;
  location_state: string | null;
  location_address: string | null;
  date: string;
  start_time: string | null;
  end_time: string | null;
  price_cents: number;
  original_price_cents: number | null;
  spots_available: number | null;
  spots_sold: number;
  highlights: string[] | null;
  what_to_bring: string[] | null;
  status: string;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

interface WorkshopRegistration {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  quantity: number;
  total_price_cents: number;
  status: string;
  completed_at: string | null;
  created_at: string;
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
  const [applicationFilter, setApplicationFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [tripFilter, setTripFilter] = useState<"all" | "1" | "2">("all");
  const [spotTypeFilter, setSpotTypeFilter] = useState<"all" | "paid" | "sponsored">("all");
  const [modelSearch, setModelSearch] = useState("");
  const [modelBadges, setModelBadges] = useState<Set<string>>(new Set()); // model_ids that have the event badge
  const [syncingBadges, setSyncingBadges] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewExpandedImage, setPreviewExpandedImage] = useState<string | null>(null);

  // Workshop state
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [workshopRegistrations, setWorkshopRegistrations] = useState<WorkshopRegistration[]>([]);
  const [workshopsLoading, setWorkshopsLoading] = useState(false);
  const [showWorkshopForm, setShowWorkshopForm] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [workshopSaving, setWorkshopSaving] = useState(false);
  const [workshopUploading, setWorkshopUploading] = useState(false);
  const [workshopFormData, setWorkshopFormData] = useState({
    title: "",
    subtitle: "",
    slug: "",
    description: "",
    cover_image_url: "",
    location_city: "",
    location_state: "",
    location_address: "",
    date: "",
    start_time: "",
    end_time: "",
    price: "",
    original_price: "",
    spots_available: "",
    highlights: "",
    what_to_bring: "",
    status: "upcoming",
    is_featured: false,
    meta_title: "",
    meta_description: "",
  });

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
      // Reset all filters when switching gigs
      setApplicationFilter("all");
      setTripFilter("all");
      setSpotTypeFilter("all");
      setModelSearch("");
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
      // Extract date part (YYYY-MM-DD) directly from the stored string
      startDate = gig.start_at.slice(0, 10);
      // Extract time part (HH:MM) if present and not midnight
      const timeMatch = gig.start_at.match(/T(\d{2}):(\d{2})/);
      if (timeMatch && (timeMatch[1] !== "00" || timeMatch[2] !== "00")) {
        startTime = `${timeMatch[1]}:${timeMatch[2]}`;
      }
    }

    // Parse end date/time - extract directly from string to avoid timezone conversion
    let endDate = "";
    let endTime = "";
    if (gig.end_at) {
      // Extract date part (YYYY-MM-DD) directly from the stored string
      endDate = gig.end_at.slice(0, 10);
      // Extract time part (HH:MM) if present and not midnight
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

  async function handleGalleryImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these would exceed 10 images
    const remainingSlots = 10 - formData.gallery_images.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more image${remainingSlots !== 1 ? 's' : ''} (max 10 total)`);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxSize = 10 * 1024 * 1024; // 10MB

    // Validate all files first
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
        // Get signed upload URL
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

        // Upload to storage
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
      // Reset the input
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
        // Update existing gig
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

      // Send notification (chat message + email) via API route to bypass RLS
      if (app.model) {
        const gig = gigs.find(g => g.id === app.gig_id);

        try {
          // Get event name for accepted gigs
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

          // Check if this is a Creator House gig
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
              // Creator House specific fields
              isCreatorHouse,
              applicationId: app.id,
              gigId: gig?.id,
              gigSlug: gig?.slug,
            }),
          });
        } catch (notifyError) {
          console.error("Failed to send notification:", notifyError);
          // Don't fail the whole operation if notification fails
        }
      }

      const toastMessage = action === "accepted"
        ? "Model accepted and notified!"
        : action === "cancelled"
        ? "Model cancelled"
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

  // Workshop functions
  const loadWorkshops = useCallback(async () => {
    setWorkshopsLoading(true);
    const { data, error } = await (supabase as any)
      .from("workshops")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error("Error loading workshops:", error);
      toast.error("Failed to load workshops");
    } else {
      setWorkshops(data || []);
    }
    setWorkshopsLoading(false);
  }, [supabase]);

  const loadWorkshopRegistrations = async (workshopId: string) => {
    const { data, error } = await (supabase as any)
      .from("workshop_registrations")
      .select("*")
      .eq("workshop_id", workshopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading registrations:", error);
      toast.error("Failed to load registrations");
    } else {
      setWorkshopRegistrations(data || []);
    }
  };

  useEffect(() => {
    if (activeTab === "workshops" && workshops.length === 0) {
      loadWorkshops();
    }
  }, [activeTab, workshops.length, loadWorkshops]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleWorkshopTitleChange = (title: string) => {
    setWorkshopFormData(prev => ({
      ...prev,
      title,
      slug: editingWorkshop ? prev.slug : generateSlug(title),
    }));
  };

  const handleWorkshopImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    setWorkshopUploading(true);
    try {
      // Step 1: Get signed upload URL from our API
      const response = await fetch("/api/admin/workshops/upload", {
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
      setWorkshopFormData(prev => ({ ...prev, cover_image_url: data.publicUrl }));
      toast.success("Flyer uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload flyer");
    } finally {
      setWorkshopUploading(false);
    }
  };

  const resetWorkshopForm = () => {
    setWorkshopFormData({
      title: "",
      subtitle: "",
      slug: "",
      description: "",
      cover_image_url: "",
      location_city: "",
      location_state: "",
      location_address: "",
      date: "",
      start_time: "",
      end_time: "",
      price: "",
      original_price: "",
      spots_available: "",
      highlights: "",
      what_to_bring: "",
      status: "upcoming",
      is_featured: false,
      meta_title: "",
      meta_description: "",
    });
    setEditingWorkshop(null);
  };

  const openWorkshopEditForm = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setWorkshopFormData({
      title: workshop.title,
      subtitle: workshop.subtitle || "",
      slug: workshop.slug,
      description: workshop.description || "",
      cover_image_url: workshop.cover_image_url || "",
      location_city: workshop.location_city || "",
      location_state: workshop.location_state || "",
      location_address: workshop.location_address || "",
      date: workshop.date,
      start_time: workshop.start_time || "",
      end_time: workshop.end_time || "",
      price: (workshop.price_cents / 100).toString(),
      original_price: workshop.original_price_cents ? (workshop.original_price_cents / 100).toString() : "",
      spots_available: workshop.spots_available?.toString() || "",
      highlights: workshop.highlights?.join("\n") || "",
      what_to_bring: workshop.what_to_bring?.join("\n") || "",
      status: workshop.status,
      is_featured: workshop.is_featured,
      meta_title: workshop.meta_title || "",
      meta_description: workshop.meta_description || "",
    });
    setShowWorkshopForm(true);
  };

  const handleWorkshopSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkshopSaving(true);

    const workshopData = {
      title: workshopFormData.title,
      subtitle: workshopFormData.subtitle || null,
      slug: workshopFormData.slug,
      description: workshopFormData.description || null,
      cover_image_url: workshopFormData.cover_image_url || null,
      location_city: workshopFormData.location_city || null,
      location_state: workshopFormData.location_state || null,
      location_address: workshopFormData.location_address || null,
      date: workshopFormData.date,
      start_time: workshopFormData.start_time || null,
      end_time: workshopFormData.end_time || null,
      price_cents: Math.round(parseFloat(workshopFormData.price) * 100),
      original_price_cents: workshopFormData.original_price ? Math.round(parseFloat(workshopFormData.original_price) * 100) : null,
      spots_available: workshopFormData.spots_available ? parseInt(workshopFormData.spots_available) : null,
      highlights: workshopFormData.highlights ? workshopFormData.highlights.split("\n").filter(h => h.trim()) : null,
      what_to_bring: workshopFormData.what_to_bring ? workshopFormData.what_to_bring.split("\n").filter(h => h.trim()) : null,
      status: workshopFormData.status,
      is_featured: workshopFormData.is_featured,
      meta_title: workshopFormData.meta_title || null,
      meta_description: workshopFormData.meta_description || null,
    };

    try {
      if (editingWorkshop) {
        const { error } = await (supabase as any)
          .from("workshops")
          .update(workshopData)
          .eq("id", editingWorkshop.id);

        if (error) throw error;
        toast.success("Workshop updated successfully");
      } else {
        const { error } = await (supabase as any)
          .from("workshops")
          .insert(workshopData);

        if (error) throw error;
        toast.success("Workshop created successfully");
      }

      setShowWorkshopForm(false);
      resetWorkshopForm();
      loadWorkshops();
    } catch (error: any) {
      console.error("Error saving workshop:", error);
      toast.error(error.message || "Failed to save workshop");
    } finally {
      setWorkshopSaving(false);
    }
  };

  const handleDeleteWorkshop = async (workshop: Workshop) => {
    if (!confirm(`Are you sure you want to delete "${workshop.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from("workshops")
        .delete()
        .eq("id", workshop.id);

      if (error) throw error;
      toast.success("Workshop deleted");
      loadWorkshops();
    } catch (error: any) {
      console.error("Error deleting workshop:", error);
      toast.error(error.message || "Failed to delete workshop");
    }
  };

  const viewWorkshopRegistrations = async (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    await loadWorkshopRegistrations(workshop.id);
    setShowRegistrations(true);
  };

  const getWorkshopStatusBadge = (status: string) => {
    switch (status) {
      case "upcoming":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Upcoming</Badge>;
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case "completed":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Cancelled</Badge>;
      case "draft":
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
            <h1 className="text-3xl font-bold">
              {activeTab === "gigs" ? "Manage Gigs" : "Manage Workshops"}
            </h1>
          </div>
        </div>
        {activeTab === "gigs" ? (
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gig
          </Button>
        ) : (
          <Button onClick={() => { resetWorkshopForm(); setShowWorkshopForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Workshop
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
                        unoptimized
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
                        unoptimized
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
            {/* Search Box */}
            {selectedGig && applications.length > 0 && (
              <div className="relative mt-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or username..."
                  value={modelSearch}
                  onChange={(e) => setModelSearch(e.target.value)}
                  className="pl-9"
                />
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
                  // Search filter
                  if (modelSearch) {
                    const search = modelSearch.toLowerCase();
                    const firstName = app.model?.first_name?.toLowerCase() || "";
                    const lastName = app.model?.last_name?.toLowerCase() || "";
                    const username = app.model?.username?.toLowerCase() || "";
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (!firstName.includes(search) && !lastName.includes(search) && !username.includes(search) && !fullName.includes(search)) {
                      return false;
                    }
                  }
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
                  // Search filter
                  if (modelSearch) {
                    const search = modelSearch.toLowerCase();
                    const firstName = app.model?.first_name?.toLowerCase() || "";
                    const lastName = app.model?.last_name?.toLowerCase() || "";
                    const username = app.model?.username?.toLowerCase() || "";
                    const fullName = `${firstName} ${lastName}`.trim();
                    if (!firstName.includes(search) && !lastName.includes(search) && !username.includes(search) && !fullName.includes(search)) {
                      return false;
                    }
                  }
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
                        <Image
                          src={app.model.profile_photo_url}
                          alt={app.model.username}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          unoptimized
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
                            {app.spot_type === "paid" ? "$1,400 Spot" : "Sponsored"}
                          </Badge>
                          {app.payment_status === "paid" && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                              Paid ✓
                            </Badge>
                          )}
                          {app.payment_status === "interested" && (
                            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                              Interested
                            </Badge>
                          )}
                        </div>
                      )}
                      {/* Show interested badge even without trip_number */}
                      {!app.trip_number && app.payment_status === "interested" && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Interested
                          </Badge>
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
        </>
      )}

      {/* Workshops Tab Content */}
      {activeTab === "workshops" && (
        <>
          {workshopsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4">
              {workshops.length === 0 ? (
                <Card className="p-8 text-center">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Workshops</h3>
                  <p className="text-muted-foreground mb-4">Create your first workshop to get started.</p>
                  <Button onClick={() => { resetWorkshopForm(); setShowWorkshopForm(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Workshop
                  </Button>
                </Card>
              ) : (
                workshops.map((workshop) => (
                  <Card key={workshop.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold truncate">{workshop.title}</h3>
                            {getWorkshopStatusBadge(workshop.status)}
                            {workshop.is_featured && (
                              <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30">Featured</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(workshop.date), "MMM d, yyyy")}
                              {workshop.start_time && ` at ${format(new Date(`2000-01-01T${workshop.start_time}`), "h:mm a")}`}
                            </span>
                            {workshop.location_city && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {workshop.location_city}, {workshop.location_state}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-4 w-4" />
                              ${(workshop.price_cents / 100).toFixed(0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {workshop.spots_sold}/{workshop.spots_available || "∞"} registered
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/workshops/${workshop.slug}`} target="_blank">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => viewWorkshopRegistrations(workshop)}>
                            <Users className="h-4 w-4 mr-1" />
                            Registrations
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openWorkshopEditForm(workshop)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteWorkshop(workshop)} className="text-red-500 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Workshop Form Dialog */}
      <Dialog open={showWorkshopForm} onOpenChange={(open) => { if (!open) { setShowWorkshopForm(false); resetWorkshopForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWorkshop ? "Edit Workshop" : "Create Workshop"}</DialogTitle>
            <DialogDescription>
              {editingWorkshop ? "Update the workshop details below." : "Fill in the details to create a new workshop."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleWorkshopSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="ws-title">Title *</Label>
                <Input
                  id="ws-title"
                  value={workshopFormData.title}
                  onChange={(e) => handleWorkshopTitleChange(e.target.value)}
                  placeholder="Miami Swim Week Runway Workshop"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-subtitle">Subtitle</Label>
                <Input
                  id="ws-subtitle"
                  value={workshopFormData.subtitle}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Perfect your Catwalk & Camera Ready Skills"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-slug">URL Slug *</Label>
                <Input
                  id="ws-slug"
                  value={workshopFormData.slug}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="miami-swim-week-runway-workshop"
                  required
                />
              </div>

              {/* Cover Image / Flyer Upload */}
              <div className="col-span-2">
                <Label>Event Flyer / Cover Image</Label>
                <div className="flex items-start gap-4 mt-2">
                  {workshopFormData.cover_image_url ? (
                    <div className="relative">
                      <Image
                        src={workshopFormData.cover_image_url}
                        alt="Workshop flyer"
                        width={128}
                        height={176}
                        className="w-32 h-44 object-cover rounded-lg border"
                        unoptimized
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setWorkshopFormData(prev => ({ ...prev, cover_image_url: "" }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-32 h-44 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleWorkshopImageUpload}
                        disabled={workshopUploading}
                      />
                      {workshopUploading ? (
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
                    <p>Upload a portrait flyer or promotional image.</p>
                    <p className="mt-1">Recommended: Portrait orientation (e.g., 800x1100px)</p>
                    <p>Max size: 10MB</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="ws-date">Date *</Label>
                <Input
                  id="ws-date"
                  type="date"
                  value={workshopFormData.date}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="ws-start_time">Start Time</Label>
                  <Input
                    id="ws-start_time"
                    type="time"
                    value={workshopFormData.start_time}
                    onChange={(e) => setWorkshopFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="ws-end_time">End Time</Label>
                  <Input
                    id="ws-end_time"
                    type="time"
                    value={workshopFormData.end_time}
                    onChange={(e) => setWorkshopFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ws-location_city">City</Label>
                <Input
                  id="ws-location_city"
                  value={workshopFormData.location_city}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, location_city: e.target.value }))}
                  placeholder="Miami Beach"
                />
              </div>

              <div>
                <Label htmlFor="ws-location_state">State</Label>
                <Input
                  id="ws-location_state"
                  value={workshopFormData.location_state}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, location_state: e.target.value }))}
                  placeholder="FL"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-location_address">Address</Label>
                <Input
                  id="ws-location_address"
                  value={workshopFormData.location_address}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, location_address: e.target.value }))}
                  placeholder="123 Ocean Dr"
                />
              </div>

              <div>
                <Label htmlFor="ws-price">Price ($) *</Label>
                <Input
                  id="ws-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={workshopFormData.price}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="350"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ws-original_price">Original Price ($)</Label>
                <Input
                  id="ws-original_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={workshopFormData.original_price}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, original_price: e.target.value }))}
                  placeholder="For showing discount"
                />
              </div>

              <div>
                <Label htmlFor="ws-spots_available">Spots Available</Label>
                <Input
                  id="ws-spots_available"
                  type="number"
                  min="1"
                  value={workshopFormData.spots_available}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, spots_available: e.target.value }))}
                  placeholder="30 (leave empty for unlimited)"
                />
              </div>

              <div>
                <Label htmlFor="ws-status">Status</Label>
                <Select value={workshopFormData.status} onValueChange={(v) => setWorkshopFormData(prev => ({ ...prev, status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-description">Description</Label>
                <Textarea
                  id="ws-description"
                  value={workshopFormData.description}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the workshop..."
                  rows={4}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-highlights">Highlights (one per line)</Label>
                <Textarea
                  id="ws-highlights"
                  value={workshopFormData.highlights}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, highlights: e.target.value }))}
                  placeholder="Learn professional runway techniques&#10;Master swimwear presentation&#10;Networking opportunities"
                  rows={4}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-what_to_bring">What to Bring (one per line)</Label>
                <Textarea
                  id="ws-what_to_bring"
                  value={workshopFormData.what_to_bring}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, what_to_bring: e.target.value }))}
                  placeholder="Comfortable heels&#10;Form-fitting workout attire&#10;Water bottle"
                  rows={3}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  id="ws-is_featured"
                  checked={workshopFormData.is_featured}
                  onCheckedChange={(checked) => setWorkshopFormData(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label htmlFor="ws-is_featured">Featured Workshop</Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-meta_title">SEO Title</Label>
                <Input
                  id="ws-meta_title"
                  value={workshopFormData.meta_title}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="Workshop Title | EXA Models"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="ws-meta_description">SEO Description</Label>
                <Textarea
                  id="ws-meta_description"
                  value={workshopFormData.meta_description}
                  onChange={(e) => setWorkshopFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Meta description for search engines"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowWorkshopForm(false); resetWorkshopForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={workshopSaving}>
                {workshopSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingWorkshop ? "Update Workshop" : "Create Workshop"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workshop Registrations Dialog */}
      <Dialog open={showRegistrations} onOpenChange={setShowRegistrations}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrations - {selectedWorkshop?.title}</DialogTitle>
            <DialogDescription>
              {workshopRegistrations.filter(r => r.status === "completed").length} confirmed registrations
            </DialogDescription>
          </DialogHeader>

          {workshopRegistrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No registrations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {workshopRegistrations.map((reg) => (
                <Card key={reg.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{reg.buyer_name || reg.buyer_email}</div>
                        <div className="text-sm text-muted-foreground">{reg.buyer_email}</div>
                        {reg.buyer_phone && (
                          <div className="text-sm text-muted-foreground">{reg.buyer_phone}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${(reg.total_price_cents / 100).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{reg.quantity} spot{reg.quantity > 1 ? "s" : ""}</div>
                        <Badge className={reg.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                          {reg.status}
                        </Badge>
                      </div>
                    </div>
                    {reg.completed_at && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Registered: {format(new Date(reg.completed_at), "MMM d, yyyy h:mm a")}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Gig Preview Modal */}
      <Dialog open={showPreview} onOpenChange={(open) => {
        setShowPreview(open);
        if (!open) setPreviewExpandedImage(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Gig Preview
            </DialogTitle>
            <DialogDescription>
              This is how the gig will appear to models
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Cover Image */}
            {formData.cover_image_url && (
              <div
                className="relative aspect-[21/9] rounded-2xl overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setPreviewExpandedImage(formData.cover_image_url)}
              >
                <Image
                  src={formData.cover_image_url}
                  alt={formData.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}

            {/* Gallery Images - Larger Grid */}
            {formData.gallery_images.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {formData.gallery_images.map((url, index) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity bg-muted"
                      onClick={() => setPreviewExpandedImage(url)}
                    >
                      <Image
                        src={url}
                        alt={`Gallery ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header */}
            <div>
              <Badge className="mb-3 capitalize">{formData.type}</Badge>
              <h1 className="text-2xl font-bold mb-2">{formData.title || "Untitled Gig"}</h1>
              {(formData.location_city || formData.location_state) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {formData.location_city}{formData.location_city && formData.location_state && ", "}{formData.location_state}
                </div>
              )}
            </div>

            {/* Description */}
            {formData.description && (
              <div>
                <h2 className="font-semibold mb-2">About This Gig</h2>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {formData.description}
                </p>
              </div>
            )}

            {/* Details Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {formData.start_date && (
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {format(new Date(formData.start_date), "MMM d, yyyy")}
                          {formData.end_date && formData.end_date !== formData.start_date && (
                            <> - {format(new Date(formData.end_date), "MMM d, yyyy")}</>
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {(formData.start_time || formData.end_time) && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium">
                          {formData.start_time && format(new Date(`2000-01-01T${formData.start_time}`), "h:mm a")}
                          {formData.start_time && formData.end_time && " - "}
                          {formData.end_time && format(new Date(`2000-01-01T${formData.end_time}`), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Spots Available</p>
                      <p className="font-medium">{formData.spots}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Cost</p>
                      <p className="font-medium capitalize">
                        {formData.compensation_type === "paid" && formData.compensation_amount > 0 ? (
                          <span className="text-green-500">${formData.compensation_amount}</span>
                        ) : (
                          formData.compensation_type
                        )}
                      </p>
                    </div>
                  </div>
                  {formData.event_id && (
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-pink-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Event</p>
                        <p className="font-medium">
                          {events.find(e => e.id === formData.event_id)?.name || "Linked Event"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Apply Button Mockup */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-3">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600" disabled>
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    This is how models will see the apply button
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Status Notice */}
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Preview Mode</p>
                <p>This gig will be saved as a draft. You can publish it after saving.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expanded Image Modal */}
      <Dialog open={!!previewExpandedImage} onOpenChange={(open) => !open && setPreviewExpandedImage(null)}>
        <DialogContent className="max-w-5xl p-0 bg-transparent border-none">
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 border-none text-white"
              onClick={() => setPreviewExpandedImage(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {previewExpandedImage && (
              <Image
                src={previewExpandedImage}
                alt="Expanded view"
                width={1200}
                height={900}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
                unoptimized
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
