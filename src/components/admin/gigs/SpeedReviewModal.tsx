"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  SkipForward,
  X,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ReviewModel {
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
}

interface ReviewApplication {
  id: string;
  status: string;
  applied_at: string;
  instagram_handle?: string;
  instagram_followers?: number;
  digis_username?: string;
  trip_number?: number;
  spot_type?: string;
  payment_status?: string;
  model: ReviewModel;
}

interface SpeedReviewModalProps {
  open: boolean;
  onClose: () => void;
  applications: ReviewApplication[];
  processingApp: string | null;
  onApplicationAction: (appId: string, action: "accepted" | "rejected") => void;
}

function fmtNum(n: number | null | undefined): string {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function SpeedReviewModal({
  open,
  onClose,
  applications,
  processingApp,
  onApplicationAction,
}: SpeedReviewModalProps) {
  const [queue, setQueue] = useState<ReviewApplication[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setQueue(applications.filter((a) => a.status === "pending"));
      setIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const total = queue.length;
  const current = queue[index];
  const isDone = index >= total;
  const isProcessing = current ? processingApp === current.id : false;

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, total));
  }, [total]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleAccept = useCallback(() => {
    if (!current || isProcessing) return;
    onApplicationAction(current.id, "accepted");
    goNext();
  }, [current, isProcessing, onApplicationAction, goNext]);

  const handleReject = useCallback(() => {
    if (!current || isProcessing) return;
    onApplicationAction(current.id, "rejected");
    goNext();
  }, [current, isProcessing, onApplicationAction, goNext]);

  const handleSkip = useCallback(() => {
    if (!current) return;
    goNext();
  }, [current, goNext]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowRight" || e.key === "a" || e.key === "A")
        handleAccept();
      else if (e.key === "ArrowLeft" || e.key === "r" || e.key === "R")
        handleReject();
      else if (e.key === " " || e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleAccept, handleReject, handleSkip, onClose]);

  if (!open) return null;

  const displayName = current?.model
    ? `${current.model.first_name || ""} ${current.model.last_name || ""}`.trim() ||
      `@${current.model.username}`
    : "";

  const hasMeasurements =
    current?.model &&
    (current.model.height ||
      current.model.bust ||
      current.model.waist ||
      current.model.hips ||
      current.model.shoe_size ||
      current.model.dress_size ||
      current.model.eye_color ||
      current.model.hair_color);

  const socialPlatforms = current
    ? [
        current.instagram_handle
          ? {
              name: "IG",
              handle: `@${current.instagram_handle}`,
              followers: current.instagram_followers,
            }
          : null,
        current.model.tiktok_username
          ? {
              name: "TT",
              handle: `@${current.model.tiktok_username}`,
              followers: current.model.tiktok_followers,
            }
          : null,
        current.model.youtube_username
          ? {
              name: "YT",
              handle: `@${current.model.youtube_username}`,
              followers: current.model.youtube_subscribers,
            }
          : null,
        current.model.x_username
          ? {
              name: "X",
              handle: `@${current.model.x_username}`,
              followers: current.model.x_followers,
            }
          : null,
        current.model.snapchat_username
          ? {
              name: "SC",
              handle: `@${current.model.snapchat_username}`,
              followers: current.model.snapchat_followers,
            }
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white/50 text-sm tracking-wider uppercase text-xs">
            Speed Review
          </span>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold tabular-nums">
              {Math.min(index + 1, total)}
            </span>
            <span className="text-white/30">/</span>
            <span className="text-white/50 tabular-nums">{total}</span>
          </div>
          <div className="w-40 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-violet-500 transition-all duration-200"
              style={{
                width: `${total > 0 ? (index / total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:flex items-center gap-3 text-white/25 text-xs font-mono">
            <span>
              <span className="text-white/40">←</span> R = Reject
            </span>
            <span>
              A = Accept <span className="text-white/40">→</span>
            </span>
            <span>S = Skip</span>
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-white/50 hover:text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main */}
      {isDone ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-white">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.2)]">
            <CheckCircle className="h-10 w-10 text-green-400" />
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">Review Complete</h2>
            <p className="text-white/40 mt-1">
              You&apos;ve reviewed all {total} pending applications.
            </p>
          </div>
          <Button
            onClick={onClose}
            className="mt-2 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white border-0 px-8"
          >
            Done
          </Button>
        </div>
      ) : current ? (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Portrait */}
          <div className="w-[55%] relative bg-zinc-900 flex-shrink-0">
            {current.model.profile_photo_url ? (
              <Image
                src={current.model.profile_photo_url}
                alt={displayName}
                fill
                className="object-cover object-top"
                sizes="55vw"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pink-500/10 to-violet-500/10">
                <span className="text-9xl font-bold text-white/10 select-none">
                  {current.model.first_name?.charAt(0) ||
                    current.model.username?.charAt(0)?.toUpperCase() ||
                    "?"}
                </span>
              </div>
            )}
            {/* Bottom gradient */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
            {/* Spot badges */}
            {(current.trip_number ||
              current.spot_type ||
              current.payment_status === "paid") && (
              <div className="absolute bottom-5 left-5 flex flex-wrap gap-2">
                {current.trip_number && (
                  <Badge className="bg-black/60 text-white border-white/20 backdrop-blur-sm">
                    Trip {current.trip_number}
                  </Badge>
                )}
                {current.spot_type === "paid" && (
                  <Badge className="bg-green-500/80 text-white border-0">
                    Paid Spot
                  </Badge>
                )}
                {current.spot_type === "sponsored" && (
                  <Badge className="bg-violet-500/80 text-white border-0">
                    Sponsored
                  </Badge>
                )}
                {current.payment_status === "paid" && (
                  <Badge className="bg-emerald-500/80 text-white border-0">
                    Paid ✓
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Right: Info panel */}
          <div className="flex-1 bg-zinc-950 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-8 space-y-7">
              {/* Name */}
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white leading-tight">
                    {displayName}
                  </h2>
                  <Link
                    href={`/${current.model.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/30 hover:text-pink-400 transition-colors flex-shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                <p className="text-white/40 text-sm mt-1">
                  @{current.model.username}
                </p>
                <p className="text-white/25 text-xs mt-1">
                  Applied{" "}
                  {new Date(current.applied_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Measurements */}
              {hasMeasurements && (
                <div>
                  <p className="text-[10px] font-bold text-pink-400 uppercase tracking-[0.2em] mb-3">
                    Measurements
                  </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                    {current.model.height && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Height</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.height}
                        </span>
                      </div>
                    )}
                    {current.model.bust && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Bust</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.bust}
                        </span>
                      </div>
                    )}
                    {current.model.waist && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Waist</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.waist}
                        </span>
                      </div>
                    )}
                    {current.model.hips && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Hips</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.hips}
                        </span>
                      </div>
                    )}
                    {current.model.shoe_size && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Shoe</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.shoe_size}
                        </span>
                      </div>
                    )}
                    {current.model.dress_size && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Dress</span>
                        <span className="text-white text-sm font-medium">
                          {current.model.dress_size}
                        </span>
                      </div>
                    )}
                    {current.model.eye_color && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Eyes</span>
                        <span className="text-white text-sm font-medium capitalize">
                          {current.model.eye_color}
                        </span>
                      </div>
                    )}
                    {current.model.hair_color && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/35 text-sm">Hair</span>
                        <span className="text-white text-sm font-medium capitalize">
                          {current.model.hair_color}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Social media */}
              {socialPlatforms.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-3">
                    Social Media
                  </p>
                  <div className="space-y-2.5">
                    {socialPlatforms.map(
                      (p) =>
                        p && (
                          <div
                            key={p.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-white/30 text-xs font-mono w-5 text-right">
                                {p.name}
                              </span>
                              <span className="text-white/70 text-sm">
                                {p.handle}
                              </span>
                            </div>
                            <span className="text-white font-semibold text-sm tabular-nums">
                              {fmtNum(p.followers)}
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* Digis */}
              {current.digis_username && (
                <div>
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] mb-2">
                    Digis
                  </p>
                  <p className="text-white/70 text-sm">{current.digis_username}</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 px-6 pt-4 pb-3 border-t border-white/10 flex gap-3">
              <Button
                className="flex-1 h-14 text-base font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 hover:border-red-500/50 transition-all duration-200 rounded-xl"
                variant="outline"
                onClick={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <XCircle className="h-5 w-5 mr-2" />
                    Reject
                  </>
                )}
              </Button>
              <Button
                className="flex-1 h-14 text-base font-semibold bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/25 hover:border-green-500/50 transition-all duration-200 rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.08)] hover:shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                variant="outline"
                onClick={handleAccept}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Accept
                  </>
                )}
              </Button>
            </div>

            {/* Nav row */}
            <div className="flex-shrink-0 px-6 pb-5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={goPrev}
                disabled={index === 0}
                className="text-white/30 hover:text-white/60 text-xs"
              >
                ← Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-white/30 hover:text-white/60 text-xs"
              >
                <SkipForward className="h-3.5 w-3.5 mr-1" />
                Skip
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                disabled={index >= total - 1}
                className="text-white/30 hover:text-white/60 text-xs"
              >
                Next →
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
