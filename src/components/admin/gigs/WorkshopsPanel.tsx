"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
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
  MapPin,
  Users,
  Eye,
  Pencil,
  Trash2,
  X,
  ImageIcon,
  GraduationCap,
  Calendar,
  DollarSign,
} from "lucide-react";
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

export default function WorkshopsPanel() {
  const supabase = createClient();

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

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Use JPEG, PNG, WebP, or GIF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 10MB.");
      return;
    }

    setWorkshopUploading(true);
    try {
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

      const uploadResponse = await fetch(data.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadResponse.ok) {
        toast.error("Failed to upload file");
        return;
      }

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

  return (
    <>
      {/* Header action button */}
      <div className="flex justify-end -mt-6 mb-6">
        <Button onClick={() => { resetWorkshopForm(); setShowWorkshopForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workshop
        </Button>
      </div>

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
                          {workshop.spots_sold}/{workshop.spots_available || "\u221E"} registered
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
    </>
  );
}
