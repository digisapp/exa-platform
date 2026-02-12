"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
  ArrowLeft,
  Pencil,
  Trash2,
  Users,
  Calendar,
  MapPin,
  DollarSign,
  Eye,
  GraduationCap,
  ImageIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

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
  gallery_media: string[] | null;
  status: string;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
}

interface Registration {
  id: string;
  buyer_email: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  quantity: number;
  total_price_cents: number;
  status: string;
  completed_at: string | null;
  created_at: string;
  payment_type: string | null;
  installments_total: number | null;
  installments_paid: number | null;
}

const supabase = createClient();

export default function AdminWorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRegistrations, setShowRegistrations] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    subtitle: "",
    slug: "",
    description: "",
    cover_image_url: "",
    gallery_media: [] as string[],
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

  const loadWorkshops = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, []);

  const loadRegistrations = async (workshopId: string) => {
    const { data, error } = await (supabase as any)
      .from("workshop_registrations")
      .select("*")
      .eq("workshop_id", workshopId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading registrations:", error);
      toast.error("Failed to load registrations");
    } else {
      setRegistrations(data || []);
    }
  };

  useEffect(() => {
    loadWorkshops();
  }, [loadWorkshops]);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: editingWorkshop ? prev.slug : generateSlug(title),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: "",
      subtitle: "",
      slug: "",
      description: "",
      cover_image_url: "",
      gallery_media: [],
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

  const openEditForm = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setFormData({
      title: workshop.title,
      subtitle: workshop.subtitle || "",
      slug: workshop.slug,
      description: workshop.description || "",
      cover_image_url: workshop.cover_image_url || "",
      gallery_media: workshop.gallery_media || [],
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
    setShowForm(true);
  };

  const handleFlyerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const response = await fetch("/api/admin/workshops/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentType: file.type }),
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

      setFormData(prev => ({ ...prev, cover_image_url: data.publicUrl }));
      toast.success("Flyer uploaded!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload flyer");
    } finally {
      setUploading(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - formData.gallery_media.length;
    if (files.length > remainingSlots) {
      toast.error(`You can only add ${remainingSlots} more item${remainingSlots !== 1 ? "s" : ""} (max 10 total)`);
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/quicktime"];
    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`Invalid file type for ${file.name}. Use JPEG, PNG, WebP, GIF, MP4, or MOV.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
    }

    setUploadingGallery(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const response = await fetch("/api/admin/workshops/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, contentType: file.type }),
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
          gallery_media: [...prev.gallery_media, ...uploadedUrls],
        }));
        toast.success(`${uploadedUrls.length} file${uploadedUrls.length !== 1 ? "s" : ""} uploaded!`);
      }
    } catch (error) {
      console.error("Gallery upload error:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploadingGallery(false);
      e.target.value = "";
    }
  };

  const removeGalleryItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      gallery_media: prev.gallery_media.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const workshopData = {
      title: formData.title,
      subtitle: formData.subtitle || null,
      slug: formData.slug,
      description: formData.description || null,
      cover_image_url: formData.cover_image_url || null,
      gallery_media: formData.gallery_media.length > 0 ? formData.gallery_media : null,
      location_city: formData.location_city || null,
      location_state: formData.location_state || null,
      location_address: formData.location_address || null,
      date: formData.date,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      price_cents: Math.round(parseFloat(formData.price) * 100),
      original_price_cents: formData.original_price ? Math.round(parseFloat(formData.original_price) * 100) : null,
      spots_available: formData.spots_available ? parseInt(formData.spots_available) : null,
      highlights: formData.highlights ? formData.highlights.split("\n").filter(h => h.trim()) : null,
      what_to_bring: formData.what_to_bring ? formData.what_to_bring.split("\n").filter(h => h.trim()) : null,
      status: formData.status,
      is_featured: formData.is_featured,
      meta_title: formData.meta_title || null,
      meta_description: formData.meta_description || null,
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

      setShowForm(false);
      resetForm();
      loadWorkshops();
    } catch (error: any) {
      console.error("Error saving workshop:", error);
      toast.error(error.message || "Failed to save workshop");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (workshop: Workshop) => {
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

  const viewRegistrations = async (workshop: Workshop) => {
    setSelectedWorkshop(workshop);
    await loadRegistrations(workshop.id);
    setShowRegistrations(true);
  };

  const getStatusBadge = (status: string) => {
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
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-rose-500" />
              Workshops
            </h1>
            <p className="text-muted-foreground">Manage training workshops</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          New Workshop
        </Button>
      </div>

      {/* Workshop List */}
      <div className="grid gap-4">
        {workshops.length === 0 ? (
          <Card className="p-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No Workshops</h3>
            <p className="text-muted-foreground mb-4">Create your first workshop to get started.</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
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
                      {getStatusBadge(workshop.status)}
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
                    <Button variant="outline" size="sm" onClick={() => viewRegistrations(workshop)}>
                      <Users className="h-4 w-4 mr-1" />
                      Registrations
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditForm(workshop)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDelete(workshop)} className="text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Workshop Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingWorkshop ? "Edit Workshop" : "Create Workshop"}</DialogTitle>
            <DialogDescription>
              {editingWorkshop ? "Update the workshop details below." : "Fill in the details to create a new workshop."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Miami Swim Week Runway Workshop"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  placeholder="Perfect your Catwalk & Camera Ready Skills"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="miami-swim-week-runway-workshop"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="location_city">City</Label>
                <Input
                  id="location_city"
                  value={formData.location_city}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_city: e.target.value }))}
                  placeholder="Miami Beach"
                />
              </div>

              <div>
                <Label htmlFor="location_state">State</Label>
                <Input
                  id="location_state"
                  value={formData.location_state}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_state: e.target.value }))}
                  placeholder="FL"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="location_address">Address</Label>
                <Input
                  id="location_address"
                  value={formData.location_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                  placeholder="123 Ocean Dr"
                />
              </div>

              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="350"
                  required
                />
              </div>

              <div>
                <Label htmlFor="original_price">Original Price ($)</Label>
                <Input
                  id="original_price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.original_price}
                  onChange={(e) => setFormData(prev => ({ ...prev, original_price: e.target.value }))}
                  placeholder="For showing discount"
                />
              </div>

              <div>
                <Label htmlFor="spots_available">Spots Available</Label>
                <Input
                  id="spots_available"
                  type="number"
                  min="1"
                  value={formData.spots_available}
                  onChange={(e) => setFormData(prev => ({ ...prev, spots_available: e.target.value }))}
                  placeholder="30 (leave empty for unlimited)"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the workshop..."
                  rows={4}
                />
              </div>

              {/* Flyer Upload */}
              <div className="col-span-2 space-y-2">
                <Label>Event Flyer <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="flex items-start gap-4">
                  {formData.cover_image_url ? (
                    <div className="relative">
                      <Image
                        src={formData.cover_image_url}
                        alt="Workshop flyer"
                        width={128}
                        height={160}
                        className="w-32 h-40 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setFormData(prev => ({ ...prev, cover_image_url: "" }))}
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
                        onChange={handleFlyerUpload}
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
                    <p>Upload a flyer or promotional image.</p>
                    <p className="mt-1">Recommended: Portrait orientation (e.g., 800x1000px)</p>
                    <p>Max size: 10MB</p>
                  </div>
                </div>
              </div>

              {/* Gallery Media */}
              <div className="col-span-2 space-y-2">
                <Label>Gallery Media <span className="text-muted-foreground text-xs">(optional, up to 10)</span></Label>
                <div className="flex flex-wrap gap-3">
                  {formData.gallery_media.map((url, index) => (
                    <div key={index} className="relative">
                      {url.match(/\.(mp4|mov)$/i) ? (
                        <video
                          src={url}
                          className="w-24 h-24 object-cover rounded-lg border"
                          muted
                        />
                      ) : (
                        <Image
                          src={url}
                          alt={`Gallery ${index + 1}`}
                          width={96}
                          height={96}
                          className="w-24 h-24 object-cover rounded-lg border"
                        />
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5"
                        onClick={() => removeGalleryItem(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {formData.gallery_media.length < 10 && (
                    <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        className="hidden"
                        onChange={handleGalleryUpload}
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
                  {formData.gallery_media.length}/10 media • Photos and videos to show the vibe
                </p>
              </div>

              <div className="col-span-2">
                <Label htmlFor="highlights">Highlights (one per line)</Label>
                <Textarea
                  id="highlights"
                  value={formData.highlights}
                  onChange={(e) => setFormData(prev => ({ ...prev, highlights: e.target.value }))}
                  placeholder="Learn professional runway techniques&#10;Master swimwear presentation&#10;Networking opportunities"
                  rows={4}
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="what_to_bring">What to Bring (one per line)</Label>
                <Textarea
                  id="what_to_bring"
                  value={formData.what_to_bring}
                  onChange={(e) => setFormData(prev => ({ ...prev, what_to_bring: e.target.value }))}
                  placeholder="Comfortable heels&#10;Form-fitting workout attire&#10;Water bottle"
                  rows={3}
                />
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_featured: checked }))}
                />
                <Label htmlFor="is_featured">Featured Workshop</Label>
              </div>

              <div className="col-span-2">
                <Label htmlFor="meta_title">SEO Title</Label>
                <Input
                  id="meta_title"
                  value={formData.meta_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_title: e.target.value }))}
                  placeholder="Workshop Title | EXA Models"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="meta_description">SEO Description</Label>
                <Textarea
                  id="meta_description"
                  value={formData.meta_description}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta_description: e.target.value }))}
                  placeholder="Meta description for search engines"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingWorkshop ? "Update Workshop" : "Create Workshop"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registrations Dialog */}
      <Dialog open={showRegistrations} onOpenChange={setShowRegistrations}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrations - {selectedWorkshop?.title}</DialogTitle>
            <DialogDescription>
              {registrations.filter(r => r.status === "completed").length} confirmed registrations
            </DialogDescription>
          </DialogHeader>

          {registrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No registrations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg) => (
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
                      <div className="text-right space-y-1">
                        <div className="font-medium">${(reg.total_price_cents / 100).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{reg.quantity} spot{reg.quantity > 1 ? "s" : ""}</div>
                        <div className="flex items-center gap-1 justify-end flex-wrap">
                          <Badge className={reg.status === "completed" ? "bg-green-500/20 text-green-400" : reg.status === "cancelled" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}>
                            {reg.status}
                          </Badge>
                          {reg.payment_type === "installment" ? (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              Plan {reg.installments_paid || 0}/{reg.installments_total || 3}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Full</Badge>
                          )}
                        </div>
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
    </div>
  );
}
