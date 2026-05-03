"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Search, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function parseHeightToInches(height: string | null | undefined): number | null {
  if (!height) return null;
  const match = height.match(/(\d+)['''`]?\s*(\d+)/);
  if (match) return parseInt(match[1]) * 12 + parseInt(match[2]);
  const inches = parseInt(height);
  if (!isNaN(inches) && inches > 24 && inches < 120) return inches;
  return null;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString();
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

interface Props {
  open: boolean;
  onClose: () => void;
  applications: Application[];
  selectedGig: Gig | null;
  processingApp: string | null;
  onApplicationAction: (appId: string, action: "accepted" | "rejected" | "cancelled" | "pending") => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:   { label: "Pending",   color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  accepted:  { label: "Accepted",  color: "bg-green-500/20 text-green-400 border-green-500/30" },
  approved:  { label: "Accepted",  color: "bg-green-500/20 text-green-400 border-green-500/30" },
  rejected:  { label: "Declined",  color: "bg-red-500/20 text-red-400 border-red-500/30" },
  cancelled: { label: "Cancelled", color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

function ApplicationCard({
  app,
  processingApp,
  onApplicationAction,
}: {
  app: Application;
  processingApp: string | null;
  onApplicationAction: Props["onApplicationAction"];
}) {
  const displayName = app.model?.first_name || app.model?.username;
  const isProcessing = processingApp === app.id;
  const sc = STATUS_CONFIG[app.status] ?? { label: app.status, color: "bg-white/10 text-white/60 border-white/20" };

  return (
    <div className="glass-card rounded-2xl overflow-hidden group cursor-default">
      <div className="aspect-[3/4] relative bg-gradient-to-br from-[#FF69B4]/20 to-[#9400D3]/20">
        {app.model?.profile_photo_url ? (
          <Image
            src={app.model.profile_photo_url}
            alt={displayName}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover object-top group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl">👤</span>
          </div>
        )}

        {/* Status badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-sm", sc.color)}>
            {sc.label}
          </span>
        </div>

        {/* Bottom name bar — always visible */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 pt-8 z-10">
          <h3 className="font-semibold text-white truncate">{displayName}</h3>
          <p className="text-sm text-[#00BFFF]">@{app.model?.username}</p>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/85 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4 z-20">
          <div className="space-y-1.5">
            <Link
              href={`/${app.model?.username}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block font-semibold text-white text-base hover:text-pink-400 transition-colors leading-snug"
            >
              {app.model?.first_name && app.model?.last_name
                ? `${app.model.first_name} ${app.model.last_name}`
                : displayName}
            </Link>
            <p className="text-xs text-[#00BFFF]">@{app.model?.username}</p>

            {app.model?.height && (
              <p className="text-sm text-white/80">{app.model.height}</p>
            )}

            {(app.model?.bust || app.model?.waist || app.model?.hips) && (
              <p className="text-xs text-white/60">
                {[
                  app.model.bust  && `B ${app.model.bust}`,
                  app.model.waist && `W ${app.model.waist}`,
                  app.model.hips  && `H ${app.model.hips}`,
                ].filter(Boolean).join(" · ")}
              </p>
            )}

            {((app.instagram_followers ?? 0) > 0 || (app.model?.tiktok_followers ?? 0) > 0) && (
              <div className="flex gap-3 text-xs pt-0.5">
                {(app.instagram_followers ?? 0) > 0 && (
                  <span className="text-pink-300">IG {formatFollowers(app.instagram_followers!)}</span>
                )}
                {(app.model?.tiktok_followers ?? 0) > 0 && (
                  <span className="text-blue-300">TT {formatFollowers(app.model.tiktok_followers!)}</span>
                )}
              </div>
            )}

            {(app.model?.eye_color || app.model?.hair_color) && (
              <p className="text-xs text-white/50">
                {[app.model.eye_color, app.model.hair_color].filter(Boolean).join(" · ")}
              </p>
            )}

            <p className="text-xs text-white/35">
              Applied {new Date(app.applied_at).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {app.status === "pending" ? (
              <>
                <button
                  onClick={() => onApplicationAction(app.id, "rejected")}
                  disabled={isProcessing}
                  className="flex-1 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><XCircle className="h-3.5 w-3.5" /> Decline</>
                  )}
                </button>
                <button
                  onClick={() => onApplicationAction(app.id, "accepted")}
                  disabled={isProcessing}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <><CheckCircle className="h-3.5 w-3.5" /> Accept</>
                  )}
                </button>
              </>
            ) : app.status === "accepted" || app.status === "approved" ? (
              <button
                onClick={() => onApplicationAction(app.id, "cancelled")}
                disabled={isProcessing}
                className="flex-1 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><XCircle className="h-3.5 w-3.5" /> Cancel</>
                )}
              </button>
            ) : (
              <button
                onClick={() => onApplicationAction(app.id, "pending")}
                disabled={isProcessing}
                className="flex-1 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
              >
                {isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <><RefreshCw className="h-3.5 w-3.5" /> Restore</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GigApplicationsFullscreen({
  open,
  onClose,
  applications,
  selectedGig,
  processingApp,
  onApplicationAction,
}: Props) {
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "declined">("all");
  const [modelSearch, setModelSearch] = useState("");
  const [igMinFollowers, setIgMinFollowers] = useState(0);
  const [minHeightFilter, setMinHeightFilter] = useState("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    return applications.filter((app) => {
      if (statusFilter === "pending" && app.status !== "pending") return false;
      if (statusFilter === "approved" && app.status !== "accepted" && app.status !== "approved") return false;
      if (statusFilter === "declined" && app.status !== "rejected" && app.status !== "cancelled") return false;
      if (modelSearch) {
        const s = modelSearch.toLowerCase();
        const fn = app.model?.first_name?.toLowerCase() || "";
        const ln = app.model?.last_name?.toLowerCase() || "";
        const un = app.model?.username?.toLowerCase() || "";
        if (!fn.includes(s) && !ln.includes(s) && !un.includes(s) && !`${fn} ${ln}`.trim().includes(s)) return false;
      }
      if (igMinFollowers > 0 && (app.instagram_followers ?? 0) < igMinFollowers) return false;
      if (minHeightFilter) {
        const modelIn = parseHeightToInches(app.model?.height);
        const threshIn = parseHeightToInches(minHeightFilter);
        if (modelIn === null || threshIn === null || modelIn < threshIn) return false;
      }
      return true;
    });
  }, [applications, statusFilter, modelSearch, igMinFollowers, minHeightFilter]);

  if (!open) return null;

  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === "pending").length,
    approved: applications.filter(a => a.status === "accepted" || a.status === "approved").length,
    declined: applications.filter(a => a.status === "rejected" || a.status === "cancelled").length,
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0014] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-violet-500/20 bg-[#0a0014]/95 backdrop-blur-xl px-6 py-4 space-y-3">
        {/* Title row */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">Applications</p>
            <h2 className="text-xl font-bold truncate">
              <span className="exa-gradient-text">{selectedGig?.title || "Gig Applications"}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-sm text-white/40">
              {filtered.length}{filtered.length !== applications.length && ` of ${applications.length}`}
            </span>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter row 1: Status tabs + Search */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10">
            {(["all", "pending", "approved", "declined"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                  statusFilter === s
                    ? "bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-white border border-pink-500/30 shadow-sm"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
            <Input
              placeholder="Search by name or username..."
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-pink-500/40 rounded-xl"
            />
          </div>
        </div>

        {/* Filter row 2: IG followers + Height */}
        <div className="flex flex-wrap gap-5 items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">IG:</span>
            <div className="flex gap-1 p-0.5 bg-white/5 rounded-xl border border-white/10">
              {IG_PRESETS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setIgMinFollowers(value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-lg transition-all",
                    igMinFollowers === value
                      ? "bg-gradient-to-r from-pink-500/20 to-violet-500/20 text-white border border-pink-500/30"
                      : "text-white/50 hover:text-white/80"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-white/50">Height:</span>
            <Select value={minHeightFilter || "any"} onValueChange={(v) => setMinHeightFilter(v === "any" ? "" : v)}>
              <SelectTrigger className="h-7 text-xs w-[90px] bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                {HEIGHT_OPTIONS.map((h) => (
                  <SelectItem key={h} value={h}>{h}+</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <span className="text-6xl mb-4">👤</span>
            <p className="text-lg font-medium">No matching applications</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                processingApp={processingApp}
                onApplicationAction={onApplicationAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
