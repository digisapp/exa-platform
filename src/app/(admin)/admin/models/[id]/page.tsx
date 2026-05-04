"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Ruler,
  Instagram,
  ExternalLink,
  Eye,
  Coins,
  Heart,
  Images,
  MessageCircle,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
  Pencil,
  Camera,
  Upload,
  LayoutGrid,
  X,
} from "lucide-react";
import { ImageCropper } from "@/components/upload/ImageCropper";
import { getHeroPortrait } from "@/lib/hero-portrait";
import { toast } from "sonner";

interface ModelDetails {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country_code: string | null;
  height: string | null;
  dob: string | null;
  bust: string | null;
  waist: string | null;
  hips: string | null;
  dress_size: string | null;
  shoe_size: string | null;
  hair_color: string | null;
  eye_color: string | null;
  instagram_name: string | null;
  instagram_followers: number | null;
  tiktok_username: string | null;
  tiktok_followers: number | null;
  profile_photo_url: string | null;
  profile_views: number;
  coin_balance: number;
  withheld_balance: number;
  points_cached: number;
  level_cached: string | null;
  is_approved: boolean;
  is_featured: boolean;
  profile_completion_percent: number;
  availability_status: string | null;
  admin_rating: number | null;
  user_id: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
  purged_at: string | null;
}

interface ModelApplication {
  id: string;
  display_name: string;
  email: string;
  phone: string | null;
  instagram_username: string | null;
  tiktok_username: string | null;
  date_of_birth: string | null;
  height: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
}

interface ModelStats {
  followers_count: number;
  total_earned: number;
  content_count: number;
  message_count: number;
  last_post: string | null;
}

function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/portfolio/${url}`;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(label ? `${label} copied!` : "Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 w-6 p-0">
      {copied ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );
}

function RatingStars({ rating }: { rating: number | null }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= (rating ?? 0)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function InfoRow({ label, value, copyable, icon: Icon }: {
  label: string;
  value: string | number | null | undefined;
  copyable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{value}</p>
          {copyable && typeof value === "string" && (
            <CopyButton text={value} label={label} />
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
      <Icon className={`h-8 w-8 ${color}`} />
      <div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

export default function AdminModelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const modelId = params.id as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ModelDetails | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<ModelDetails>>({});
  const [photoUploading, setPhotoUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperSrc, setCropperSrc] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Portrait & content picker state
  const [portraitItem, setPortraitItem] = useState<{ id: string; media_url: string } | null>(null);
  const [contentImages, setContentImages] = useState<Array<{ id: string; media_url: string; title: string | null; is_primary: boolean; width: number | null; height: number | null }>>([]);
  const [contentPickerOpen, setContentPickerOpen] = useState(false);
  const [contentPickerMode, setContentPickerMode] = useState<"avatar" | "portrait">("avatar");
  const [contentPickerSaving, setContentPickerSaving] = useState(false);

  const [application, setApplication] = useState<ModelApplication | null>(null);
  const [stats, setStats] = useState<ModelStats>({
    followers_count: 0,
    total_earned: 0,
    content_count: 0,
    message_count: 0,
    last_post: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadModelDetails() {
      // Fetch model details
      const { data: modelData, error: modelError } = await (supabase
        .from("models") as any)
        .select("*")
        .eq("id", modelId)
        .single();

      if (!isMounted) return;

      if (modelError || !modelData) {
        toast.error("Model not found");
        router.push("/admin/community");
        return;
      }

      setModel(modelData);

      // Fetch portfolio images for content picker
      const { data: images } = await (supabase as any)
        .from("content_items")
        .select("id, media_url, title, is_primary, width, height")
        .eq("model_id", modelId)
        .eq("media_type", "image")
        .order("created_at", { ascending: false })
        .limit(100);

      if (images && isMounted) {
        setContentImages(images);
        const primary = images.find((img: any) => img.is_primary);
        if (primary) setPortraitItem({ id: primary.id, media_url: primary.media_url });
      }

      // Fetch application if exists (by user_id)
      if (modelData.user_id) {
        const { data: appData } = await (supabase
          .from("model_applications") as any)
          .select("*")
          .eq("user_id", modelData.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (isMounted) {
          setApplication(appData || null);
        }
      }

      // Fetch stats
      if (modelData.user_id) {
        // Get actor for this model
        const { data: actor } = await (supabase
          .from("actors") as any)
          .select("id")
          .eq("user_id", modelData.user_id)
          .single();

        if (actor && isMounted) {
          // Followers count
          const { count: followersCount } = await (supabase
            .from("follows") as any)
            .select("*", { count: "exact", head: true })
            .eq("following_id", actor.id);

          // Total earned (exclude purchases - only actual earnings from fans)
          const { data: earnings } = await (supabase
            .from("coin_transactions") as any)
            .select("amount")
            .eq("actor_id", actor.id)
            .gt("amount", 0)
            .neq("action", "purchase");

          const totalEarned = earnings?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

          // Content count (content_items is single source of truth)
          const { count: contentItemsCount } = await (supabase as any)
            .from("content_items")
            .select("*", { count: "exact", head: true })
            .eq("model_id", modelId);

          // Message count (conversations)
          const { count: messageCount } = await (supabase
            .from("conversation_participants") as any)
            .select("*", { count: "exact", head: true })
            .eq("actor_id", actor.id);

          // Last post
          const { data: lastPremium } = await (supabase as any)
            .from("content_items")
            .select("created_at")
            .eq("model_id", modelId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (isMounted) {
            setStats({
              followers_count: followersCount || 0,
              total_earned: totalEarned,
              content_count: contentItemsCount || 0,
              message_count: messageCount || 0,
              last_post: lastPremium?.created_at || null,
            });
          }
        }
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadModelDetails();

    return () => {
      isMounted = false;
    };
  }, [supabase, modelId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return null;
  }

  const displayName = model.first_name
    ? `${model.first_name} ${model.last_name || ""}`.trim()
    : model.username;

  const profilePhoto = resolveMediaUrl(model.profile_photo_url);

  const formatDate = (date: string | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const instagramHandle = model.instagram_name;

  // Compute what the live profile would show as the hero portrait (same logic as the public page)
  const autoPortrait = !portraitItem
    ? getHeroPortrait({
        profilePhotoUrl: profilePhoto || null,
        portfolioPhotos: contentImages.map((img) => ({
          url: resolveMediaUrl(img.media_url),
          width: img.width,
          height: img.height,
          isPrimary: img.is_primary,
        })),
      })
    : null;

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropperSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setCropperOpen(false);
    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", croppedBlob, "profile-photo.jpg");

      const res = await fetch(`/api/admin/models/${model.id}/photo`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to upload photo");
      }

      const data = await res.json();

      // Update local state with new photo
      setModel((prev) => prev ? {
        ...prev,
        profile_photo_url: data.url,
      } : prev);

      toast.success("Profile photo updated");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to upload photo";
      toast.error(message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handlePickFromPortfolio = async (img: { id: string; media_url: string }) => {
    setContentPickerSaving(true);
    try {
      const res = await fetch(`/api/admin/models/${model!.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contentPickerMode, contentItemId: img.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      if (contentPickerMode === "avatar") {
        setModel((prev) => prev ? { ...prev, profile_photo_url: resolveMediaUrl(img.media_url) } : prev);
        toast.success("Avatar updated");
      } else {
        setPortraitItem({ id: img.id, media_url: img.media_url });
        setContentImages((prev) =>
          prev.map((i) => ({ ...i, is_primary: i.id === img.id }))
        );
        toast.success("Portrait updated");
      }
      setContentPickerOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setContentPickerSaving(false);
    }
  };

  const openEdit = () => {
    setForm({
      first_name: model.first_name,
      last_name: model.last_name,
      email: model.email,
      phone: model.phone,
      bio: model.bio,
      city: model.city,
      state: model.state,
      country_code: model.country_code,
      height: model.height,
      dob: model.dob ? model.dob.slice(0, 10) : null,
      bust: model.bust,
      waist: model.waist,
      hips: model.hips,
      dress_size: model.dress_size,
      shoe_size: model.shoe_size,
      hair_color: model.hair_color,
      eye_color: model.eye_color,
      instagram_name: model.instagram_name,
      instagram_followers: model.instagram_followers,
      tiktok_username: model.tiktok_username,
      tiktok_followers: model.tiktok_followers,
      availability_status: model.availability_status,
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(form)) {
        // Send as-is; API normalizes "" to null
        payload[key] = value ?? null;
      }

      const res = await fetch(`/api/admin/models/${model.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update");
      }

      // Refetch model
      const { data: updated } = await (supabase
        .from("models") as any)
        .select("*")
        .eq("id", model.id)
        .single();
      if (updated) setModel(updated);

      toast.success("Model updated");
      setEditOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to update";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const setField = <K extends keyof ModelDetails>(key: K, value: ModelDetails[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{displayName}</h1>
            {model.is_approved ? (
              <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                <CheckCircle className="h-3 w-3 mr-1" />
                Approved
              </Badge>
            ) : (
              <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
            {model.is_featured && (
              <Badge className="bg-pink-500/20 text-pink-500 hover:bg-pink-500/30">
                <Star className="h-3 w-3 mr-1" />
                Featured
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">@{model.username}</p>
        </div>
        {model.deleted_at && (
          <Button
            variant="outline"
            className="border-green-500 text-green-500 hover:bg-green-500/10"
            onClick={async () => {
              try {
                const res = await fetch(`/api/admin/models/${model.id}/restore`, { method: "POST" });
                if (!res.ok) {
                  const data = await res.json();
                  throw new Error(data.error || "Failed to restore");
                }
                toast.success("Account restored successfully");
                window.location.reload();
              } catch (err: any) {
                toast.error(err.message || "Failed to restore account");
              }
            }}
            disabled={!!model.purged_at}
          >
            Restore Account
          </Button>
        )}
        <Button variant="outline" onClick={openEdit}>
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button asChild>
          <a href={`/${model.username}`} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </a>
        </Button>
      </div>

      {/* Deleted account banner */}
      {model.deleted_at && (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 space-y-1">
          <p className="font-semibold text-red-500">Account Deleted</p>
          <p className="text-sm text-muted-foreground">
            Deleted on {new Date(model.deleted_at).toLocaleDateString()}
            {model.deleted_reason && <> — Reason: {model.deleted_reason}</>}
          </p>
          <p className="text-sm text-muted-foreground">
            Recovery window expires: {new Date(new Date(model.deleted_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            {" | "}
            Hard purge scheduled: {new Date(new Date(model.deleted_at).getTime() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </p>
          {model.purged_at && (
            <p className="text-sm font-medium text-red-500">Personal data was purged on {new Date(model.purged_at).toLocaleDateString()}</p>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photo & Basic Info */}
        <div className="space-y-6">
          {/* Avatar Photo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Avatar (Circle)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="flex items-center gap-4">
                {/* Circle preview */}
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 ring-2 ring-border">
                    {profilePhoto ? (
                      <Image
                        src={profilePhoto}
                        alt={displayName}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                    <div
                      className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => photoInputRef.current?.click()}
                    >
                      {photoUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <Camera className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={photoUploading}
                  >
                    {photoUploading ? (
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3 mr-2" />
                    )}
                    Upload New
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { setContentPickerMode("avatar"); setContentPickerOpen(true); }}
                    disabled={contentImages.length === 0 || photoUploading}
                  >
                    <LayoutGrid className="h-3 w-3 mr-2" />
                    {contentImages.length === 0 ? "No portfolio images" : "Pick from Portfolio"}
                  </Button>
                </div>
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
              {model.admin_rating !== null && (
                <div className="flex items-center justify-center gap-2 pt-1 border-t">
                  <span className="text-sm text-muted-foreground">Admin Rating:</span>
                  <RatingStars rating={model.admin_rating} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portrait Photo */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Portrait (Hero)</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                {portraitItem ? (
                  <Image
                    src={resolveMediaUrl(portraitItem.media_url)}
                    alt="Portrait"
                    fill
                    className="object-cover object-top"
                  />
                ) : autoPortrait ? (
                  <Image
                    src={autoPortrait.url}
                    alt="Portrait (auto)"
                    fill
                    className="object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <User className="h-10 w-10 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">No photos</p>
                  </div>
                )}
                {portraitItem && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-yellow-500/90 text-white text-xs">
                      <Star className="h-3 w-3 mr-1 fill-white" />
                      Primary
                    </Badge>
                  </div>
                )}
                {!portraitItem && autoPortrait && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-black/60 text-white/80 text-xs border border-white/20">
                      Auto-selected
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => { setContentPickerMode("portrait"); setContentPickerOpen(true); }}
                disabled={contentImages.length === 0}
              >
                <LayoutGrid className="h-3 w-3 mr-2" />
                {contentImages.length === 0 ? "No portfolio images" : "Set from Portfolio"}
              </Button>
              {portraitItem && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={async () => {
                    try {
                      // Clear is_primary — portrait reverts to auto-selection
                      const res = await fetch(`/api/admin/models/${model.id}/images`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: "portrait", contentItemId: portraitItem.id, clear: true }),
                      });
                      if (!res.ok) throw new Error("Failed");
                      setPortraitItem(null);
                      setContentImages((prev) =>
                        prev.map((i) => ({ ...i, is_primary: false }))
                      );
                      toast.success("Portrait cleared — will auto-select");
                    } catch {
                      toast.error("Failed to clear portrait");
                    }
                  }}
                >
                  <X className="h-3 w-3 mr-2" />
                  Clear (use auto-select)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Image Cropper Dialog */}
          <ImageCropper
            open={cropperOpen}
            onClose={() => setCropperOpen(false)}
            imageSrc={cropperSrc}
            onCropComplete={handleCropComplete}
            aspectRatio={1}
            circularCrop={false}
          />

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Email" value={model.email} copyable icon={Mail} />
              <InfoRow label="Phone" value={model.phone || application?.phone} copyable icon={Phone} />
              <InfoRow
                label="Location"
                value={[model.city, model.state, model.country_code].filter(Boolean).join(", ") || null}
                icon={MapPin}
              />
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Social Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {instagramHandle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <a
                      href={`https://instagram.com/${instagramHandle.replace("@", "").replace(/\s+/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:underline"
                    >
                      @{instagramHandle.replace("@", "")}
                    </a>
                  </div>
                  {model.instagram_followers && (
                    <span className="text-sm text-muted-foreground">
                      {model.instagram_followers.toLocaleString()} followers
                    </span>
                  )}
                </div>
              )}
              {model.tiktok_username && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">TikTok</span>
                    <a
                      href={`https://tiktok.com/@${model.tiktok_username.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:underline"
                    >
                      @{model.tiktok_username.replace("@", "")}
                    </a>
                  </div>
                  {model.tiktok_followers && (
                    <span className="text-sm text-muted-foreground">
                      {model.tiktok_followers.toLocaleString()} followers
                    </span>
                  )}
                </div>
              )}
              {!instagramHandle && !model.tiktok_username && (
                <p className="text-sm text-muted-foreground">No social accounts linked</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Details */}
        <div className="space-y-6">
          {/* Personal Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow
                label="Date of Birth"
                value={
                  model.dob || application?.date_of_birth
                    ? `${formatDate(model.dob || application?.date_of_birth || null)} (${calculateAge(model.dob || application?.date_of_birth || null)} years old)`
                    : null
                }
                icon={Calendar}
              />
              <InfoRow
                label="Height"
                value={model.height || application?.height}
                icon={Ruler}
              />
              <InfoRow label="Hair Color" value={model.hair_color} />
              <InfoRow label="Eye Color" value={model.eye_color} />
            </CardContent>
          </Card>

          {/* Measurements */}
          {(model.bust || model.waist || model.hips || model.dress_size || model.shoe_size) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Measurements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {model.bust && (
                    <div>
                      <p className="text-xs text-muted-foreground">Bust</p>
                      <p className="font-medium">{model.bust}</p>
                    </div>
                  )}
                  {model.waist && (
                    <div>
                      <p className="text-xs text-muted-foreground">Waist</p>
                      <p className="font-medium">{model.waist}</p>
                    </div>
                  )}
                  {model.hips && (
                    <div>
                      <p className="text-xs text-muted-foreground">Hips</p>
                      <p className="font-medium">{model.hips}</p>
                    </div>
                  )}
                  {model.dress_size && (
                    <div>
                      <p className="text-xs text-muted-foreground">Dress Size</p>
                      <p className="font-medium">{model.dress_size}</p>
                    </div>
                  )}
                  {model.shoe_size && (
                    <div>
                      <p className="text-xs text-muted-foreground">Shoe Size</p>
                      <p className="font-medium">{model.shoe_size}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bio */}
          {model.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bio</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{model.bio}</p>
              </CardContent>
            </Card>
          )}

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Account Status</span>
                {model.user_id ? (
                  <Badge className="bg-green-500/20 text-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active (Claimed)
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-500">
                    <Clock className="h-3 w-3 mr-1" />
                    Unclaimed
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Availability</span>
                <span className="capitalize font-medium">{model.availability_status || "Available"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Joined</span>
                <span className="font-medium">{formatDate(model.created_at)}</span>
              </div>
              {model.claimed_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Claimed</span>
                  <span className="font-medium">{formatDate(model.claimed_at)}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Application */}
        <div className="space-y-6">
          {/* Stats Grid */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Performance Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <StatCard label="Profile Views" value={model.profile_views || 0} icon={Eye} color="text-purple-500" />
              <StatCard label="Favorites" value={stats.followers_count} icon={Heart} color="text-pink-500" />
              <StatCard label="Coin Balance" value={model.coin_balance || 0} icon={Coins} color="text-yellow-500" />
              <StatCard label="Earned" value={stats.total_earned} icon={Coins} color="text-yellow-500" />
              <StatCard label="Content Items" value={stats.content_count} icon={Images} color="text-blue-500" />
              <StatCard label="Conversations" value={stats.message_count} icon={MessageCircle} color="text-violet-500" />
              {model.withheld_balance > 0 && (
                <StatCard label="Withheld Balance" value={model.withheld_balance} icon={Clock} color="text-amber-500" />
              )}
            </CardContent>
          </Card>

          {/* Application History */}
          {application && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Application Details</CardTitle>
                <CardDescription>
                  Submitted {formatDate(application.created_at)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge
                    className={
                      application.status === "approved"
                        ? "bg-green-500/20 text-green-500"
                        : application.status === "rejected"
                        ? "bg-red-500/20 text-red-500"
                        : "bg-amber-500/20 text-amber-500"
                    }
                  >
                    {application.status === "approved" && <CheckCircle className="h-3 w-3 mr-1" />}
                    {application.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                    {application.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                    {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </Badge>
                </div>
                <InfoRow label="Name on Application" value={application.display_name} />
                <InfoRow label="Email" value={application.email} copyable />
                <InfoRow label="Phone" value={application.phone} copyable />
                <InfoRow label="Instagram" value={application.instagram_username} />
                <InfoRow label="TikTok" value={application.tiktok_username} />
                <InfoRow
                  label="DOB"
                  value={application.date_of_birth ? formatDate(application.date_of_birth) : null}
                />
                <InfoRow label="Height" value={application.height} />
                {application.reviewed_at && (
                  <InfoRow label="Reviewed" value={formatDate(application.reviewed_at)} />
                )}
                {application.rejection_reason && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">Rejection Reason</p>
                    <p className="text-sm text-red-500">{application.rejection_reason}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" asChild>
                <a href={`/${model.username}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </a>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/community">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Community
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Content Portfolio Picker Dialog */}
      <Dialog open={contentPickerOpen} onOpenChange={setContentPickerOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>
              {contentPickerMode === "avatar" ? "Pick Avatar from Portfolio" : "Set Portrait from Portfolio"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {contentPickerMode === "avatar"
                ? "Choose an image to use as the circle avatar across the platform."
                : "Choose an image to pin as the hero portrait on this model's public profile."}
            </p>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 p-4">
            {contentImages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No portfolio images found</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {contentImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handlePickFromPortfolio(img)}
                    disabled={contentPickerSaving}
                    className="relative aspect-square rounded-lg overflow-hidden group border-2 border-transparent hover:border-pink-500 focus-visible:border-pink-500 transition-all outline-none disabled:opacity-50"
                  >
                    <Image
                      src={resolveMediaUrl(img.media_url)}
                      alt={img.title || "Portfolio image"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                    {img.is_primary && (
                      <div className="absolute top-1 right-1 bg-yellow-500 rounded-full p-0.5 shadow">
                        <Star className="h-3 w-3 text-white fill-white" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 group-focus-visible:bg-black/20 transition-colors" />
                    {contentPickerSaving && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t shrink-0 flex justify-end">
            <Button variant="outline" onClick={() => setContentPickerOpen(false)} disabled={contentPickerSaving}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Model Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={form.first_name ?? ""}
                onChange={(e) => setField("first_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={form.last_name ?? ""}
                onChange={(e) => setField("last_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone ?? ""}
                onChange={(e) => setField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city ?? ""}
                onChange={(e) => setField("city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={form.state ?? ""}
                onChange={(e) => setField("state", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country_code">Country Code</Label>
              <Input
                id="country_code"
                value={form.country_code ?? ""}
                onChange={(e) => setField("country_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability_status">Availability</Label>
              <Input
                id="availability_status"
                value={form.availability_status ?? ""}
                onChange={(e) => setField("availability_status", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={form.dob ?? ""}
                onChange={(e) => setField("dob", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Height</Label>
              <Input
                id="height"
                value={form.height ?? ""}
                onChange={(e) => setField("height", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hair_color">Hair Color</Label>
              <Input
                id="hair_color"
                value={form.hair_color ?? ""}
                onChange={(e) => setField("hair_color", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eye_color">Eye Color</Label>
              <Input
                id="eye_color"
                value={form.eye_color ?? ""}
                onChange={(e) => setField("eye_color", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bust">Bust</Label>
              <Input
                id="bust"
                value={form.bust ?? ""}
                onChange={(e) => setField("bust", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="waist">Waist</Label>
              <Input
                id="waist"
                value={form.waist ?? ""}
                onChange={(e) => setField("waist", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hips">Hips</Label>
              <Input
                id="hips"
                value={form.hips ?? ""}
                onChange={(e) => setField("hips", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dress_size">Dress Size</Label>
              <Input
                id="dress_size"
                value={form.dress_size ?? ""}
                onChange={(e) => setField("dress_size", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoe_size">Shoe Size</Label>
              <Input
                id="shoe_size"
                value={form.shoe_size ?? ""}
                onChange={(e) => setField("shoe_size", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_name">Instagram Handle</Label>
              <Input
                id="instagram_name"
                value={form.instagram_name ?? ""}
                onChange={(e) => setField("instagram_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram_followers">Instagram Followers</Label>
              <Input
                id="instagram_followers"
                type="number"
                value={form.instagram_followers ?? ""}
                onChange={(e) =>
                  setField(
                    "instagram_followers",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_username">TikTok Handle</Label>
              <Input
                id="tiktok_username"
                value={form.tiktok_username ?? ""}
                onChange={(e) => setField("tiktok_username", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok_followers">TikTok Followers</Label>
              <Input
                id="tiktok_followers"
                type="number"
                value={form.tiktok_followers ?? ""}
                onChange={(e) =>
                  setField(
                    "tiktok_followers",
                    e.target.value === "" ? null : Number(e.target.value)
                  )
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                rows={4}
                value={form.bio ?? ""}
                onChange={(e) => setField("bio", e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
