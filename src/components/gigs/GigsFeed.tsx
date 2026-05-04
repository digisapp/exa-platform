"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Calendar,
  MapPin,
  ArrowRight,
  ArrowUpRight,
  Loader2,
  CheckCircle,
  Clock,
} from "lucide-react";

interface Gig {
  id: string;
  slug: string;
  title: string;
  type: string;
  description?: string;
  location_city?: string;
  location_state?: string;
  start_at?: string;
  compensation_type?: string;
  compensation_amount?: number;
  spots?: number;
  spots_filled?: number;
}

interface GigsFeedProps {
  gigs: Gig[];
  modelApplications: { gig_id: string; status: string }[];
  isApproved: boolean;
}

export function GigsFeed({ gigs, modelApplications, isApproved }: GigsFeedProps) {
  const [applying, setApplying] = useState<string | null>(null);
  const [appliedGigs, setAppliedGigs] = useState<Record<string, string>>(
    modelApplications.reduce((acc, app) => {
      acc[app.gig_id] = app.status;
      return acc;
    }, {} as Record<string, string>)
  );

  const handleApply = async (gigId: string) => {
    if (!isApproved) {
      toast.error("Your profile must be approved to apply for gigs");
      return;
    }

    setApplying(gigId);
    try {
      const response = await fetch("/api/gigs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to apply");
        return;
      }

      setAppliedGigs((prev) => ({ ...prev, [gigId]: "pending" }));
      toast.success("Application submitted! You'll hear back soon.");
    } catch {
      toast.error("Failed to apply");
    } finally {
      setApplying(null);
    }
  };

  const getApplicationBadge = (gig: Gig) => {
    const status = appliedGigs[gig.id];

    if (status === "accepted") {
      return (
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 gap-1">
          <CheckCircle className="h-3 w-3" /> Accepted
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 gap-1">
          <Clock className="h-3 w-3" /> Applied
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="outline" className="text-white/40 border-white/10">
          Not Selected
        </Badge>
      );
    }
    return null;
  };

  const getActionButton = (gig: Gig) => {
    const status = appliedGigs[gig.id];
    if (status) return null;

    if (gig.type === "travel") {
      return (
        <Button size="sm" variant="outline" className="border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10 shrink-0" asChild>
          <Link href={`/gigs/${gig.slug}`}>
            Details <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={() => handleApply(gig.id)}
        disabled={applying === gig.id || !isApproved}
        className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white shrink-0"
      >
        {applying === gig.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
      </Button>
    );
  };

  return (
    <>
      <header className="flex items-center justify-between p-5 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <h2 className="text-base font-semibold">Gigs For You</h2>
          {gigs.length > 0 && (
            <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {gigs.length}
            </span>
          )}
        </div>
        <Link href="/gigs" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
          View All <ArrowUpRight className="h-3 w-3" />
        </Link>
      </header>

      <div className="p-3">
        {gigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
            {gigs.map((gig) => {
              const badge = getApplicationBadge(gig);
              const actionBtn = getActionButton(gig);
              const spotsLeft = gig.spots != null && gig.spots_filled != null
                ? gig.spots - gig.spots_filled
                : null;

              return (
                <div
                  key={gig.id}
                  className="flex flex-col gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.07] hover:border-cyan-500/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shrink-0">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/gigs/${gig.slug}`} className="block">
                        <p className="font-semibold text-sm text-white hover:text-cyan-300 transition-colors leading-snug">
                          {gig.title}
                        </p>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                        <Badge variant="outline" className="capitalize text-[10px] px-1.5 py-0 border-white/10 text-white/50">
                          {gig.type}
                        </Badge>
                        {gig.start_at && (
                          <span className="flex items-center gap-1 text-xs text-white/50">
                            <Calendar className="h-3 w-3" />
                            {new Date(gig.start_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {(gig.location_city || gig.location_state) && (
                          <span className="flex items-center gap-1 text-xs text-white/50">
                            <MapPin className="h-3 w-3" />
                            {[gig.location_city, gig.location_state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {spotsLeft != null && spotsLeft <= 5 && (
                          <span className="text-[10px] text-rose-400 font-medium">
                            {spotsLeft} spot{spotsLeft !== 1 ? "s" : ""} left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-auto">
                    {gig.compensation_type === "paid" && gig.compensation_amount ? (
                      <span className="text-sm font-bold text-emerald-400">${gig.compensation_amount}</span>
                    ) : (
                      <span />
                    )}
                    <div className="flex items-center gap-2">
                      {badge}
                      {actionBtn}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="p-4 rounded-full bg-cyan-500/10 inline-block mb-3">
              <Sparkles className="h-7 w-7 text-cyan-400/50" />
            </div>
            <p className="text-sm text-white/60">No gigs available right now</p>
            <p className="text-xs text-white/40 mt-1">Check back soon!</p>
          </div>
        )}
      </div>
    </>
  );
}
