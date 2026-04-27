"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { escapeIlike } from "@/lib/utils";
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
  Calendar,
  AlertTriangle,
  MessageCircle,
  Sparkles,
  Clock,
  ShoppingBag,
} from "lucide-react";
import { FanActionsDropdown } from "@/components/admin/AdminActions";
import FanDetailSheet from "@/components/admin/community/FanDetailSheet";

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
  if (!active) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
  return direction === "asc"
    ? <ArrowUp className="h-4 w-4 ml-1 text-pink-500" />
    : <ArrowDown className="h-4 w-4 ml-1 text-pink-500" />;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.floor(diffMonths / 12)}y ago`;
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
  updated_at?: string;
  coins_spent?: number;
  tips_spent?: number;
  messages_spent?: number;
  content_spent?: number;
  live_wall_spent?: number;
  following_count?: number;
  report_count?: number;
  has_pending_model_app?: boolean;
}

type FanSortField = "coins_spent" | "following_count" | "coin_balance" | "created_at" | "report_count" | "total_coins_purchased" | "updated_at";
type SortDirection = "asc" | "desc";

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

const PAGE_SIZE = 50;

export default function FansTab() {
  const supabase = createClient();

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
  const [selectedFan, setSelectedFan] = useState<Fan | null>(null);

  const loadFans = useCallback(async () => {
    setFansLoading(true);

    let query = (supabase.from("fans") as any)
      .select(`id, user_id, display_name, username, email, avatar_url, coin_balance, total_coins_purchased, state, is_suspended, created_at, updated_at`, { count: "exact" });

    if (fansSearch) query = query.or(`display_name.ilike.%${escapeIlike(fansSearch)}%,email.ilike.%${escapeIlike(fansSearch)}%`);
    if (fansStateFilter !== "all") query = query.eq("state", fansStateFilter);
    if (fansStatusFilter !== "all") query = query.eq("is_suspended", fansStatusFilter === "suspended");

    if (fansSortField === "coin_balance" || fansSortField === "created_at" || fansSortField === "total_coins_purchased" || fansSortField === "updated_at") {
      query = query.order(fansSortField, { ascending: fansSortDirection === "asc", nullsFirst: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const from = (fansPage - 1) * PAGE_SIZE;
    query = query.range(from, from + PAGE_SIZE - 1);

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

      // Get coins spent, broken down by action type
      const { data: transactions } = await (supabase.from("coin_transactions") as any)
        .select("actor_id, amount, action").in("actor_id", actorIds).lt("amount", 0);

      const spentMap = new Map<string, number>();
      const tipsMap = new Map<string, number>();
      const messagesMap = new Map<string, number>();
      const contentMap = new Map<string, number>();
      const liveWallMap = new Map<string, number>();

      transactions?.forEach((tx: any) => {
        const abs = Math.abs(tx.amount);
        spentMap.set(tx.actor_id, (spentMap.get(tx.actor_id) || 0) + abs);
        if (tx.action === "tip_sent") {
          tipsMap.set(tx.actor_id, (tipsMap.get(tx.actor_id) || 0) + abs);
        } else if (tx.action === "message_sent") {
          messagesMap.set(tx.actor_id, (messagesMap.get(tx.actor_id) || 0) + abs);
        } else if (tx.action === "ppv_unlock" || tx.action === "content_unlock") {
          contentMap.set(tx.actor_id, (contentMap.get(tx.actor_id) || 0) + abs);
        } else if (tx.action === "live_wall_tip_sent") {
          liveWallMap.set(tx.actor_id, (liveWallMap.get(tx.actor_id) || 0) + abs);
        }
      });

      // Get following count
      const { data: follows } = await (supabase.from("follows") as any)
        .select("follower_id").in("follower_id", actorIds);

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

      // Check which fans have pending model applications
      const pendingModelAppSet = new Set<string>();
      if (userIds.length > 0) {
        const { data: pendingApps } = await (supabase.from("model_applications") as any)
          .select("user_id")
          .in("user_id", userIds)
          .eq("status", "pending");
        pendingApps?.forEach((app: any) => pendingModelAppSet.add(app.user_id));
      }

      data.forEach((fan: any) => {
        fan.coins_spent = fan.actor_id ? (spentMap.get(fan.actor_id) || 0) : 0;
        fan.tips_spent = fan.actor_id ? (tipsMap.get(fan.actor_id) || 0) : 0;
        fan.messages_spent = fan.actor_id ? (messagesMap.get(fan.actor_id) || 0) : 0;
        fan.content_spent = fan.actor_id ? (contentMap.get(fan.actor_id) || 0) : 0;
        fan.live_wall_spent = fan.actor_id ? (liveWallMap.get(fan.actor_id) || 0) : 0;
        fan.following_count = fan.actor_id ? (followMap.get(fan.actor_id) || 0) : 0;
        fan.report_count = fan.actor_id ? (reportMap.get(fan.actor_id) || 0) : 0;
        fan.has_pending_model_app = pendingModelAppSet.has(fan.user_id);
      });

      // Filter by reports
      let filteredData = data;
      if (fansReportsFilter === "has_reports") {
        filteredData = data.filter((f: any) => f.report_count > 0);
      }

      // Sort computed fields
      if (["coins_spent", "following_count", "report_count"].includes(fansSortField)) {
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
    void loadFans();
  }, [loadFans]);

  const handleFanSort = (field: FanSortField) => {
    if (fansSortField === field) setFansSortDirection(d => d === "asc" ? "desc" : "asc");
    else { setFansSortField(field); setFansSortDirection("desc"); }
    setFansPage(1);
  };

  const fansTotalPages = Math.ceil(fansTotalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
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
                  ? `Showing ${((fansPage - 1) * PAGE_SIZE) + 1} - ${Math.min(fansPage * PAGE_SIZE, fansTotalCount)} of ${fansTotalCount.toLocaleString()}`
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
                    <TableHead className="w-[220px]">Fan</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("created_at")}>
                      <div className="flex items-center"><Calendar className="h-4 w-4 mr-1" />Joined<SortIndicator active={fansSortField === "created_at"} direction={fansSortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("updated_at")}>
                      <div className="flex items-center"><Clock className="h-4 w-4 mr-1" />Last Active<SortIndicator active={fansSortField === "updated_at"} direction={fansSortDirection} /></div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("report_count")}>
                      <div className="flex items-center"><AlertTriangle className="h-4 w-4 mr-1" />Reports<SortIndicator active={fansSortField === "report_count"} direction={fansSortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleFanSort("total_coins_purchased")}>
                      <div className="flex items-center"><ShoppingBag className="h-4 w-4 mr-1" />Purchased<SortIndicator active={fansSortField === "total_coins_purchased"} direction={fansSortDirection} /></div>
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
                              <Image src={fan.avatar_url} alt={fan.display_name || "Fan"} width={80} height={80} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-sm font-bold">{fan.display_name?.charAt(0) || fan.email?.charAt(0)?.toUpperCase() || "F"}</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setSelectedFan(fan)}
                                className="font-medium truncate text-left hover:text-blue-400 transition-colors"
                              >
                                {fan.display_name || "Fan"}
                              </button>
                              {fan.has_pending_model_app && (
                                <span className="flex-shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-pink-500/15 text-pink-400 border border-pink-500/25">
                                  Model Applicant
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{fan.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{fan.state || "-"}</span></TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{new Date(fan.created_at).toLocaleDateString()}</span></TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {fan.updated_at ? formatRelativeTime(fan.updated_at) : "-"}
                        </span>
                      </TableCell>
                      <TableCell><FanActionsDropdown id={fan.id} fanName={fan.display_name || fan.email || "Fan"} fanUsername={fan.username} isSuspended={fan.is_suspended || false} onAction={loadFans} /></TableCell>
                      <TableCell>
                        {(fan.report_count || 0) > 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-500 font-medium"><AlertTriangle className="h-4 w-4" />{fan.report_count}</span>
                        ) : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${(fan.total_coins_purchased || 0) > 0 ? "text-violet-400" : "text-muted-foreground"}`}>
                          {(fan.total_coins_purchased || 0).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(fan.coins_spent || 0) > 0 ? (() => {
                          const categories = [
                            { val: fan.tips_spent || 0, label: "Tips", icon: <Heart className="h-2.5 w-2.5" />, color: "text-pink-400" },
                            { val: fan.live_wall_spent || 0, label: "Live Wall", icon: <Sparkles className="h-2.5 w-2.5" />, color: "text-violet-400" },
                            { val: fan.messages_spent || 0, label: "Messages", icon: <MessageCircle className="h-2.5 w-2.5" />, color: "text-blue-400" },
                            { val: fan.content_spent || 0, label: "Content/PPV", icon: <Coins className="h-2.5 w-2.5" />, color: "text-green-400" },
                          ].filter(c => c.val > 0);
                          const hasMultiple = categories.length > 1;
                          return (
                            <div
                              className="cursor-default space-y-0.5"
                              title={categories.map(c => `${c.label}: ${c.val.toLocaleString()} coins`).join("\n")}
                            >
                              <span className="font-medium text-yellow-500">{(fan.coins_spent || 0).toLocaleString()}</span>
                              {hasMultiple && (
                                <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs">
                                  {categories.map(c => (
                                    <span key={c.label} className={`flex items-center gap-0.5 ${c.color}`}>
                                      {c.icon}{c.val.toLocaleString()}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {!hasMultiple && categories.length === 1 && (
                                <div className={`flex items-center gap-0.5 text-xs ${categories[0].color}`}>
                                  {categories[0].icon}<span>{categories[0].label}</span>
                                </div>
                              )}
                            </div>
                          );
                        })() : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
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

      <FanDetailSheet
        fan={selectedFan}
        open={selectedFan !== null}
        onClose={() => setSelectedFan(null)}
      />
    </div>
  );
}
