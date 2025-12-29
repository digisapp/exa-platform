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
  Link as LinkIcon,
  Copy,
  Check,
  Clock,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ModelActionsDropdown, FanActionsDropdown } from "@/components/admin/AdminActions";

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return direction === "asc"
    ? <ArrowUp className="h-4 w-4 ml-1" />
    : <ArrowDown className="h-4 w-4 ml-1" />;
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
  created_at: string;
  followers_count?: number;
  user_id: string | null;
  invite_token: string | null;
  claimed_at: string | null;
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

type ModelSortField = "profile_views" | "coin_balance" | "followers_count" | "instagram_followers" | "admin_rating" | "created_at";
type FanSortField = "coins_spent" | "following_count" | "coin_balance" | "created_at" | "report_count";
type SortDirection = "asc" | "desc";

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
  "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan",
  "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire",
  "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
  "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
  "Wisconsin", "Wyoming"
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
  });

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsTotalCount, setModelsTotalCount] = useState(0);
  const [modelsPage, setModelsPage] = useState(1);
  const [modelsSearch, setModelsSearch] = useState("");
  const [modelsStateFilter, setModelsStateFilter] = useState<string>("all");
  const [modelsApprovalFilter, setModelsApprovalFilter] = useState<string>("all");
  const [modelsRatingFilter, setModelsRatingFilter] = useState<string>("all");
  const [modelsClaimFilter, setModelsClaimFilter] = useState<string>("all");
  const [modelsSortField, setModelsSortField] = useState<ModelSortField>("profile_views");
  const [modelsSortDirection, setModelsSortDirection] = useState<SortDirection>("desc");

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

  // Load stats
  const loadStats = useCallback(async () => {
    const [
      { count: totalModels },
      { count: approvedModels },
      { count: totalFans },
      { count: activeFans },
    ] = await Promise.all([
      (supabase.from("models") as any).select("*", { count: "exact", head: true }),
      (supabase.from("models") as any).select("*", { count: "exact", head: true }).eq("is_approved", true),
      (supabase.from("fans") as any).select("*", { count: "exact", head: true }),
      (supabase.from("fans") as any).select("*", { count: "exact", head: true }).eq("is_suspended", false),
    ]);

    setStats({
      totalModels: totalModels || 0,
      approvedModels: approvedModels || 0,
      totalFans: totalFans || 0,
      activeFans: activeFans || 0,
    });
  }, [supabase]);

  // Load models
  const loadModels = useCallback(async () => {
    setModelsLoading(true);

    let query = (supabase.from("models") as any)
      .select(`
        id, username, first_name, last_name, email, city, state, is_approved,
        profile_photo_url, profile_views, coin_balance, instagram_name,
        instagram_followers, admin_rating, created_at, user_id, invite_token, claimed_at
      `, { count: "exact" });

    if (modelsSearch) {
      query = query.or(`username.ilike.%${modelsSearch}%,first_name.ilike.%${modelsSearch}%,last_name.ilike.%${modelsSearch}%,email.ilike.%${modelsSearch}%`);
    }
    if (modelsStateFilter !== "all") query = query.eq("state", modelsStateFilter);
    if (modelsApprovalFilter !== "all") query = query.eq("is_approved", modelsApprovalFilter === "approved");
    if (modelsRatingFilter !== "all") {
      if (modelsRatingFilter === "rated") query = query.not("admin_rating", "is", null);
      else if (modelsRatingFilter === "unrated") query = query.is("admin_rating", null);
      else query = query.gte("admin_rating", parseInt(modelsRatingFilter));
    }
    if (modelsClaimFilter !== "all") {
      if (modelsClaimFilter === "claimed") query = query.not("user_id", "is", null);
      else if (modelsClaimFilter === "unclaimed") query = query.is("user_id", null);
    }

    query = query.order(modelsSortField, { ascending: modelsSortDirection === "asc", nullsFirst: false });
    const from = (modelsPage - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;
    if (error) { console.error(error); setModelsLoading(false); return; }

    // Get follower counts
    if (data?.length > 0) {
      const { data: actors } = await (supabase.from("actors") as any)
        .select("id, user_id").in("user_id", data.map((m: any) => m.user_id || m.id));

      if (actors) {
        const actorIds = actors.map((a: any) => a.id);
        const { data: followCounts } = await (supabase.from("follows") as any)
          .select("following_id").in("following_id", actorIds);

        const followerMap = new Map<string, number>();
        followCounts?.forEach((f: any) => {
          followerMap.set(f.following_id, (followerMap.get(f.following_id) || 0) + 1);
        });

        const actorToUser = new Map(actors.map((a: any) => [a.user_id, a.id]));
        data.forEach((model: any) => {
          const actorId = actorToUser.get(model.user_id || model.id) || "";
          model.followers_count = actorId ? (followerMap.get(actorId as string) || 0) : 0;
        });
      }
    }

    setModels(data || []);
    setModelsTotalCount(count || 0);
    setModelsLoading(false);
  }, [supabase, modelsSearch, modelsStateFilter, modelsApprovalFilter, modelsRatingFilter, modelsClaimFilter, modelsSortField, modelsSortDirection, modelsPage]);

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

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "models") void loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, modelsSearch, modelsStateFilter, modelsApprovalFilter, modelsRatingFilter, modelsClaimFilter, modelsSortField, modelsSortDirection, modelsPage]);

  useEffect(() => {
    if (activeTab === "fans") void loadFans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fansSearch, fansStateFilter, fansStatusFilter, fansReportsFilter, fansSortField, fansSortDirection, fansPage]);

  const handleRatingChange = (modelId: string, rating: number | null) => {
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, admin_rating: rating } : m));
  };

  const handleModelSort = (field: ModelSortField) => {
    if (modelsSortField === field) setModelsSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setModelsSortField(field); setModelsSortDirection("desc"); }
    setModelsPage(1);
  };

  const handleFanSort = (field: FanSortField) => {
    if (fansSortField === field) setFansSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setFansSortField(field); setFansSortDirection("desc"); }
    setFansPage(1);
  };

  const modelsTotalPages = Math.ceil(modelsTotalCount / pageSize);
  const fansTotalPages = Math.ceil(fansTotalCount / pageSize);

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Community</h1>
          <p className="text-muted-foreground">
            Manage {stats.totalModels.toLocaleString()} models and {stats.totalFans.toLocaleString()} fans
          </p>
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
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="models" className="gap-2">
            <Users className="h-4 w-4" />
            Models ({stats.totalModels.toLocaleString()})
          </TabsTrigger>
          <TabsTrigger value="fans" className="gap-2">
            <Heart className="h-4 w-4" />
            Fans ({stats.totalFans.toLocaleString()})
          </TabsTrigger>
        </TabsList>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, username, or email..."
                      value={modelsSearch}
                      onChange={(e) => { setModelsSearch(e.target.value); setModelsPage(1); }}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Select value={modelsStateFilter} onValueChange={(v) => { setModelsStateFilter(v); setModelsPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {US_STATES.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={modelsApprovalFilter} onValueChange={(v) => { setModelsApprovalFilter(v); setModelsPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modelsRatingFilter} onValueChange={(v) => { setModelsRatingFilter(v); setModelsPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by rating" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 stars</SelectItem>
                    <SelectItem value="4">4+ stars</SelectItem>
                    <SelectItem value="3">3+ stars</SelectItem>
                    <SelectItem value="rated">Rated Only</SelectItem>
                    <SelectItem value="unrated">Unrated Only</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modelsClaimFilter} onValueChange={(v) => { setModelsClaimFilter(v); setModelsPage(1); }}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by claim" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    <SelectItem value="claimed">Claimed (Has Login)</SelectItem>
                    <SelectItem value="unclaimed">Unclaimed (Needs Invite)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Models Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Models</CardTitle>
                  <CardDescription>
                    Showing {((modelsPage - 1) * pageSize) + 1} - {Math.min(modelsPage * pageSize, modelsTotalCount)} of {modelsTotalCount.toLocaleString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setModelsPage(p => Math.max(1, p - 1))} disabled={modelsPage === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">Page {modelsPage} of {modelsTotalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setModelsPage(p => Math.min(modelsTotalPages, p + 1))} disabled={modelsPage === modelsTotalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {modelsLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : models.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No models found</p></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[200px]">Model</TableHead>
                        <TableHead>Invite</TableHead>
                        <TableHead>Instagram</TableHead>
                        <TableHead>State</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleModelSort("admin_rating")}>
                          <div className="flex items-center"><Star className="h-4 w-4 mr-1" />Rating<SortIndicator active={modelsSortField === "admin_rating"} direction={modelsSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleModelSort("created_at")}>
                          <div className="flex items-center">Joined<SortIndicator active={modelsSortField === "created_at"} direction={modelsSortDirection} /></div>
                        </TableHead>
                        <TableHead>Actions</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleModelSort("profile_views")}>
                          <div className="flex items-center"><Eye className="h-4 w-4 mr-1" />Views<SortIndicator active={modelsSortField === "profile_views"} direction={modelsSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleModelSort("coin_balance")}>
                          <div className="flex items-center"><Coins className="h-4 w-4 mr-1" />Coins<SortIndicator active={modelsSortField === "coin_balance"} direction={modelsSortDirection} /></div>
                        </TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleModelSort("followers_count")}>
                          <div className="flex items-center"><Heart className="h-4 w-4 mr-1" />Favorites<SortIndicator active={modelsSortField === "followers_count"} direction={modelsSortDirection} /></div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {models.map((model) => (
                        <TableRow key={model.id}>
                          <TableCell>
                            <Link href={`/${model.username}`} target="_blank" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                                {model.profile_photo_url ? (
                                  <Image src={model.profile_photo_url} alt={model.username} width={80} height={80} className="w-full h-full object-cover" unoptimized />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-sm font-bold">{model.first_name?.charAt(0) || model.username?.charAt(0)?.toUpperCase() || "?"}</div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate text-pink-500 hover:text-pink-400">{model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}</p>
                                <p className="text-sm text-muted-foreground truncate">@{model.username}</p>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {model.user_id ? (
                              <span className="inline-flex items-center gap-1 text-green-500 text-sm">
                                <UserCheck className="h-4 w-4" />
                                Active
                              </span>
                            ) : model.invite_token ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center gap-1 text-amber-500 text-sm">
                                  <Clock className="h-4 w-4" />
                                  Pending
                                </span>
                                <CopyInviteButton token={model.invite_token} />
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {model.instagram_name ? (
                              <a href={`https://instagram.com/${model.instagram_name.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-400 transition-colors text-sm">{model.instagram_name.replace('@', '')}</a>
                            ) : <span className="text-muted-foreground text-sm">-</span>}
                          </TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{model.state || "-"}</span></TableCell>
                          <TableCell><RatingStars modelId={model.id} currentRating={model.admin_rating} onRatingChange={handleRatingChange} /></TableCell>
                          <TableCell><span className="text-sm text-muted-foreground">{new Date(model.created_at).toLocaleDateString()}</span></TableCell>
                          <TableCell><ModelActionsDropdown id={model.id} modelName={model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username} isApproved={model.is_approved} onAction={loadModels} /></TableCell>
                          <TableCell><span className={`font-medium ${model.profile_views > 100 ? "text-purple-500" : ""}`}>{(model.profile_views || 0).toLocaleString()}</span></TableCell>
                          <TableCell><span className={`font-medium ${model.coin_balance > 0 ? "text-yellow-500" : ""}`}>{(model.coin_balance || 0).toLocaleString()}</span></TableCell>
                          <TableCell><span className={`font-medium ${(model.followers_count || 0) > 0 ? "text-pink-500" : ""}`}>{(model.followers_count || 0).toLocaleString()}</span></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
                    {US_STATES.map((state) => (<SelectItem key={state} value={state}>{state}</SelectItem>))}
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
                    Showing {((fansPage - 1) * pageSize) + 1} - {Math.min(fansPage * pageSize, fansTotalCount)} of {fansTotalCount.toLocaleString()}
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
                                  <Image src={fan.avatar_url} alt={fan.display_name || "Fan"} width={80} height={80} className="w-full h-full object-cover" unoptimized />
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
      </Tabs>
    </div>
  );
}
