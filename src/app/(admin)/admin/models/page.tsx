"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Star,
  Clock,
  UserCheck,
  UserPlus,
  Sparkles,
  Instagram,
  Image as ImageIcon,
  Video,
  Lock,
  Download,
  CheckSquare,
  Square,
  CheckCircle,
  KeyRound,
  Copy,
  Check,
  MessageSquare,
  Phone,
  Mail,
  Send,
  AlertTriangle,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { ModelActionsDropdown } from "@/components/admin/AdminActions";
import { SMSBroadcastModal } from "@/components/admin/SMSBroadcastModal";

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

  return (
    <div className="flex gap-0.5" onMouseLeave={() => setHoveredRating(null)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={updating}
          onClick={() => handleRate(star)}
          onMouseEnter={() => setHoveredRating(star)}
          className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
        >
          <Star
            className={`h-4 w-4 transition-colors ${
              star <= (hoveredRating || currentRating || 0)
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
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/new-face`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_face: !isNewFace }),
      });

      if (!res.ok) throw new Error("Failed to update");

      onToggle(modelId, !isNewFace);
      toast.success(!isNewFace ? "Marked as New Face" : "Removed New Face badge");
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
      className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
        isNewFace
          ? "bg-gradient-to-r from-pink-500 to-violet-500 text-white"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      }`}
    >
      {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : isNewFace ? "New Face" : "Set"}
    </button>
  );
}

function CopyInviteButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    const link = `${window.location.origin}/claim/${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={copyLink} className="p-1 hover:bg-muted rounded transition-colors" title="Copy invite link">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
    </button>
  );
}

function CreateLoginButton({ modelId, onSuccess }: { modelId: string; onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);

  const createLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/models/${modelId}/create-login`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create login");
      }
      toast.success("Login credentials created and sent!");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={createLogin}
      disabled={loading}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gradient-to-r from-pink-500 to-violet-500 text-white rounded hover:opacity-90 disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <KeyRound className="h-3 w-3" />}
      Create Login
    </button>
  );
}

interface Model {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
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
  user_id: string | null;
  invite_token: string | null;
  claimed_at: string | null;
  last_active_at: string | null;
  followers_count: number;
  total_earned: number;
  content_count: number;
  image_count: number;
  video_count: number;
  ppv_count: number;
  last_post: string | null;
  message_count: number;
  referral_count: number;
  last_seen: string | null;
  joined_at: string | null;
}

type ModelSortField = "profile_views" | "coin_balance" | "followers_count" | "instagram_followers" | "admin_rating" | "created_at" | "joined_at" | "total_earned" | "content_count" | "image_count" | "video_count" | "ppv_count" | "last_post" | "last_seen" | "message_count" | "referral_count";
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

export default function AdminModelsPage() {
  const pageSize = 50;

  // Models state
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [activeView, setActiveView] = useState<"active" | "onboarding">("active");
  const [sortField, setSortField] = useState<ModelSortField>("joined_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Bulk selection state
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);

  // Invite stats state
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

  // Derive claimFilter from active view
  const claimFilter = activeView === "active" ? "claimed" : "unclaimed";

  // Toggle single model selection
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => {
      const newSet = new Set(prev);
      if (newSet.has(modelId)) {
        newSet.delete(modelId);
      } else {
        newSet.add(modelId);
      }
      return newSet;
    });
  };

  // Toggle all models on current page
  const toggleAllModels = () => {
    if (selectedModels.size === models.length) {
      setSelectedModels(new Set());
    } else {
      setSelectedModels(new Set(models.map(m => m.id)));
    }
  };

  // Bulk approve selected models
  const bulkApproveModels = async () => {
    if (selectedModels.size === 0) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedModels).map(id =>
        fetch(`/api/admin/models/${id}/approve`, { method: "POST" })
      );
      await Promise.all(promises);
      toast.success(`Approved ${selectedModels.size} models`);
      setSelectedModels(new Set());
      loadModels();
    } catch {
      toast.error("Failed to approve some models");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk reject selected models
  const bulkRejectModels = async () => {
    if (selectedModels.size === 0) return;
    const confirmed = window.confirm(`Are you sure you want to reject ${selectedModels.size} models?`);
    if (!confirmed) return;
    setBulkActionLoading(true);
    try {
      const promises = Array.from(selectedModels).map(id =>
        fetch(`/api/admin/models/${id}/reject`, { method: "POST" })
      );
      await Promise.all(promises);
      toast.success(`Rejected ${selectedModels.size} models`);
      setSelectedModels(new Set());
      loadModels();
    } catch {
      toast.error("Failed to reject some models");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Copy phone numbers of selected models
  const copyPhoneNumbers = () => {
    const selectedModelsList = models.filter(m => selectedModels.has(m.id));
    const phoneNumbers = selectedModelsList
      .map(m => m.phone)
      .filter((phone): phone is string => !!phone);

    if (phoneNumbers.length === 0) {
      toast.error("No phone numbers found for selected models");
      return;
    }

    navigator.clipboard.writeText(phoneNumbers.join("\n"));
    toast.success(`Copied ${phoneNumbers.length} phone numbers to clipboard`);
  };

  // Get selected models with phone numbers for SMS
  const getSelectedModelsWithPhones = () => {
    return models
      .filter(m => selectedModels.has(m.id) && m.phone)
      .map(m => ({
        id: m.id,
        name: m.first_name ? `${m.first_name} ${m.last_name || ''}`.trim() : m.username,
        phone: m.phone!,
      }));
  };

  // Export models to CSV
  const exportModelsToCSV = () => {
    if (models.length === 0) {
      toast.error("No models to export");
      return;
    }

    const headers = [
      "Username", "First Name", "Last Name", "Email", "City", "State",
      "Approved", "Instagram", "IG Followers", "Rating", "Profile Views",
      "Followers", "Pics", "Videos", "PPV", "Earned", "Referrals", "Joined"
    ];

    const rows = models.map(m => [
      m.username,
      m.first_name || "",
      m.last_name || "",
      m.email || "",
      m.city || "",
      m.state || "",
      m.is_approved ? "Yes" : "No",
      m.instagram_name || "",
      m.instagram_followers || 0,
      m.admin_rating || "",
      m.profile_views || 0,
      m.followers_count || 0,
      m.image_count || 0,
      m.video_count || 0,
      m.ppv_count || 0,
      m.total_earned || 0,
      m.referral_count || 0,
      m.joined_at || m.created_at || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `models-export-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${models.length} models to CSV`);
  };

  // Load models
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: debouncedSearch,
        state: stateFilter,
        approval: approvalFilter,
        rating: ratingFilter,
        claim: claimFilter,
        sortField,
        sortDirection,
      });

      const res = await fetch(`/api/admin/models?${params}`);
      if (!res.ok) throw new Error("Failed to fetch models");

      const { models: data, total } = await res.json();
      setModels(data || []);
      setTotalCount(total || 0);
    } catch (err) {
      console.error("Error loading models:", err);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, stateFilter, approvalFilter, ratingFilter, activeView, sortField, sortDirection]);

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
      await loadModels();
    } catch (error) {
      console.error("Failed to send invites:", error);
      toast.error("Failed to send invites");
    } finally {
      setSendingInvites(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    loadInviteStats();
  }, [loadInviteStats]);

  // Debounced search - wait for user to stop typing before firing API call
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRatingChange = (modelId: string, rating: number | null) => {
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, admin_rating: rating } : m));
  };

  const handleNewFaceToggle = (modelId: string, newFace: boolean) => {
    setModels(prev => prev.map(m => m.id === modelId ? { ...m, new_face: newFace } : m));
  };

  const handleViewChange = (view: string) => {
    setActiveView(view as "active" | "onboarding");
    setPage(1);
    setSelectedModels(new Set());
  };

  const handleSort = (field: ModelSortField) => {
    setLoading(true);
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/community"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Models Database</h1>
            <p className="text-muted-foreground">
              {activeView === "active"
                ? `${totalCount.toLocaleString()} active models`
                : `${totalCount.toLocaleString()} models to onboard`}
            </p>
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={handleViewChange}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            <UserCheck className="h-4 w-4" />
            Active Models
          </TabsTrigger>
          <TabsTrigger value="onboarding" className="gap-2">
            <Mail className="h-4 w-4" />
            Onboarding
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Invite Stats - Onboarding only */}
      {activeView === "onboarding" && (
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
                      <p className="text-xs text-muted-foreground">Not Contacted</p>
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
                      <p className="text-xs text-muted-foreground">Joined</p>
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, username, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={stateFilter} onValueChange={(v) => { setStateFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by state" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {US_STATES.map(s => (
                  <SelectItem key={s.abbr} value={s.abbr}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={(v) => { setApprovalFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by approval" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={(v) => { setRatingFilter(v); setPage(1); }}>
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
          </div>
        </CardContent>
      </Card>

      {/* Models Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>{activeView === "active" ? "Active Models" : "Onboarding Pipeline"}</CardTitle>
              <CardDescription>
                {totalCount > 0
                  ? `Showing ${((page - 1) * pageSize) + 1} - ${Math.min(page * pageSize, totalCount)} of ${totalCount.toLocaleString()}`
                  : "No models found"}
                {selectedModels.size > 0 && (
                  <span className="ml-2 text-pink-500 font-medium">
                    ({selectedModels.size} selected)
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Bulk Actions */}
              {selectedModels.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkApproveModels}
                    disabled={bulkActionLoading}
                    className="text-green-500 border-green-500/50 hover:bg-green-500/10"
                  >
                    {bulkActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Approve ({selectedModels.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={bulkRejectModels}
                    disabled={bulkActionLoading}
                    className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                  >
                    Reject ({selectedModels.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPhoneNumbers}
                    className="text-blue-500 border-blue-500/50 hover:bg-blue-500/10"
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Copy Phones
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSMSModal(true)}
                    className="text-purple-500 border-purple-500/50 hover:bg-purple-500/10"
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Send SMS
                  </Button>
                </>
              )}
              {/* Export Button */}
              <Button variant="outline" size="sm" onClick={exportModelsToCSV} title="Export to CSV">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              {/* Pagination */}
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages || 1}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : models.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Users className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No models found</p></div>
          ) : (
            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <button onClick={toggleAllModels} className="p-1 hover:bg-muted rounded transition-colors" title={selectedModels.size === models.length ? "Deselect all" : "Select all"}>
                        {selectedModels.size === models.length && models.length > 0 ? <CheckSquare className="h-4 w-4 text-pink-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </TableHead>
                    <TableHead className="w-[100px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("admin_rating")}>
                      <div className="flex items-center"><Star className="h-4 w-4 mr-1" />Rating<SortIndicator active={sortField === "admin_rating"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="w-[180px]">Model</TableHead>
                    <TableHead className="w-[90px] cursor-pointer hover:bg-muted/50" onClick={() => handleSort("instagram_followers")}>
                      <div className="flex items-center"><Instagram className="h-4 w-4 mr-1" />IG<SortIndicator active={sortField === "instagram_followers"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="w-[80px]">State</TableHead>
                    <TableHead>Actions</TableHead>
                    <TableHead>Invite</TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("joined_at")}>
                      <div className="flex items-center"><UserPlus className="h-4 w-4 mr-1" />Joined<SortIndicator active={sortField === "joined_at"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead><div className="flex items-center"><Sparkles className="h-4 w-4 mr-1" />New Face</div></TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("image_count")}>
                      <div className="flex items-center"><ImageIcon className="h-4 w-4 mr-1" />Pics<SortIndicator active={sortField === "image_count"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("video_count")}>
                      <div className="flex items-center"><Video className="h-4 w-4 mr-1" />Vids<SortIndicator active={sortField === "video_count"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("ppv_count")}>
                      <div className="flex items-center"><Lock className="h-4 w-4 mr-1" />PPV<SortIndicator active={sortField === "ppv_count"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("profile_views")}>
                      <div className="flex items-center"><Eye className="h-4 w-4 mr-1" />Views<SortIndicator active={sortField === "profile_views"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("followers_count")}>
                      <div className="flex items-center"><Heart className="h-4 w-4 mr-1" />Favorites<SortIndicator active={sortField === "followers_count"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("total_earned")}>
                      <div className="flex items-center"><Coins className="h-4 w-4 mr-1" />Earned<SortIndicator active={sortField === "total_earned"} direction={sortDirection} /></div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort("referral_count")}>
                      <div className="flex items-center"><Users className="h-4 w-4 mr-1" />Referrals<SortIndicator active={sortField === "referral_count"} direction={sortDirection} /></div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => (
                    <TableRow key={model.id} className={selectedModels.has(model.id) ? "bg-pink-500/5" : ""}>
                      <TableCell>
                        <button onClick={() => toggleModelSelection(model.id)} className="p-1 hover:bg-muted rounded transition-colors">
                          {selectedModels.has(model.id) ? <CheckSquare className="h-4 w-4 text-pink-500" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>
                      </TableCell>
                      <TableCell><RatingStars modelId={model.id} currentRating={model.admin_rating} onRatingChange={handleRatingChange} /></TableCell>
                      <TableCell>
                        <Link href={`/admin/models/${model.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                            {model.profile_photo_url ? (
                              <Image src={model.profile_photo_url} alt={model.username} width={80} height={80} className="w-full h-full object-cover" />
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
                        {model.instagram_name ? (
                          <div className="flex flex-col">
                            <a href={`https://instagram.com/${model.instagram_name.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:text-pink-400 transition-colors text-sm">{model.instagram_name.replace('@', '')}</a>
                            {model.instagram_followers ? <span className="text-xs text-muted-foreground">{(model.instagram_followers / 1000).toFixed(1)}K</span> : null}
                          </div>
                        ) : <span className="text-muted-foreground text-sm">-</span>}
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{model.state || "-"}</span></TableCell>
                      <TableCell><ModelActionsDropdown id={model.id} modelName={model.first_name ? `${model.first_name} ${model.last_name || ''}`.trim() : model.username} isApproved={model.is_approved} onAction={loadModels} /></TableCell>
                      <TableCell>
                        {model.user_id ? (
                          <span className="inline-flex items-center gap-1 text-green-500 text-sm"><UserCheck className="h-4 w-4" />Active</span>
                        ) : model.invite_token ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-amber-500 text-sm"><Clock className="h-4 w-4" />Pending</span>
                            <CopyInviteButton token={model.invite_token} />
                            {model.email && <CreateLoginButton modelId={model.id} onSuccess={loadModels} />}
                          </div>
                        ) : model.email ? (
                          <CreateLoginButton modelId={model.id} onSuccess={loadModels} />
                        ) : (
                          <span className="text-muted-foreground text-sm">No email</span>
                        )}
                      </TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{model.joined_at ? new Date(model.joined_at).toLocaleDateString() : "-"}</span></TableCell>
                      <TableCell><NewFaceToggle modelId={model.id} isNewFace={model.new_face} onToggle={handleNewFaceToggle} /></TableCell>
                      <TableCell><span className={`text-sm ${model.image_count > 0 ? "text-green-500" : "text-muted-foreground"}`}>{model.image_count}</span></TableCell>
                      <TableCell><span className={`text-sm ${model.video_count > 0 ? "text-green-500" : "text-muted-foreground"}`}>{model.video_count}</span></TableCell>
                      <TableCell><span className={`text-sm ${model.ppv_count > 0 ? "text-purple-500" : "text-muted-foreground"}`}>{model.ppv_count}</span></TableCell>
                      <TableCell><span className="text-sm text-muted-foreground">{model.profile_views?.toLocaleString() || 0}</span></TableCell>
                      <TableCell><span className={`text-sm ${model.followers_count > 0 ? "text-pink-500" : "text-muted-foreground"}`}>{model.followers_count}</span></TableCell>
                      <TableCell><span className={`text-sm ${model.total_earned > 0 ? "text-yellow-500" : "text-muted-foreground"}`}>{model.total_earned}</span></TableCell>
                      <TableCell><span className={`text-sm ${model.referral_count > 0 ? "text-blue-500" : "text-muted-foreground"}`}>{model.referral_count}</span></TableCell>
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
          <Button variant="outline" onClick={() => setPage(1)} disabled={page === 1}>First</Button>
          <Button variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />Previous
          </Button>
          <span className="px-4 text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
          <Button variant="outline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last</Button>
        </div>
      )}

      {/* SMS Broadcast Modal */}
      <SMSBroadcastModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        recipients={getSelectedModelsWithPhones()}
      />
    </div>
  );
}
