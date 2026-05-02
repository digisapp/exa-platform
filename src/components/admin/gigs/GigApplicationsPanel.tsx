"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Eye,
  CheckCircle,
  XCircle,
  X,
  Send,
  Award,
  RefreshCw,
  AlertTriangle,
  Search,
  Mail,
  Zap,
  LayoutGrid,
} from "lucide-react";
import SpeedReviewModal from "./SpeedReviewModal";
import GigApplicationsFullscreen from "./GigApplicationsFullscreen";

function parseHeightToInches(height: string | null | undefined): number | null {
  if (!height) return null;
  const match = height.match(/(\d+)['''`]?\s*(\d+)/);
  if (match) return parseInt(match[1]) * 12 + parseInt(match[2]);
  const inches = parseInt(height);
  if (!isNaN(inches) && inches > 24 && inches < 120) return inches;
  return null;
}

const IG_PRESETS = [
  { label: "All", value: 0 },
  { label: "10K+", value: 10_000 },
  { label: "50K+", value: 50_000 },
  { label: "100K+", value: 100_000 },
  { label: "500K+", value: 500_000 },
  { label: "1M+", value: 1_000_000 },
];

const HEIGHT_OPTIONS = [
  "5'0\"", "5'1\"", "5'2\"", "5'3\"", "5'4\"", "5'5\"",
  "5'6\"", "5'7\"", "5'8\"", "5'9\"", "5'10\"", "5'11\"",
  "6'0\"", "6'1\"", "6'2\"",
];

interface Application {
  id: string;
  gig_id: string;
  model_id: string;
  status: string;
  applied_at: string;
  trip_number?: number;
  spot_type?: string;
  payment_status?: string;
  instagram_handle?: string;
  instagram_followers?: number;
  digis_username?: string;
  model: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    profile_photo_url: string;
    height?: string | null;
    bust?: string | null;
    waist?: string | null;
    hips?: string | null;
    shoe_size?: string | null;
    dress_size?: string | null;
    eye_color?: string | null;
    hair_color?: string | null;
    tiktok_followers?: number | null;
    tiktok_username?: string | null;
    youtube_subscribers?: number | null;
    youtube_username?: string | null;
    x_followers?: number | null;
    x_username?: string | null;
    snapchat_followers?: number | null;
    snapchat_username?: string | null;
  };
}

interface Gig {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  cover_image_url: string | null;
  gallery_images: string[] | null;
  location_city: string;
  location_state: string;
  start_at: string;
  end_at: string;
  compensation_type: string;
  compensation_amount: number;
  spots: number;
  spots_filled: number;
  status: string;
  created_at: string;
  event_id: string | null;
}

interface GigApplicationsPanelProps {
  applications: Application[];
  selectedGig: Gig | null;
  selectedGigId: string | null;
  modelBadges: Set<string>;
  syncingBadges: boolean;
  processingApp: string | null;
  onApplicationAction: (appId: string, action: "accepted" | "rejected" | "cancelled" | "pending") => void;
  onSyncBadges: () => void;
  onSendMassEmail: (filter: "all" | "pending" | "approved") => Promise<void>;
}

export default function GigApplicationsPanel({
  applications,
  selectedGig,
  selectedGigId,
  modelBadges,
  syncingBadges,
  processingApp,
  onApplicationAction,
  onSyncBadges,
}: GigApplicationsPanelProps) {
  const [applicationFilter, setApplicationFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [tripFilter, setTripFilter] = useState<"all" | "1" | "2">("all");
  const [spotTypeFilter, setSpotTypeFilter] = useState<"all" | "paid" | "sponsored">("all");
  const [modelSearch, setModelSearch] = useState("");
  const [igMinFollowers, setIgMinFollowers] = useState(0);
  const [minHeightFilter, setMinHeightFilter] = useState("");
  const [showSpeedReview, setShowSpeedReview] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);

  // Mass email state
  const [showMassEmailDialog, setShowMassEmailDialog] = useState(false);
  const [massEmailFilter, setMassEmailFilter] = useState<"all" | "pending" | "approved">("pending");
  const [massEmailSending, setMassEmailSending] = useState(false);
  const [massEmailProgress, setMassEmailProgress] = useState({ sent: 0, skipped: 0, failed: 0, total: 0 });

  const handleSendMassEmail = async () => {
    if (!selectedGigId) return;
    setMassEmailSending(true);
    setMassEmailProgress({ sent: 0, skipped: 0, failed: 0, total: 0 });

    try {
      // Step 1: Fetch all recipients
      const listRes = await fetch(
        `/api/admin/gigs/mass-email?gigId=${selectedGigId}&recipientFilter=${massEmailFilter}`
      );
      const listData = await listRes.json();

      if (!listRes.ok) {
        toast.error(listData.error || "Failed to fetch recipients");
        setMassEmailSending(false);
        return;
      }

      const { recipients, gig } = listData;
      if (!recipients || recipients.length === 0) {
        toast.info("No recipients with email addresses found");
        setMassEmailSending(false);
        return;
      }

      setMassEmailProgress({ sent: 0, skipped: 0, failed: 0, total: recipients.length });

      // Step 2: Send in batches of 10
      const BATCH_SIZE = 10;
      let totalSent = 0;
      let totalSkipped = 0;
      let totalFailed = 0;
      const allFailedDetails: { email: string; reason: string }[] = [];

      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const batch = recipients.slice(i, i + BATCH_SIZE);

        const batchRes = await fetch("/api/admin/gigs/mass-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipients: batch,
            gig,
            template: "schedule-call",
          }),
        });

        const batchData = await batchRes.json();

        if (batchRes.ok) {
          totalSent += batchData.emailsSent || 0;
          totalSkipped += batchData.emailsSkipped || 0;
          totalFailed += batchData.emailsFailed || 0;
          if (batchData.failedDetails) {
            allFailedDetails.push(...batchData.failedDetails);
          }
        } else {
          totalFailed += batch.length;
        }

        setMassEmailProgress({
          sent: totalSent,
          skipped: totalSkipped,
          failed: totalFailed,
          total: recipients.length,
        });
      }

      const parts = [];
      if (totalSent > 0) parts.push(`${totalSent} sent`);
      if (totalSkipped > 0) parts.push(`${totalSkipped} skipped`);
      if (totalFailed > 0) parts.push(`${totalFailed} failed`);

      toast.success(`Mass email complete: ${parts.join(", ")}`);

      if (allFailedDetails.length > 0) {
        const reasons = [...new Set(allFailedDetails.map((d: any) => d.reason))];
        console.log("Failed emails:", allFailedDetails);
        toast.error(`Failed reasons: ${reasons.slice(0, 3).join("; ")}`, { duration: 10000 });
      }
      setShowMassEmailDialog(false);
    } catch (error) {
      console.error("Mass email error:", error);
      toast.error("Failed to send mass email");
    } finally {
      setMassEmailSending(false);
    }
  };

  const filterApplications = (app: Application) => {
    // Status filter
    if (applicationFilter === "pending" && app.status !== "pending") return false;
    if (applicationFilter === "approved" && app.status !== "accepted" && app.status !== "approved") return false;
    if (applicationFilter === "declined" && app.status !== "rejected" && app.status !== "cancelled") return false;
    // Trip filter
    if (tripFilter !== "all" && app.trip_number !== parseInt(tripFilter)) return false;
    // Spot type filter
    if (spotTypeFilter !== "all" && app.spot_type !== spotTypeFilter) return false;
    // Search filter
    if (modelSearch) {
      const search = modelSearch.toLowerCase();
      const firstName = app.model?.first_name?.toLowerCase() || "";
      const lastName = app.model?.last_name?.toLowerCase() || "";
      const username = app.model?.username?.toLowerCase() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      if (!firstName.includes(search) && !lastName.includes(search) && !username.includes(search) && !fullName.includes(search)) {
        return false;
      }
    }
    // Instagram followers filter
    if (igMinFollowers > 0 && (app.instagram_followers ?? 0) < igMinFollowers) return false;
    // Height filter
    if (minHeightFilter) {
      const modelIn = parseHeightToInches(app.model?.height);
      const threshIn = parseHeightToInches(minHeightFilter);
      if (modelIn === null || threshIn === null || modelIn < threshIn) return false;
    }
    return true;
  };

  const filteredApplications = applications.filter(filterApplications);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
              <span className="truncate">Applications {selectedGigId && `(${applications.length})`}</span>
            </span>
            <div className="flex items-center gap-1">
              {/* Grid View Button */}
              {selectedGigId && applications.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowFullscreen(true)}
                  className="text-xs border-violet-500/40 text-violet-400 hover:bg-violet-500/10 hover:text-violet-300"
                  title="Full-screen grid view"
                >
                  <LayoutGrid className="h-3 w-3 mr-1" />
                  Grid
                </Button>
              )}
              {/* Speed Review Button */}
              {selectedGigId && applications.filter(a => a.status === "pending").length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSpeedReview(true)}
                  className="text-xs border-pink-500/40 text-pink-400 hover:bg-pink-500/10 hover:text-pink-300"
                  title="Speed review pending applications"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Speed Review ({applications.filter(a => a.status === "pending").length})
                </Button>
              )}
              {/* Mass Email Button */}
              {selectedGigId && applications.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMassEmailDialog(true)}
                  className="text-xs"
                  title="Send mass email to applicants"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              )}
              {/* Badge Sync Button - only show for event-linked gigs */}
              {selectedGigId && selectedGig?.event_id && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSyncBadges}
                  disabled={syncingBadges}
                  className="text-xs"
                >
                  {syncingBadges ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3 w-3 mr-1" />
                  )}
                  Sync Badges
                </Button>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {selectedGigId
              ? `Showing applications for: ${selectedGig?.title}`
              : "Select a gig to view applications"}
          </CardDescription>
          {/* Badge Warning - show if approved models are missing badges */}
          {selectedGigId && selectedGig?.event_id && (() => {
            const approvedWithoutBadge = applications.filter(
              a => (a.status === "accepted" || a.status === "approved") && !modelBadges.has(a.model_id)
            );
            if (approvedWithoutBadge.length > 0) {
              return (
                <div className="flex items-center gap-2 mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-600 text-sm">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{approvedWithoutBadge.length} approved model(s) missing event badge</span>
                </div>
              );
            }
            return null;
          })()}
          {/* Filter Tabs */}
          {selectedGigId && applications.length > 0 && (
            <div className="flex gap-1 mt-3 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setApplicationFilter("all")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  applicationFilter === "all"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50 text-muted-foreground"
                }`}
              >
                All ({applications.length})
              </button>
              <button
                onClick={() => setApplicationFilter("pending")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  applicationFilter === "pending"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50 text-muted-foreground"
                }`}
              >
                Pending ({applications.filter(a => a.status === "pending").length})
              </button>
              <button
                onClick={() => setApplicationFilter("approved")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  applicationFilter === "approved"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50 text-muted-foreground"
                }`}
              >
                Approved ({applications.filter(a => a.status === "accepted" || a.status === "approved").length})
              </button>
              <button
                onClick={() => setApplicationFilter("declined")}
                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  applicationFilter === "declined"
                    ? "bg-background shadow-sm"
                    : "hover:bg-background/50 text-muted-foreground"
                }`}
              >
                Declined ({applications.filter(a => a.status === "rejected" || a.status === "cancelled").length})
              </button>
            </div>
          )}
          {/* Trip-specific filters - only show for travel gigs with trip data */}
          {selectedGigId && applications.some(a => a.trip_number) && (
            <div className="flex gap-4 mt-2">
              {/* Trip Number Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Trip:</span>
                <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                  <button
                    onClick={() => setTripFilter("all")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      tripFilter === "all"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setTripFilter("1")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      tripFilter === "1"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    Trip 1
                  </button>
                  <button
                    onClick={() => setTripFilter("2")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      tripFilter === "2"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    Trip 2
                  </button>
                </div>
              </div>
              {/* Spot Type Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Type:</span>
                <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                  <button
                    onClick={() => setSpotTypeFilter("all")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      spotTypeFilter === "all"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSpotTypeFilter("paid")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      spotTypeFilter === "paid"
                        ? "bg-green-500/20 text-green-500 shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    onClick={() => setSpotTypeFilter("sponsored")}
                    className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                      spotTypeFilter === "sponsored"
                        ? "bg-violet-500/20 text-violet-500 shadow-sm"
                        : "hover:bg-background/50 text-muted-foreground"
                    }`}
                  >
                    Sponsored
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Search Box */}
          {selectedGigId && applications.length > 0 && (
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or username..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          )}
          {/* IG Followers & Height Filters */}
          {selectedGigId && applications.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-2">
              {/* Instagram Followers */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">IG:</span>
                <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                  {IG_PRESETS.map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => setIgMinFollowers(value)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        igMinFollowers === value
                          ? "bg-background shadow-sm"
                          : "hover:bg-background/50 text-muted-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Min Height */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Height:</span>
                <Select value={minHeightFilter} onValueChange={setMinHeightFilter}>
                  <SelectTrigger className="h-7 text-xs w-[90px]">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {HEIGHT_OPTIONS.map((h) => (
                      <SelectItem key={h} value={h}>{h}+</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
          {!selectedGigId ? (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a gig to view applications</p>
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications yet</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No matching applications</p>
            </div>
          ) : (
            filteredApplications.map((app) => (
              <div
                key={app.id}
                className="p-4 rounded-lg border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                    {app.model?.profile_photo_url ? (
                      <Image
                        src={app.model.profile_photo_url}
                        alt={app.model.username}
                        width={48}
                        height={48}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl">
                        {app.model?.first_name?.charAt(0) || app.model?.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/${app.model?.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-pink-500"
                    >
                      {app.model?.first_name || app.model?.last_name
                        ? `${app.model?.first_name || ''} ${app.model?.last_name || ''}`.trim()
                        : `@${app.model?.username}`}
                    </Link>
                    {(app.model?.first_name || app.model?.last_name) && (
                      <p className="text-sm text-muted-foreground">
                        @{app.model?.username}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                    {/* Badge status for event-linked gigs */}
                    {selectedGig?.event_id && (
                      <div className="flex items-center gap-1 mt-1">
                        {modelBadges.has(app.model_id) ? (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                            <Award className="h-3 w-3 mr-1" />
                            Badge
                          </Badge>
                        ) : (app.status === "accepted" || app.status === "approved") ? (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-500 border-red-500/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            No Badge
                          </Badge>
                        ) : null}
                      </div>
                    )}
                    {/* Trip-specific info */}
                    {app.trip_number && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Trip {app.trip_number}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            app.spot_type === "paid"
                              ? "bg-green-500/10 text-green-500 border-green-500/30"
                              : "bg-violet-500/10 text-violet-500 border-violet-500/30"
                          }`}
                        >
                          {app.spot_type === "paid" ? "$1,400 Spot" : "Sponsored"}
                        </Badge>
                        {app.payment_status === "paid" && (
                          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                            Paid ✓
                          </Badge>
                        )}
                        {app.payment_status === "interested" && (
                          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                            Interested
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Show interested badge even without trip_number */}
                    {!app.trip_number && app.payment_status === "interested" && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
                          Interested
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-3 mt-1">
                      {app.instagram_handle && (
                        <p className="text-xs text-muted-foreground">
                          IG: @{app.instagram_handle}{app.instagram_followers ? ` (${app.instagram_followers >= 1_000_000 ? `${(app.instagram_followers / 1_000_000).toFixed(1)}M` : app.instagram_followers >= 1_000 ? `${Math.round(app.instagram_followers / 1_000)}K` : app.instagram_followers})` : ""}
                        </p>
                      )}
                      {app.model?.height && (
                        <p className="text-xs text-muted-foreground">
                          {app.model.height}
                        </p>
                      )}
                      {app.digis_username && (
                        <p className="text-xs text-muted-foreground">
                          Digis: {app.digis_username}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.status === "pending" ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onApplicationAction(app.id, "rejected")}
                        disabled={processingApp === app.id}
                      >
                        {processingApp === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => onApplicationAction(app.id, "accepted")}
                        disabled={processingApp === app.id}
                      >
                        {processingApp === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Accept
                          </>
                        )}
                      </Button>
                    </>
                  ) : app.status === "accepted" || app.status === "approved" ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Accepted
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-7 px-2"
                        onClick={() => onApplicationAction(app.id, "cancelled")}
                        disabled={processingApp === app.id}
                      >
                        {processingApp === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={app.status === "cancelled" ? "bg-red-500/10 text-red-500" : ""}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        {app.status === "cancelled" ? "Cancelled" : app.status}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10 h-7 px-2"
                        onClick={() => onApplicationAction(app.id, "pending")}
                        disabled={processingApp === app.id}
                        title="Send back to Pending"
                      >
                        {processingApp === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Fullscreen Grid Modal */}
      <GigApplicationsFullscreen
        open={showFullscreen}
        onClose={() => setShowFullscreen(false)}
        applications={applications}
        selectedGig={selectedGig}
        processingApp={processingApp}
        onApplicationAction={onApplicationAction}
      />

      {/* Speed Review Modal */}
      <SpeedReviewModal
        open={showSpeedReview}
        onClose={() => setShowSpeedReview(false)}
        applications={applications}
        processingApp={processingApp}
        onApplicationAction={onApplicationAction}
      />

      {/* Mass Email Dialog */}
      <Dialog open={showMassEmailDialog} onOpenChange={setShowMassEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Mass Email
            </DialogTitle>
            <DialogDescription>
              Email applicants for: {selectedGig?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipient Filter */}
            <div className="space-y-2">
              <Label>Recipients</Label>
              <Select
                value={massEmailFilter}
                onValueChange={(v) => setMassEmailFilter(v as "all" | "pending" | "approved")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Applicants ({applications.length})
                  </SelectItem>
                  <SelectItem value="pending">
                    Pending ({applications.filter(a => a.status === "pending").length})
                  </SelectItem>
                  <SelectItem value="approved">
                    Approved ({applications.filter(a => a.status === "accepted" || a.status === "approved").length})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <Label>Template</Label>
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="font-medium text-sm">Schedule a Call</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Invites models to schedule a call to discuss the gig
                </p>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="p-3 rounded-lg border text-sm space-y-1">
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Subject:</span>{" "}
                  Let&apos;s Chat &mdash; Schedule a Call with EXA Models
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium text-foreground">Body:</span>{" "}
                  Personalized email with gig details and a &quot;Schedule My Call&quot; button linking to a scheduling page.
                </p>
              </div>
            </div>

            {/* Progress */}
            {massEmailSending && massEmailProgress.total > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {massEmailProgress.sent + massEmailProgress.skipped + massEmailProgress.failed} / {massEmailProgress.total}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                    style={{
                      width: `${((massEmailProgress.sent + massEmailProgress.skipped + massEmailProgress.failed) / massEmailProgress.total) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  {massEmailProgress.sent > 0 && <span className="text-green-500">{massEmailProgress.sent} sent</span>}
                  {massEmailProgress.skipped > 0 && <span className="text-amber-500">{massEmailProgress.skipped} skipped</span>}
                  {massEmailProgress.failed > 0 && <span className="text-red-500">{massEmailProgress.failed} failed</span>}
                </div>
              </div>
            )}

            {/* Send Button */}
            <Button
              className="w-full"
              onClick={handleSendMassEmail}
              disabled={massEmailSending || (() => {
                const count = massEmailFilter === "all"
                  ? applications.length
                  : massEmailFilter === "pending"
                    ? applications.filter(a => a.status === "pending").length
                    : applications.filter(a => a.status === "accepted" || a.status === "approved").length;
                return count === 0;
              })()}
            >
              {massEmailSending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending... {massEmailProgress.total > 0 && `(${massEmailProgress.sent + massEmailProgress.skipped + massEmailProgress.failed}/${massEmailProgress.total})`}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send to{" "}
                  {massEmailFilter === "all"
                    ? applications.length
                    : massEmailFilter === "pending"
                      ? applications.filter(a => a.status === "pending").length
                      : applications.filter(a => a.status === "accepted" || a.status === "approved").length}{" "}
                  model(s)
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
