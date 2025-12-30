"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DollarSign,
  Images,
  MessageCircle,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface ModelDetails {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  height: string | null;
  height_inches: number | null;
  date_of_birth: string | null;
  measurements: Record<string, string> | null;
  hair_color: string | null;
  eye_color: string | null;
  instagram_handle: string | null;
  instagram_name: string | null;
  instagram_followers: number | null;
  tiktok_handle: string | null;
  tiktok_followers: number | null;
  profile_photo_url: string | null;
  avatar_url: string | null;
  profile_views: number;
  coin_balance: number;
  withheld_balance: number;
  points_cached: number;
  level_cached: string | null;
  is_approved: boolean;
  is_featured: boolean;
  profile_complete: boolean;
  availability: string | null;
  admin_rating: number | null;
  user_id: string | null;
  invite_token: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
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
  icon?: React.ElementType;
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
  icon: React.ElementType;
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

          // Total earned (positive coin transactions)
          const { data: earnings } = await (supabase
            .from("coin_transactions") as any)
            .select("amount")
            .eq("actor_id", actor.id)
            .gt("amount", 0);

          const totalEarned = earnings?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0;

          // Content count
          const { count: premiumCount } = await (supabase
            .from("premium_content") as any)
            .select("*", { count: "exact", head: true })
            .eq("model_id", modelId);

          const { count: mediaCount } = await (supabase
            .from("media_assets") as any)
            .select("*", { count: "exact", head: true })
            .eq("model_id", modelId);

          // Message count (conversations)
          const { count: messageCount } = await (supabase
            .from("conversation_participants") as any)
            .select("*", { count: "exact", head: true })
            .eq("actor_id", actor.id);

          // Last post
          const { data: lastPremium } = await (supabase
            .from("premium_content") as any)
            .select("created_at")
            .eq("model_id", modelId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (isMounted) {
            setStats({
              followers_count: followersCount || 0,
              total_earned: totalEarned,
              content_count: (premiumCount || 0) + (mediaCount || 0),
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
    : model.name || model.username;

  const profilePhoto = model.profile_photo_url || model.avatar_url;

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

  const instagramHandle = model.instagram_handle || model.instagram_name;

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
        <Button asChild>
          <Link href={`/${model.username}`} target="_blank">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Profile
          </Link>
        </Button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Photo & Basic Info */}
        <div className="space-y-6">
          {/* Profile Photo */}
          <Card>
            <CardContent className="pt-6">
              <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt={displayName}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              {model.admin_rating !== null && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <span className="text-sm text-muted-foreground">Admin Rating:</span>
                  <RatingStars rating={model.admin_rating} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <InfoRow label="Email" value={model.email} copyable icon={Mail} />
              {application?.phone && (
                <InfoRow label="Phone" value={application.phone} copyable icon={Phone} />
              )}
              <InfoRow
                label="Location"
                value={[model.city, model.state, model.country].filter(Boolean).join(", ") || null}
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
                      href={`https://instagram.com/${instagramHandle.replace("@", "")}`}
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
              {model.tiktok_handle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">TikTok</span>
                    <a
                      href={`https://tiktok.com/@${model.tiktok_handle.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-pink-500 hover:underline"
                    >
                      @{model.tiktok_handle.replace("@", "")}
                    </a>
                  </div>
                  {model.tiktok_followers && (
                    <span className="text-sm text-muted-foreground">
                      {model.tiktok_followers.toLocaleString()} followers
                    </span>
                  )}
                </div>
              )}
              {!instagramHandle && !model.tiktok_handle && (
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
                  model.date_of_birth || application?.date_of_birth
                    ? `${formatDate(model.date_of_birth || application?.date_of_birth || null)} (${calculateAge(model.date_of_birth || application?.date_of_birth || null)} years old)`
                    : null
                }
                icon={Calendar}
              />
              <InfoRow
                label="Height"
                value={model.height || application?.height || (model.height_inches ? `${Math.floor(model.height_inches / 12)}'${model.height_inches % 12}"` : null)}
                icon={Ruler}
              />
              <InfoRow label="Hair Color" value={model.hair_color} />
              <InfoRow label="Eye Color" value={model.eye_color} />
            </CardContent>
          </Card>

          {/* Measurements */}
          {model.measurements && Object.keys(model.measurements).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Measurements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(model.measurements).map(([key, value]) => (
                    <div key={key}>
                      <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
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
                <span className="text-sm text-muted-foreground">Profile Level</span>
                <span className="capitalize font-medium">{model.level_cached || "Rising"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Availability</span>
                <span className="capitalize font-medium">{model.availability || "Available"}</span>
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
              <StatCard label="Total Earned" value={stats.total_earned} icon={DollarSign} color="text-green-500" />
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
                <Link href={`/${model.username}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Link>
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
    </div>
  );
}
