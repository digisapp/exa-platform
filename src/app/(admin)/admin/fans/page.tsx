"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { escapeIlike } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
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
  Coins,
  Heart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { FanActionsDropdown } from "@/components/admin/AdminActions";

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return direction === "asc"
    ? <ArrowUp className="h-4 w-4 ml-1" />
    : <ArrowDown className="h-4 w-4 ml-1" />;
}

interface Fan {
  id: string;
  user_id: string;
  actor_id?: string;
  display_name: string | null;
  username: string | null;
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

type SortField = "coins_spent" | "following_count" | "coin_balance" | "created_at" | "report_count";
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

export default function AdminFansPage() {
  const [fans, setFans] = useState<Fan[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reportsFilter, setReportsFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const pageSize = 50;
  const supabase = createClient();

  // Stats
  const [stats, setStats] = useState({
    totalFans: 0,
    totalCoinsSpent: 0,
    avgCoinsSpent: 0,
    activeFans: 0,
  });

  const loadStats = useCallback(async () => {
    const { count: total } = await (supabase
      .from("fans") as any)
      .select("*", { count: "exact", head: true });

    const { count: active } = await (supabase
      .from("fans") as any)
      .select("*", { count: "exact", head: true })
      .eq("is_suspended", false);

    // Get total coins spent (negative transactions = spending)
    const { data: spentData } = await (supabase
      .from("coin_transactions") as any)
      .select("amount")
      .lt("amount", 0);

    const totalSpent = Math.abs(spentData?.reduce((sum: number, tx: any) => sum + tx.amount, 0) || 0);

    setStats({
      totalFans: total || 0,
      totalCoinsSpent: totalSpent,
      avgCoinsSpent: total ? Math.round(totalSpent / total) : 0,
      activeFans: active || 0,
    });
  }, [supabase]);

  const loadFans = useCallback(async () => {
    setLoading(true);

    let query = (supabase.from("fans") as any)
      .select(`
        id,
        user_id,
        display_name,
        username,
        email,
        avatar_url,
        coin_balance,
        total_coins_purchased,
        state,
        is_suspended,
        created_at
      `, { count: "exact" });

    // Apply filters
    if (search) {
      query = query.or(`display_name.ilike.%${escapeIlike(search)}%,email.ilike.%${escapeIlike(search)}%`);
    }

    if (stateFilter !== "all") {
      query = query.eq("state", stateFilter);
    }

    if (statusFilter !== "all") {
      query = query.eq("is_suspended", statusFilter === "suspended");
    }

    // Apply sorting (for basic fields)
    if (sortField === "coin_balance" || sortField === "created_at") {
      query = query.order(sortField, { ascending: sortDirection === "asc", nullsFirst: false });
    } else {
      // Default sort for computed fields - we'll sort client-side
      query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const from = (page - 1) * pageSize;
    query = query.range(from, from + pageSize - 1);

    const { data, count, error } = await query;

    if (error) {
      console.error("Error loading fans:", error);
      setLoading(false);
      return;
    }

    // Get additional data for each fan
    if (data && data.length > 0) {
      const fanIds = data.map((f: any) => f.id);
      const userIds = data.map((f: any) => f.user_id).filter(Boolean);

      // Get actor IDs for these fans (to look up reports)
      const { data: actors } = await (supabase
        .from("actors") as any)
        .select("id, user_id")
        .in("user_id", userIds)
        .eq("type", "fan");

      const userToActorMap = new Map<string, string>();
      actors?.forEach((a: any) => {
        userToActorMap.set(a.user_id, a.id);
      });

      // Attach actor_id to fan data
      data.forEach((fan: any) => {
        fan.actor_id = userToActorMap.get(fan.user_id);
      });

      const actorIds = actors?.map((a: any) => a.id) || [];

      // Get coins spent for each fan (sum of negative transactions)
      const { data: transactions } = await (supabase
        .from("coin_transactions") as any)
        .select("actor_id, amount")
        .in("actor_id", fanIds)
        .lt("amount", 0);

      const spentMap = new Map<string, number>();
      transactions?.forEach((tx: any) => {
        const current = spentMap.get(tx.actor_id) || 0;
        spentMap.set(tx.actor_id, current + Math.abs(tx.amount));
      });

      // Get following count for each fan
      const { data: follows } = await (supabase
        .from("follows") as any)
        .select("follower_id")
        .in("follower_id", fanIds);

      const followMap = new Map<string, number>();
      follows?.forEach((f: any) => {
        const current = followMap.get(f.follower_id) || 0;
        followMap.set(f.follower_id, current + 1);
      });

      // Get report counts for each fan actor
      const reportMap = new Map<string, number>();
      if (actorIds.length > 0) {
        const { data: reports } = await (supabase
          .from("reports") as any)
          .select("reported_user_id")
          .in("reported_user_id", actorIds);

        reports?.forEach((r: any) => {
          const current = reportMap.get(r.reported_user_id) || 0;
          reportMap.set(r.reported_user_id, current + 1);
        });
      }

      // Attach to fan data
      data.forEach((fan: any) => {
        fan.coins_spent = spentMap.get(fan.id) || 0;
        fan.following_count = followMap.get(fan.id) || 0;
        fan.report_count = fan.actor_id ? (reportMap.get(fan.actor_id) || 0) : 0;
      });

      // Filter by reports if needed
      let filteredData = data;
      if (reportsFilter === "has_reports") {
        filteredData = data.filter((f: any) => f.report_count > 0);
      }

      // Sort by computed fields if needed
      if (sortField === "coins_spent" || sortField === "following_count" || sortField === "report_count") {
        filteredData.sort((a: any, b: any) => {
          const aVal = a[sortField] || 0;
          const bVal = b[sortField] || 0;
          return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
      }

      setFans(filteredData);
      setTotalCount(count || 0);
      setLoading(false);
      return;
    }

    setFans(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [supabase, search, stateFilter, statusFilter, reportsFilter, sortField, sortDirection, page]);

  useEffect(() => {
    void loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadFans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, stateFilter, statusFilter, sortField, sortDirection, page]);

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
          <h1 className="text-3xl font-bold">Fans Directory</h1>
          <p className="text-muted-foreground">View and manage all {stats.totalFans.toLocaleString()} fans</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
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
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.activeFans.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalCoinsSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Coins Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Coins className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.avgCoinsSpent.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg Coins/Fan</p>
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
                  placeholder="Search by name or email..."
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={reportsFilter} onValueChange={(v) => { setReportsFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by reports" />
              </SelectTrigger>
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
          ) : fans.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No fans found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Fan</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("created_at")}
                    >
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        Joined
                        <SortIndicator active={sortField === "created_at"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("report_count")}
                    >
                      <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        Reports
                        <SortIndicator active={sortField === "report_count"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("coins_spent")}
                    >
                      <div className="flex items-center">
                        <Coins className="h-4 w-4 mr-1" />
                        Spent
                        <SortIndicator active={sortField === "coins_spent"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("following_count")}
                    >
                      <div className="flex items-center">
                        <Heart className="h-4 w-4 mr-1" />
                        Favorites
                        <SortIndicator active={sortField === "following_count"} direction={sortDirection} />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort("coin_balance")}
                    >
                      <div className="flex items-center">
                        <Coins className="h-4 w-4 mr-1" />
                        Balance
                        <SortIndicator active={sortField === "coin_balance"} direction={sortDirection} />
                      </div>
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
                              <Image
                                src={fan.avatar_url}
                                alt={fan.display_name || "Fan"}
                                width={80}
                                height={80}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold">
                                {fan.display_name?.charAt(0) || fan.email?.charAt(0)?.toUpperCase() || "F"}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {fan.display_name || "Fan"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">{fan.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {fan.state || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(fan.created_at).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <FanActionsDropdown
                          id={fan.id}
                          fanName={fan.display_name || fan.email || "Fan"}
                          fanUsername={fan.username}
                          isSuspended={fan.is_suspended || false}
                          onAction={loadFans}
                        />
                      </TableCell>
                      <TableCell>
                        {(fan.report_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                            <AlertTriangle className="h-4 w-4" />
                            {fan.report_count}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${(fan.coins_spent || 0) > 0 ? "text-yellow-500" : ""}`}>
                          {(fan.coins_spent || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${(fan.following_count || 0) > 0 ? "text-pink-500" : ""}`}>
                          {(fan.following_count || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${fan.coin_balance > 0 ? "text-green-500" : ""}`}>
                          {(fan.coin_balance || 0).toLocaleString()}
                        </span>
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
