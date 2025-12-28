"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";
import { ModelActionsDropdown } from "@/components/admin/AdminActions";

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
    // If clicking the same rating, clear it
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
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHoveredRating(null)}
    >
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
}

type SortField = "profile_views" | "coin_balance" | "followers_count" | "instagram_followers" | "admin_rating" | "created_at";
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

export default function AdminModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("profile_views");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const pageSize = 50;
  const supabase = createClient();

  // Stats
  const [stats, setStats] = useState({
    totalModels: 0,
    approvedModels: 0,
    totalViews: 0,
    totalCoins: 0,
  });

  const loadStats = useCallback(async () => {
    const { count: total } = await (supabase
      .from("models") as any)
      .select("*", { count: "exact", head: true });

    const { count: approved } = await (supabase
      .from("models") as any)
      .select("*", { count: "exact", head: true })
      .eq("is_approved", true);

    const { data: viewsData } = await (supabase
      .from("models") as any)
      .select("profile_views");

    const { data: coinsData } = await (supabase
      .from("models") as any)
      .select("coin_balance");

    setStats({
      totalModels: total || 0,
      approvedModels: approved || 0,
      totalViews: viewsData?.reduce((sum: number, m: any) => sum + (m.profile_views || 0), 0) || 0,
      totalCoins: coinsData?.reduce((sum: number, m: any) => sum + (m.coin_balance || 0), 0) || 0,
    });
  }, [supabase]);

  const loadModels = useCallback(async () => {
    setLoading(true);

    let query = (supabase.from("models") as any)
      .select(`
        id,
        username,
        first_name,
        last_name,
        email,
        city,
        state,
        is_approved,
        profile_photo_url,
        profile_views,
        coin_balance,
        instagram_name,
        instagram_followers,
        admin_rating,
        created_at
      `, { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(`username.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (stateFilter !== "all") {
      query = query.eq("state", stateFilter);
    }

    if (approvalFilter !== "all") {
      query = query.eq("is_approved", approvalFilter === "approved");
    }

    // Apply rating filter
    if (ratingFilter !== "all") {
      if (ratingFilter === "rated") {
        query = query.not("admin_rating", "is", null);
      } else if (ratingFilter === "unrated") {
        query = query.is("admin_rating", null);
      } else {
        const minRating = parseInt(ratingFilter);
        query = query.gte("admin_rating", minRating);
      }
    }

    // Apply sorting
    query = query.order(sortField, { ascending: sortDirection === "asc", nullsFirst: false });

    // Pagination
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error loading models:", error);
      setLoading(false);
      return;
    }

    // Get follower counts for these models
    if (data && data.length > 0) {
      // Get actor IDs for these models
      const { data: actors } = await (supabase
        .from("actors") as any)
        .select("id, user_id")
        .in("user_id", data.map((m: any) => m.user_id || m.id));

      if (actors) {
        const actorIds = actors.map((a: any) => a.id as string);

        // Count followers for each actor
        const { data: followCounts } = await (supabase
          .from("follows") as any)
          .select("following_id")
          .in("following_id", actorIds);

        const followerMap = new Map<string, number>();
        followCounts?.forEach((f: any) => {
          const id = f.following_id as string;
          followerMap.set(id, (followerMap.get(id) || 0) + 1);
        });

        // Map actor followers back to models
        const actorToUser = new Map<string, string>(
          actors.map((a: any) => [a.user_id as string, a.id as string])
        );
        data.forEach((model: any) => {
          const actorId = actorToUser.get(model.user_id || model.id) || "";
          model.followers_count = actorId ? (followerMap.get(actorId) || 0) : 0;
        });
      }
    }

    setModels(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [supabase, search, stateFilter, approvalFilter, ratingFilter, sortField, sortDirection, page]);

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stateFilter, approvalFilter, ratingFilter, sortField, sortDirection, page]);

  const handleRatingChange = (modelId: string, rating: number | null) => {
    setModels(prev => prev.map(m =>
      m.id === modelId ? { ...m, admin_rating: rating } : m
    ));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="container px-8 md:px-16 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Models Directory</h1>
          <p className="text-muted-foreground">View and manage all {stats.totalModels.toLocaleString()} models</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
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
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Eye className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Profile Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCoins.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={(v) => { setApprovalFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ (5 stars)</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ (4+ stars)</SelectItem>
                <SelectItem value="3">⭐⭐⭐ (3+ stars)</SelectItem>
                <SelectItem value="rated">Rated Only</SelectItem>
                <SelectItem value="unrated">Unrated Only</SelectItem>
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
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No models found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Model</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("profile_views")}
                    >
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        Views
                        <SortIndicator active={sortField === "profile_views"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("coin_balance")}
                    >
                      <div className="flex items-center">
                        <Coins className="h-4 w-4 mr-1" />
                        Coins
                        <SortIndicator active={sortField === "coin_balance"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("followers_count")}
                    >
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        Followers
                        <SortIndicator active={sortField === "followers_count"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("admin_rating")}
                    >
                      <div className="flex items-center">
                        <Star className="h-4 w-4 mr-1" />
                        Rating
                        <SortIndicator active={sortField === "admin_rating"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="flex items-center">
                        Joined
                        <SortIndicator active={sortField === "created_at"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id}>
                      <TableCell>
                        <Link
                          href={`/${model.username}`}
                          target="_blank"
                          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                            {model.profile_photo_url ? (
                              <img
                                src={model.profile_photo_url}
                                alt={model.username}
                                className="w-full h-full object-cover"
                              />
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
                      </TableCell>
                      <TableCell>
                        {model.instagram_name ? (
                          <a
                            href={`https://instagram.com/${model.instagram_name.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-500 hover:text-pink-400 transition-colors text-sm"
                          >
                            {model.instagram_name.replace('@', '')}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {model.state || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${model.profile_views > 100 ? "text-purple-500" : ""}`}>
                          {(model.profile_views || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${model.coin_balance > 0 ? "text-yellow-500" : ""}`}>
                          {(model.coin_balance || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${(model.followers_count || 0) > 0 ? "text-pink-500" : ""}`}>
                          {(model.followers_count || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <RatingStars
                          modelId={model.id}
                          currentRating={model.admin_rating}
                          onRatingChange={handleRatingChange}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(model.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end">
                          <ModelActionsDropdown
                            id={model.id}
                            modelName={model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username}
                            isApproved={model.is_approved}
                            onAction={loadModels}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(1)}
            disabled={page === 1}
          >
            First
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button
            variant="outline"
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
          >
            Last
          </Button>
        </div>
      )}
    </div>
  );
}
