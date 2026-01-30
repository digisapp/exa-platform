"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Calendar,
  MapPin,
  ArrowRight,
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

      setAppliedGigs((prev) => ({
        ...prev,
        [gigId]: "pending",
      }));

      toast.success("Application submitted! You'll hear back soon.");
    } catch (error) {
      console.error("Error applying:", error);
      toast.error("Failed to apply");
    } finally {
      setApplying(null);
    }
  };

  const getApplicationButton = (gig: Gig) => {
    const status = appliedGigs[gig.id];

    if (status === "accepted") {
      return (
        <Badge className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    if (status === "pending") {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Applied
        </Badge>
      );
    }

    if (status === "rejected") {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Not Selected
        </Badge>
      );
    }

    // For travel gigs, link to the gig page for payment flow
    if (gig.type === "travel") {
      return (
        <Button
          size="sm"
          asChild
          className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
        >
          <Link href={`/gigs/${gig.slug}`}>
            Apply
          </Link>
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={() => handleApply(gig.id)}
        disabled={applying === gig.id || !isApproved}
        className="bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
      >
        {applying === gig.id ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Apply"
        )}
      </Button>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-500" />
          Gigs For You
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/gigs" className="text-pink-500">
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {gigs && gigs.length > 0 ? (
          <div className="space-y-3">
            {gigs.map((gig) => (
              <div
                key={gig.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Link
                  href={`/gigs/${gig.slug}`}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="p-2 rounded-full bg-gradient-to-br from-pink-500/20 to-violet-500/20 flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate hover:text-pink-500 transition-colors">{gig.title}</p>
                      <Badge variant="outline" className="capitalize text-xs flex-shrink-0">
                        {gig.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {gig.start_at && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(gig.start_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {(gig.location_city || gig.location_state) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {gig.location_city}, {gig.location_state}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <div className="flex-shrink-0 ml-3">
                  {getApplicationButton(gig)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No gigs available right now</p>
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
