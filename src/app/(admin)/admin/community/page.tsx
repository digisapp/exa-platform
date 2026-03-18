"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Users,
  Eye,
  Heart,
  Loader2,
  TrendingUp,
  Star,
  Calendar,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  UserCheck,
  Mail,
  Send,
  UserPlus,
  Sparkles,
  Building2,
  Instagram,
  ArrowRight,
  Camera,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApproveRejectButtons } from "@/components/admin/AdminActions";
import { toast } from "sonner";
import { ModelActionsDropdown } from "@/components/admin/AdminActions";
import FansTab from "@/components/admin/community/FansTab";
import BrandsTab from "@/components/admin/community/BrandsTab";
import MediaTab from "@/components/admin/community/MediaTab";

function RatingStars({ modelId, currentRating, onRatingChange }: {
  modelId: string;
  currentRating: number | null;
  onRatingChange: (modelId: string, rating: number | null) => void;
}) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [updating, setUpdating] = useState(false);

  const handleRate = async (rating: number) => {
    const newRating = currentRating === rating ? null : rating;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/models/${modelId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newRating }),
      });

      if (!res.ok) throw new Error("Failed to update");

      onRatingChange(modelId, newRating);
      toast.success(newRating ? `Rated ${newRating} stars` : "Rating cleared");
    } catch {
      toast.error("Failed to update rating");
    } finally {
      setUpdating(false);
    }
  };

  const displayRating = hoveredRating ?? currentRating ?? 0;

  return (
    <div className="flex items-center gap-0.5" onMouseLeave={() => setHoveredRating(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHoveredRating(star)}
          disabled={updating}
          className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Star
            className={`h-4 w-4 ${
              star <= displayRating
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function NewFaceToggle({ modelId, isNewFace, onToggle }: {
  modelId: string;
  isNewFace: boolean;
  onToggle: (modelId: string, newFace: boolean) => void;
}) {
  const [updating, setUpdating] = useState(false);

  const handleToggle = async () => {
    const newValue = !isNewFace;
    setUpdating(true);

    try {
      const res = await fetch(`/api/admin/models/${modelId}/new-face`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_face: newValue }),
      });

      if (!res.ok) throw new Error("Failed to update");

      onToggle(modelId, newValue);
      toast.success(newValue ? "Marked as New Face" : "Removed New Face badge");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={updating}
      className={`p-1.5 rounded-full transition-all ${
        isNewFace
          ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
          : "bg-muted/50 text-muted-foreground hover:bg-muted"
      } ${updating ? "opacity-50" : ""}`}
      title={isNewFace ? "Remove New Face" : "Mark as New Face"}
    >
      <Sparkles className="h-4 w-4" />
    </button>
  );
}

interface Model {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  city: string | null;
  state: string | null;
  is_approved: boolean;
  profile_photo_url: string | null;
  profile_views: number;
  coin_balance: number;
  instagram_name: string | null;
  instagram_followers: number | null;
  admin_rating: number | null;
  new_face: boolean;
  created_at: string;
  followers_count?: number;
  user_id: string | null;
  invite_token: string | null;
  claimed_at: string | null;
  // New tracking fields
  total_earned?: number;
  content_count?: number;
  image_count?: number;
  video_count?: number;
  ppv_count?: number;
  last_post?: string | null;
  last_seen?: string | null;
  last_active_at?: string | null;
  message_count?: number;
  joined_at?: string | null;
  referral_count?: number;
}

interface ModelApplication {
  id: string;
  display_name: string;
  email: string;
  instagram_username: string | null;
  tiktok_username: string | null;
  date_of_birth: string | null;
  height: string | null;
  status: string;
  created_at: string;
}

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState("models");
  const supabase = createClient();

  // Combined stats
  const [stats, setStats] = useState({
    totalModels: 0,
    approvedModels: 0,
    totalFans: 0,
    activeFans: 0,
    pendingBrands: 0,
    pendingModelApps: 0,
  });

  // Invite stats
  const [inviteStats, setInviteStats] = useState({
    pending: 0,
    invited: 0,
    claimed: 0,
    warmup: {
      started: false,
      startDate: null as string | null,
      day: 0,
      dailyLimit: 0,
      sentToday: 0,
      remainingToday: 0,
      schedule: [] as { day: number; limit: number }[],
    },
  });
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteProgress, setInviteProgress] = useState({ sent: 0, total: 0 });

  // Models preview state (full table moved to /admin/models)
  const [recentModels, setRecentModels] = useState<Model[]>([]);
  const [recentModelsLoading, setRecentModelsLoading] = useState(true);

  // Model applications state
  const [modelApps, setModelApps] = useState<ModelApplication[]>([]);
  const [modelAppsLoading, setModelAppsLoading] = useState(true);

  // Load stats
  const loadStats = useCallback(async () => {
    const [
      { count: totalModels },
      { count: approvedModels },
      { count: totalFans },
      { count: activeFans },
      { count: pendingBrands },
      { count: pendingModelApps },
    ] = await Promise.all([
      (supabase.from("models") as any).select("*", { count: "exact", head: true }),
      (supabase.from("models") as any).select("*", { count: "exact", head: true }).eq("is_approved", true),
      (supabase.from("fans") as any).select("*", { count: "exact", head: true }),
      (supabase.from("fans") as any).select("*", { count: "exact", head: true }).eq("is_suspended", false),
      (supabase.from("brands") as any).select("*", { count: "exact", head: true }).eq("is_verified", false),
      (supabase.from("model_applications") as any).select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    setStats({
      totalModels: totalModels || 0,
      approvedModels: approvedModels || 0,
      totalFans: totalFans || 0,
      activeFans: activeFans || 0,
      pendingBrands: pendingBrands || 0,
      pendingModelApps: pendingModelApps || 0,
    });
  }, [supabase]);

  // Load invite stats
  const loadInviteStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invites/send");
      if (res.ok) {
        const data = await res.json();
        setInviteStats(data);
      }
    } catch (error) {
      console.error("Failed to load invite stats:", error);
    }
  }, []);

  // Send bulk invites
  const sendBulkInvites = async () => {
    if (sendingInvites) return;

    if (!inviteStats.warmup.started) {
      toast.error("Email warmup not started. Add EMAIL_WARMUP_START_DATE to Vercel environment variables first.");
      return;
    }

    if (inviteStats.warmup.remainingToday === 0) {
      toast.info(`Daily limit reached (${inviteStats.warmup.dailyLimit}). Try again tomorrow.`);
      return;
    }

    if (inviteStats.pending === 0) {
      toast.info("No pending invites to send");
      return;
    }

    const toSend = Math.min(inviteStats.pending, inviteStats.warmup.remainingToday);
    const confirmed = window.confirm(
      `Send invite emails?\n\n` +
      `Day ${inviteStats.warmup.day} of warmup\n` +
      `Daily limit: ${inviteStats.warmup.dailyLimit}\n` +
      `Already sent today: ${inviteStats.warmup.sentToday}\n` +
      `Will send: up to ${toSend} emails\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setSendingInvites(true);
    setInviteProgress({ sent: 0, total: toSend });

    try {
      let totalSent = 0;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch("/api/admin/invites/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sendAll: true }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.warmupNotStarted) {
            toast.error("Email warmup not started. Set EMAIL_WARMUP_START_DATE in Vercel.");
            break;
          }
          throw new Error(data.error || "Failed to send invites");
        }

        totalSent += data.sent;
        setInviteProgress({ sent: totalSent, total: toSend });

        hasMore = data.hasMore && data.remainingToday > 0;

        if (data.failed > 0) {
          console.warn(`${data.failed} emails failed to send`);
        }

        if (data.remainingToday === 0) {
          toast.info(`Daily limit reached. Sent ${totalSent} today.`);
          break;
        }
      }

      if (totalSent > 0) {
        toast.success(`Successfully sent ${totalSent} invite emails!`);
      }
      await loadInviteStats();
      await loadRecentModels();
    } catch (error) {
      console.error("Failed to send invites:", error);
      toast.error("Failed to send invites");
    } finally {
      setSendingInvites(false);
    }
  };

  // Load recent models preview (10 most recent)
  const loadRecentModels = useCallback(async () => {
    setRecentModelsLoading(true);

    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "10",
        sortField: "joined_at",
        sortDirection: "desc",
      });

      const res = await fetch(`/api/admin/models?${params}`);
      if (!res.ok) throw new Error("Failed to fetch models");

      const { models: data } = await res.json();
      setRecentModels(data || []);
    } catch (error) {
      console.error("Failed to load recent models:", error);
    } finally {
      setRecentModelsLoading(false);
    }
  }, []);

  // Load model applications
  const loadModelApps = useCallback(async () => {
    setModelAppsLoading(true);
    const { data } = await (supabase.from("model_applications") as any)
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50);
    setModelApps(data || []);
    setModelAppsLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadStats();
    void loadInviteStats();
  }, [loadStats, loadInviteStats]);

  useEffect(() => {
    if (activeTab === "models") {
      void loadRecentModels();
      void loadModelApps(); // Also load model apps for the alert
    }
  }, [activeTab, loadRecentModels, loadModelApps]);

  const handleRatingChange = (modelId: string, rating: number | null) => {
    setRecentModels(prev => prev.map(m => m.id === modelId ? { ...m, admin_rating: rating } : m));
  };

  const handleNewFaceToggle = (modelId: string, newFace: boolean) => {
    setRecentModels(prev => prev.map(m => m.id === modelId ? { ...m, new_face: newFace } : m));
  };

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Community Dashboard</h1>
            <p className="text-muted-foreground">
              Manage {stats.totalModels.toLocaleString()} models and {stats.totalFans.toLocaleString()} fans
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/rate">
              <Star className="h-4 w-4 mr-2" />
              Quick Rate
            </Link>
          </Button>
          <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
            <Link href="/admin/models">
              <Users className="h-4 w-4 mr-2" />
              View All Models
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalModels.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Models</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.approvedModels.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Approved Models</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalFans.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeFans.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active Fans</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
          <TabsTrigger value="models" className="gap-2">
            <Users className="h-4 w-4" />
            Models ({stats.totalModels.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="fans" className="gap-2">
            <Heart className="h-4 w-4" />
            Fans ({stats.totalFans.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Building2 className="h-4 w-4" />
            Brands ({stats.pendingBrands})
          </TabsTrigger>
          <TabsTrigger value="media" className="gap-2">
            <Camera className="h-4 w-4" />
            Media
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          {/* Model Applications Section */}
          {stats.pendingModelApps > 0 && (
            <Card className="border-pink-500/50 bg-pink-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-pink-500" />
                    <CardTitle className="text-lg">Model Applications ({stats.pendingModelApps})</CardTitle>
                  </div>
                </div>
                <CardDescription>Signups from the Models Sign Up form</CardDescription>
              </CardHeader>
              <CardContent>
                {modelAppsLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : modelApps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No pending applications</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {modelApps.map((app) => {
                      // Calculate age from date_of_birth
                      const age = app.date_of_birth
                        ? Math.floor((new Date().getTime() - new Date(app.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                        : null;
                      return (
                        <div key={app.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold">
                              {app.display_name?.charAt(0).toUpperCase() || "?"}
                            </div>
                            <div>
                              <p className="font-medium">{app.display_name}</p>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {app.instagram_username && (
                                  <a
                                    href={`https://instagram.com/${app.instagram_username?.replace(/^@/, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-500 hover:text-pink-400 flex items-center gap-1"
                                  >
                                    <Instagram className="h-3 w-3" />
                                    @{app.instagram_username}
                                  </a>
                                )}
                                {age && <span>{age} yrs</span>}
                                {app.height && <span>{app.height}</span>}
                              </div>
                            </div>
                          </div>
                          <ApproveRejectButtons id={app.id} type="model_application" onSuccess={() => { loadModelApps(); loadStats(); }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invite Stats & Send Button */}
          {inviteStats.pending > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Stats Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-amber-500" />
                        <div>
                          <p className="text-2xl font-bold">{inviteStats.pending.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Pending Invites</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-2xl font-bold">{inviteStats.invited.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Emails Sent</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-2xl font-bold">{inviteStats.claimed.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Claimed</p>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={sendBulkInvites}
                      disabled={sendingInvites || inviteStats.pending === 0 || !inviteStats.warmup.started || inviteStats.warmup.remainingToday === 0}
                      className="bg-gradient-to-r from-pink-500 to-violet-500"
                    >
                      {sendingInvites ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending... ({inviteProgress.sent}/{inviteProgress.total})
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invite Emails
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Warmup Status */}
                  {!inviteStats.warmup.started ? (
                    <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <p className="text-sm text-yellow-500 font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Email warmup not started
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add <code className="bg-muted px-1 rounded">EMAIL_WARMUP_START_DATE</code> to Vercel environment variables (format: YYYY-MM-DD) to begin sending invites.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Day {inviteStats.warmup.day} of warmup</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>Daily limit: {inviteStats.warmup.dailyLimit}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500">
                        <Check className="h-4 w-4" />
                        <span>Sent today: {inviteStats.warmup.sentToday}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-500">
                        <Clock className="h-4 w-4" />
                        <span>Remaining: {inviteStats.warmup.remainingToday}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Models Preview */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Models</CardTitle>
                  <CardDescription>
                    Most recently joined models - View the full list for advanced filtering, sorting, and bulk actions
                  </CardDescription>
                </div>
                <Button asChild className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600">
                  <Link href="/admin/models">
                    View All {stats.totalModels.toLocaleString()} Models
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentModelsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : recentModels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No models found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentModels.map((model) => (
                    <div key={model.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Link href={`/admin/models/${model.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity min-w-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                            {model.profile_photo_url ? (
                              <Image src={model.profile_photo_url} alt={model.username} width={80} height={80} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                                {model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate text-pink-500 hover:text-pink-400">
                              {model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">@{model.username}</p>
                          </div>
                        </Link>
                        {model.instagram_name && (
                          <a
                            href={`https://instagram.com/${model.instagram_name.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hidden sm:flex items-center gap-1 text-pink-500 hover:text-pink-400 text-sm"
                          >
                            <Instagram className="h-4 w-4" />
                            {model.instagram_followers ? `${(model.instagram_followers / 1000).toFixed(1)}K` : model.instagram_name.replace('@', '')}
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <RatingStars modelId={model.id} currentRating={model.admin_rating} onRatingChange={handleRatingChange} />
                        <NewFaceToggle modelId={model.id} isNewFace={model.new_face || false} onToggle={handleNewFaceToggle} />
                        {model.is_approved ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/50">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/50">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                        <ModelActionsDropdown
                          id={model.id}
                          modelName={model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}
                          isApproved={model.is_approved}
                          onAction={loadRecentModels}
                        />
                      </div>
                    </div>
                  ))}

                  {/* View All Link */}
                  <div className="pt-4 border-t">
                    <Link
                      href="/admin/models"
                      className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/10 to-violet-500/10 hover:from-pink-500/20 hover:to-violet-500/20 text-pink-500 font-medium transition-all"
                    >
                      <Users className="h-5 w-5" />
                      Manage All {stats.totalModels.toLocaleString()} Models
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fans Tab */}
        <TabsContent value="fans" className="space-y-6">
          <FansTab />
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-6">
          <BrandsTab />
        </TabsContent>

        {/* Media Tab */}
        <TabsContent value="media" className="space-y-6">
          <MediaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
