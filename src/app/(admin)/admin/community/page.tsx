"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Users,
  Eye,
  Coins,
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Star,
  Calendar,
  AlertTriangle,
  Copy,
  Check,
  CheckCircle,
  Clock,
  UserCheck,
  Mail,
  Send,
  KeyRound,
  UserPlus,
  Sparkles,
  Building2,
  Globe,
  ExternalLink,
  Instagram,
  Image as ImageIcon,
  Video,
  Lock,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ApproveRejectButtons } from "@/components/admin/AdminActions";
import { toast } from "sonner";
import { ModelActionsDropdown, FanActionsDropdown } from "@/components/admin/AdminActions";

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return direction === "asc"
    ? <ArrowUp className="h-4 w-4 ml-1 text-pink-500" />
    : <ArrowDown className="h-4 w-4 ml-1 text-pink-500" />;
}

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

function CopyInviteButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}/claim/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 px-2">
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </Button>
  );
}

function CreateLoginButton({ modelId, onSuccess }: { modelId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedBoth, setCopiedBoth] = useState(false);

  const handleCreateLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/create-login`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create login");
      }

      setCredentials({ email: data.email, password: data.password });
      setShowModal(true);
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create login");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: "email" | "password" | "both") => {
    await navigator.clipboard.writeText(text);
    if (type === "email") {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else if (type === "password") {
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    } else {
      setCopiedBoth(true);
      setTimeout(() => setCopiedBoth(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCreateLogin}
        disabled={loading}
        className="h-7 px-2 text-xs gap-1"
      >
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <KeyRound className="h-3 w-3" />
        )}
        Create Login
      </Button>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Login Created!
            </DialogTitle>
            <DialogDescription>
              Copy these credentials to share with the model.
            </DialogDescription>
          </DialogHeader>

          {credentials && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <div className="flex gap-2">
                  <Input value={credentials.email} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.email, "email")}
                  >
                    {copiedEmail ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Password</label>
                <div className="flex gap-2">
                  <Input value={credentials.password} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(credentials.password, "password")}
                  >
                    {copiedPassword ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => copyToClipboard(`Email: ${credentials.email}\nPassword: ${credentials.password}`, "both")}
              >
                {copiedBoth ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Both
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface Fan {
  id: string;
  user_id: string;
  actor_id?: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  coin_balance: number;
  total_coins_purchased: number;
  state: string | null;
  is_suspended: boolean;
  created_at: string;
  coins_spent?: number;
  following_count?: number;
  report_count?: number;
}

interface Brand {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string;
  website: string | null;
  bio: string | null;
  subscription_tier: string;
  is_verified: boolean;
  form_data: {
    industry?: string;
    budget_range?: string;
  } | null;
  created_at: string;
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

type ModelSortField = "profile_views" | "coin_balance" | "followers_count" | "instagram_followers" | "admin_rating" | "created_at" | "joined_at" | "total_earned" | "content_count" | "image_count" | "video_count" | "ppv_count" | "last_post" | "last_seen" | "message_count" | "referral_count";
type FanSortField = "coins_spent" | "following_count" | "coin_balance" | "created_at" | "report_count";
type SortDirection = "asc" | "desc";

// State abbreviations (stored in DB) mapped to display names
const US_STATES: { abbr: string; name: string }[] = [
  { abbr: "AL", name: "Alabama" }, { abbr: "AK", name: "Alaska" }, { abbr: "AZ", name: "Arizona" },
  { abbr: "AR", name: "Arkansas" }, { abbr: "CA", name: "California" }, { abbr: "CO", name: "Colorado" },
  { abbr: "CT", name: "Connecticut" }, { abbr: "DE", name: "Delaware" }, { abbr: "FL", name: "Florida" },
  { abbr: "GA", name: "Georgia" }, { abbr: "HI", name: "Hawaii" }, { abbr: "ID", name: "Idaho" },
  { abbr: "IL", name: "Illinois" }, { abbr: "IN", name: "Indiana" }, { abbr: "IA", name: "Iowa" },
  { abbr: "KS", name: "Kansas" }, { abbr: "KY", name: "Kentucky" }, { abbr: "LA", name: "Louisiana" },
  { abbr: "ME", name: "Maine" }, { abbr: "MD", name: "Maryland" }, { abbr: "MA", name: "Massachusetts" },
  { abbr: "MI", name: "Michigan" }, { abbr: "MN", name: "Minnesota" }, { abbr: "MS", name: "Mississippi" },
  { abbr: "MO", name: "Missouri" }, { abbr: "MT", name: "Montana" }, { abbr: "NE", name: "Nebraska" },
  { abbr: "NV", name: "Nevada" }, { abbr: "NH", name: "New Hampshire" }, { abbr: "NJ", name: "New Jersey" },
  { abbr: "NM", name: "New Mexico" }, { abbr: "NY", name: "New York" }, { abbr: "NC", name: "North Carolina" },
  { abbr: "ND", name: "North Dakota" }, { abbr: "OH", name: "Ohio" }, { abbr: "OK", name: "Oklahoma" },
  { abbr: "OR", name: "Oregon" }, { abbr: "PA", name: "Pennsylvania" }, { abbr: "RI", name: "Rhode Island" },
  { abbr: "SC", name: "South Carolina" }, { abbr: "SD", name: "South Dakota" }, { abbr: "TN", name: "Tennessee" },
  { abbr: "TX", name: "Texas" }, { abbr: "UT", name: "Utah" }, { abbr: "VT", name: "Vermont" },
  { abbr: "VA", name: "Virginia" }, { abbr: "WA", name: "Washington" }, { abbr: "WV", name: "West Virginia" },
  { abbr: "WI", name: "Wisconsin" }, { abbr: "WY", name: "Wyoming" }
];

export default function AdminCommunityPage() {
  const [activeTab, setActiveTab] = useState("models");
  const supabase = createClient();
  const pageSize = 50;

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

  // Fans state
  const [fans, setFans] = useState<Fan[]>([]);
  const [fansLoading, setFansLoading] = useState(true);
  const [fansTotalCount, setFansTotalCount] = useState(0);
  const [fansPage, setFansPage] = useState(1);
  const [fansSearch, setFansSearch] = useState("");
  const [fansStateFilter, setFansStateFilter] = useState<string>("all");
  const [fansStatusFilter, setFansStatusFilter] = useState<string>("all");
  const [fansReportsFilter, setFansReportsFilter] = useState<string>("all");
  const [fansSortField, setFansSortField] = useState<FanSortField>("created_at");
  const [fansSortDirection, setFansSortDirection] = useState<SortDirection>("desc");

  // Brands state
  const [brands, setBrands] = useState<Brand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsFilter, setBrandsFilter] = useState<"pending" | "approved" | "all">("pending");

  // Model applications state
  const [modelApps, setModelApps] = useState<ModelApplication[]>([]);
  const [modelAppsLoading, setModelAppsLoading] = useState(true);

  // Bulk selection and CSV export moved to dedicated /admin/models page

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

  // Load fans
  const loadFans = useCallback(async () => {
    setFansLoading(true);

    let query = (supabase.from("fans") as any)
      .select(`id, user_id, display_name, email, avatar_url, coin_balance, total_coins_purchased, state, is_suspended, created_at`, { count: "exact" });

    if (fansSearch) query = query.or(`display_name.ilike.%${fansSearch}%,email.ilike.%${fansSearch}%`);
    if (fansStateFilter !== "all") query = query.eq("state", fansStateFilter);
    if (fansStatusFilter !== "all") query = query.eq("is_suspended", fansStatusFilter === "suspended");

    if (fansSortField === "coin_balance" || fansSortField === "created_at") {
      query = query.order(fansSortField, { ascending: fansSortDirection === "asc", nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const from = (fansPage - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (error) { console.error(error); setFansLoading(false); return; }

    if (data?.length > 0) {
      const fanIds = data.map((f: any) => f.id);
      const userIds = data.map((f: any) => f.user_id).filter(Boolean);

      // Get actor IDs
      const { data: actors } = await (supabase.from("actors") as any)
        .select("id, user_id").in("user_id", userIds).eq("type", "fan");

      const userToActorMap = new Map<string, string>();
      actors?.forEach((a: any) => { userToActorMap.set(a.user_id, a.id); });
      data.forEach((fan: any) => { fan.actor_id = userToActorMap.get(fan.user_id); });

      const actorIds = actors?.map((a: any) => a.id) || [];

      // Get coins spent
      const { data: transactions } = await (supabase.from("coin_transactions") as any)
        .select("actor_id, amount").in("actor_id", fanIds).lt("amount", 0);

      const spentMap = new Map<string, number>();
      transactions?.forEach((tx: any) => {
        spentMap.set(tx.actor_id, (spentMap.get(tx.actor_id) || 0) + Math.abs(tx.amount));
      });

      // Get following count
      const { data: follows } = await (supabase.from("follows") as any)
        .select("follower_id").in("follower_id", fanIds);

      const followMap = new Map<string, number>();
      follows?.forEach((f: any) => {
        followMap.set(f.follower_id, (followMap.get(f.follower_id) || 0) + 1);
      });

      // Get report counts
      const reportMap = new Map<string, number>();
      if (actorIds.length > 0) {
        const { data: reports } = await (supabase.from("reports") as any)
          .select("reported_user_id").in("reported_user_id", actorIds);
        reports?.forEach((r: any) => {
          reportMap.set(r.reported_user_id, (reportMap.get(r.reported_user_id) || 0) + 1);
        });
      }

      data.forEach((fan: any) => {
        fan.coins_spent = spentMap.get(fan.id) || 0;
        fan.following_count = followMap.get(fan.id) || 0;
        fan.report_count = fan.actor_id ? (reportMap.get(fan.actor_id) || 0) : 0;
      });

      // Filter by reports
      let filteredData = data;
      if (fansReportsFilter === "has_reports") {
        filteredData = data.filter((f: any) => f.report_count > 0);
      }

      // Sort computed fields
      if (fansSortField === "coins_spent" || fansSortField === "following_count" || fansSortField === "report_count") {
        filteredData.sort((a: any, b: any) => {
          const aVal = a[fansSortField] || 0;
          const bVal = b[fansSortField] || 0;
          return fansSortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
      }

      setFans(filteredData);
      setFansTotalCount(count || 0);
      setFansLoading(false);
      return;
    }

    setFans(data || []);
    setFansTotalCount(count || 0);
    setFansLoading(false);
  }, [supabase, fansSearch, fansStateFilter, fansStatusFilter, fansReportsFilter, fansSortField, fansSortDirection, fansPage]);

  // Load brands
  const loadBrands = useCallback(async () => {
    setBrandsLoading(true);
    let query = (supabase.from("brands") as any).select("*");

    if (brandsFilter === "pending") {
      query = query.eq("is_verified", false);
    } else if (brandsFilter === "approved") {
      query = query.eq("is_verified", true);
    }

    const { data } = await query
      .order("created_at", { ascending: false })
      .limit(50);
    setBrands(data || []);
    setBrandsLoading(false);
  }, [supabase, brandsFilter]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "models") {
      void loadRecentModels();
      void loadModelApps(); // Also load model apps for the alert
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "fans") void loadFans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fansSearch, fansStateFilter, fansStatusFilter, fansReportsFilter, fansSortField, fansSortDirection, fansPage]);

  useEffect(() => {
    if (activeTab === "brands") void loadBrands();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, brandsFilter]);

  const handleRatingChange = (modelId: string, rating: number | null) => {
    setRecentModels(prev => prev.map(m => m.id === modelId ? { ...m, admin_rating: rating } : m));
  };

  const handleNewFaceToggle = (modelId: string, newFace: boolean) => {
    setRecentModels(prev => prev.map(m => m.id === modelId ? { ...m, new_face: newFace } : m));
  };

  const handleFanSort = (field: FanSortField) => {
    if (fansSortField === field) setFansSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setFansSortField(field); setFansSortDirection("desc"); }
    setFansPage(1);
  };

  const fansTotalPages = Math.ceil(fansTotalCount / pageSize);

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
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
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
                                    href={`https://instagram.com/${app.instagram_username}`}
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
                              <Image src={model.profile_photo_url} alt={model.username} width={80} height={80} className="w-full h-full object-cover" unoptimized={model.profile_photo_url.includes('cdninstagram.com')} />
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
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={fansSearch}
                      onChange={(e) => { setFansSearch(e.target.value); setFansPage(1); }}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={fansStateFilter} onValueChange={(v) => { setFansStateFilter(v); setFansPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {US_STATES.map((state) => (<SelectItem key={state.abbr} value={state.abbr}>{state.name}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={fansStatusFilter} onValueChange={(v) => { setFansStatusFilter(v); setFansPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={fansReportsFilter} onValueChange={(v) => { setFansReportsFilter(v); setFansPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by reports" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fans</SelectItem>
                    <SelectItem value="has_reports">Has Reports</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Fans Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Fans</CardTitle>
                  <CardDescription>
                    {fansTotalCount > 0
                      ? `Showing ${((fansPage - 1) * pageSize) + 1} - ${Math.min(fansPage * pageSize, fansTotalCount)} of ${fansTotalCount.toLocaleString()}`
                      : "No fans found"}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setFansPage(p => Math.max(1, p - 1))} disabled={fansPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {fansPage} of {fansTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setFansPage(p => Math.min(fansTotalPages, p + 1))} disabled={fansPage === fansTotalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fansLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : fans.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No fans found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[250px]">Fan</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("created_at")}>
                          <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />Joined<SortIndicator active={fansSortField === "created_at"} direction={fansSortDirection} /></div>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("report_count")}>
                          <div className="flex items-center"><AlertTriangle className="h-4 w-4 mr-1" />Reports<SortIndicator active={fansSortField === "report_count"} direction={fansSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("coins_spent")}>
                          <div className="flex items-center"><Coins className="h-4 w-4 mr-1" />Spent<SortIndicator active={fansSortField === "coins_spent"} direction={fansSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("following_count")}>
                          <div className="flex items-center"><Heart className="h-4 w-4 mr-1" />Favorites<SortIndicator active={fansSortField === "following_count"} direction={fansSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("coin_balance")}>
                          <div className="flex items-center"><Coins className="h-4 w-4 mr-1" />Balance<SortIndicator active={fansSortField === "coin_balance"} direction={fansSortDirection} /></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fans.map((fan) => (
                        <TableRow key={fan.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex-shrink-0">
                                {fan.avatar_url ? (
                                  <Image src={fan.avatar_url} alt={fan.display_name || "Fan"} width={80} height={80} className="w-full h-full object-cover" unoptimized={fan.avatar_url.includes('cdninstagram.com')} />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm font-bold">{fan.display_name?.charAt(0) || fan.email?.charAt(0)?.toUpperCase() || "F"}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{fan.display_name || "Fan"}</p>
                                <p className="text-sm text-muted-foreground truncate">{fan.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{fan.state || "-"}</span></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{new Date(fan.created_at).toLocaleDateString()}</span></TableCell>
                          <TableCell><FanActionsDropdown id={fan.id} fanName={fan.display_name || fan.email || "Fan"} isSuspended={fan.is_suspended || false} onAction={loadFans} /></TableCell>
                          <TableCell>
                            {(fan.report_count || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium"><AlertTriangle className="h-4 w-4" />{fan.report_count}</span>
                            ) : <span className="text-muted-foreground">0</span>}
                          </TableCell>
                          <TableCell><span className={`font-medium ${(fan.coins_spent || 0) > 0 ? "text-yellow-500" : ""}`}>{(fan.coins_spent || 0).toLocaleString()}</span></TableCell>
                          <TableCell><span className={`font-medium ${(fan.following_count || 0) > 0 ? "text-pink-500" : ""}`}>{(fan.following_count || 0).toLocaleString()}</span></TableCell>
                          <TableCell><span className={`font-medium ${fan.coin_balance > 0 ? "text-green-500" : ""}`}>{(fan.coin_balance || 0).toLocaleString()}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands" className="space-y-6">
          {/* Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Select value={brandsFilter} onValueChange={(v: "pending" | "approved" | "all") => setBrandsFilter(v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter brands" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="all">All Brands</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  Showing {brands.length} {brandsFilter === "all" ? "brands" : brandsFilter === "pending" ? "pending" : "approved"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {brandsFilter === "pending" ? "Pending Brand Inquiries" : brandsFilter === "approved" ? "Approved Brands" : "All Brands"}
              </CardTitle>
              <CardDescription>
                {brandsFilter === "pending" ? "Partnership requests awaiting approval" : brandsFilter === "approved" ? "Verified brand partners" : "All brand inquiries and partners"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {brandsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : brands.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{brandsFilter === "pending" ? "No pending brand inquiries" : brandsFilter === "approved" ? "No approved brands yet" : "No brands yet"}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {brands.map((brand) => (
                    <div
                      key={brand.id}
                      className="p-4 rounded-lg bg-muted/50 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg">
                            {brand.company_name?.charAt(0).toUpperCase() || "B"}
                          </div>
                          <div>
                            <p className="font-semibold text-lg">{brand.company_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {brand.contact_name}
                            </p>
                          </div>
                        </div>
                        {brand.is_verified ? (
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
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground truncate">{brand.email}</span>
                        </div>
                        {brand.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-cyan-500 hover:underline truncate flex items-center gap-1">
                              Website <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                        {brand.form_data?.industry && (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{brand.form_data.industry}</span>
                          </div>
                        )}
                        {brand.form_data?.budget_range && (
                          <div className="text-muted-foreground">
                            Budget: {brand.form_data.budget_range.replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                      {brand.bio && (
                        <p className="text-sm text-muted-foreground bg-background/50 p-3 rounded">
                          {brand.bio}
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(brand.created_at).toLocaleDateString()}
                        </span>
                        {!brand.is_verified && (
                          <ApproveRejectButtons id={brand.id} type="brand" onSuccess={() => { loadBrands(); loadStats(); }} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
