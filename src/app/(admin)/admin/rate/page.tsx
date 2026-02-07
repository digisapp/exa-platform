"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Star,
  Instagram,
  MapPin,
  Loader2,
  CheckCircle,
  XCircle,
  Keyboard,
  Eye,
  Users,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

interface Model {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  profile_photo_url: string | null;
  profile_views: number | null;
  instagram_name: string | null;
  instagram_followers: number | null;
  admin_rating: number | null;
  created_at: string | null;
  is_approved: boolean | null;
  user_id: string | null;
  invite_token: string | null;
}

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

function formatFollowers(count: number | null): string {
  if (!count) return "-";
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

export default function AdminRatePage() {
  const supabase = createClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [models, setModels] = useState<Model[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [totalUnrated, setTotalUnrated] = useState(0);
  const [totalRated, setTotalRated] = useState(0);
  const [sessionRated, setSessionRated] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Filters
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("visible_pending");

  // Swipe animation
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const skipOpacity = useTransform(x, [-100, 0], [1, 0]);
  const approveOpacity = useTransform(x, [0, 100], [0, 1]);

  // Load models
  const loadModels = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("models")
        .select("*")
        .is("admin_rating", null)
        .order("instagram_followers", { ascending: false, nullsFirst: false });

      // Status filter
      if (statusFilter === "visible_pending") {
        query = query.eq("is_approved", true).not("invite_token", "is", null).is("user_id", null);
      } else if (statusFilter === "visible") {
        query = query.eq("is_approved", true);
      } else if (statusFilter === "all_pending") {
        query = query.not("invite_token", "is", null).is("user_id", null);
      }

      // State filter
      if (stateFilter !== "all") {
        query = query.eq("state", stateFilter);
      }

      query = query.limit(100);

      const { data, error } = await query;
      if (error) throw error;

      setModels(data || []);
      setCurrentIndex(0);

      // Get total counts
      const { count: unratedCount } = await supabase
        .from("models")
        .select("*", { count: "exact", head: true })
        .is("admin_rating", null)
        .eq("is_approved", true)
        .not("invite_token", "is", null)
        .is("user_id", null);

      const { count: ratedCount } = await supabase
        .from("models")
        .select("*", { count: "exact", head: true })
        .not("admin_rating", "is", null)
        .eq("is_approved", true)
        .not("invite_token", "is", null)
        .is("user_id", null);

      setTotalUnrated(unratedCount || 0);
      setTotalRated(ratedCount || 0);
    } catch (err) {
      console.error("Failed to load models:", err);
      toast.error("Failed to load models");
    } finally {
      setLoading(false);
    }
  }, [supabase, stateFilter, statusFilter]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  // Rate model
  const rateModel = async (rating: number) => {
    const model = models[currentIndex];
    if (!model || updating) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/models/${model.id}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      if (!res.ok) throw new Error("Failed to rate");

      setSessionRated((prev) => prev + 1);
      toast.success(`Rated ${rating} star${rating > 1 ? "s" : ""}`);
      nextModel();
    } catch {
      toast.error("Failed to rate model");
    } finally {
      setUpdating(false);
    }
  };

  // Skip model (no rating)
  const skipModel = () => {
    if (!updating) {
      nextModel();
    }
  };

  // Move to next model
  const nextModel = () => {
    if (currentIndex < models.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      x.set(0);
    } else {
      // Reload more models
      loadModels();
    }
  };

  // Go back to previous model
  const prevModel = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      x.set(0);
    }
  };

  // Handle swipe end
  const handleDragEnd = (event: any, info: any) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      // Swiped right - rate 3 stars (approve)
      rateModel(3);
    } else if (info.offset.x < -threshold) {
      // Swiped left - skip
      skipModel();
    } else {
      // Return to center
      x.set(0);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case "1":
          rateModel(1);
          break;
        case "2":
          rateModel(2);
          break;
        case "3":
          rateModel(3);
          break;
        case "4":
          rateModel(4);
          break;
        case "5":
          rateModel(5);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          skipModel();
          break;
        case "ArrowRight":
        case "d":
        case "D":
          rateModel(3);
          break;
        case "ArrowUp":
          prevModel();
          break;
        case " ":
          e.preventDefault();
          skipModel();
          break;
        case "?":
          setShowHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, models, updating]);

  const currentModel = models[currentIndex];
  const progress = totalUnrated > 0 ? ((totalRated + sessionRated) / (totalUnrated + totalRated + sessionRated)) * 100 : 0;

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin/community">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Rate Models</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionRated} rated this session
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Filters */}
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible_pending">Visible + Pending Invite</SelectItem>
                  <SelectItem value="visible">All Visible</SelectItem>
                  <SelectItem value="all_pending">All Pending Invite</SelectItem>
                  <SelectItem value="all">All Unrated</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stateFilter} onValueChange={(v) => setStateFilter(v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
                <Keyboard className="h-4 w-4 mr-2" />
                Shortcuts
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {totalRated + sessionRated} rated / {totalUnrated - sessionRated} remaining
              </span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="container px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
          </div>
        ) : models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
            <p className="text-muted-foreground mb-4">
              No more unrated models matching your filters.
            </p>
            <Button onClick={() => { setStateFilter("all"); setStatusFilter("visible_pending"); }}>
              Clear Filters
            </Button>
          </div>
        ) : currentModel ? (
          <div className="max-w-md mx-auto">
            {/* Card counter */}
            <div className="text-center mb-4 text-sm text-muted-foreground">
              {currentIndex + 1} of {models.length} loaded
            </div>

            {/* Swipeable card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentModel.id}
                style={{ x, rotate, opacity }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="cursor-grab active:cursor-grabbing"
              >
                <Card className="overflow-hidden shadow-2xl">
                  {/* Photo */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                    {currentModel.profile_photo_url ? (
                      <Image
                        src={currentModel.profile_photo_url}
                        alt={currentModel.username || "Model"}
                        fill
                        className="object-cover"
                        unoptimized={currentModel.profile_photo_url.includes("cdninstagram.com")}
                        priority
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-6xl">
                        {currentModel.first_name?.charAt(0) || currentModel.username?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Swipe indicators */}
                    <motion.div
                      className="absolute top-8 left-8 px-4 py-2 rounded-lg bg-red-500 text-white font-bold text-xl rotate-[-20deg] border-4 border-red-400"
                      style={{ opacity: skipOpacity }}
                    >
                      SKIP
                    </motion.div>
                    <motion.div
                      className="absolute top-8 right-8 px-4 py-2 rounded-lg bg-green-500 text-white font-bold text-xl rotate-[20deg] border-4 border-green-400"
                      style={{ opacity: approveOpacity }}
                    >
                      APPROVE
                    </motion.div>

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h2 className="text-2xl font-bold mb-1">
                        {currentModel.first_name
                          ? `${currentModel.first_name} ${currentModel.last_name || ""}`.trim()
                          : currentModel.username}
                      </h2>
                      <p className="text-white/70 text-sm mb-3">@{currentModel.username}</p>

                      <div className="flex flex-wrap gap-3 text-sm">
                        {(currentModel.city || currentModel.state) && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {currentModel.city && currentModel.state
                                ? `${currentModel.city}, ${currentModel.state}`
                                : currentModel.city || currentModel.state}
                            </span>
                          </div>
                        )}
                        {currentModel.instagram_name && (
                          <a
                            href={`https://instagram.com/${currentModel.instagram_name.replace("@", "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-pink-300 hover:text-pink-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Instagram className="h-4 w-4" />
                            <span>{formatFollowers(currentModel.instagram_followers)}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <div className="flex items-center gap-1 text-white/70">
                          <Eye className="h-4 w-4" />
                          <span>{currentModel.profile_views || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating buttons */}
                  <div className="p-4 bg-card">
                    <p className="text-center text-sm text-muted-foreground mb-3">
                      Rate this model (or press 1-5)
                    </p>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <Button
                          key={rating}
                          variant="outline"
                          size="lg"
                          onClick={() => rateModel(rating)}
                          disabled={updating}
                          className="w-12 h-12 p-0 hover:bg-yellow-500/20 hover:border-yellow-500"
                        >
                          <div className="flex flex-col items-center">
                            <Star className="h-5 w-5 text-yellow-500" />
                            <span className="text-xs">{rating}</span>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={skipModel}
                disabled={updating}
                className="w-16 h-16 rounded-full border-2 border-red-500/50 hover:bg-red-500/10 hover:border-red-500"
              >
                <XCircle className="h-8 w-8 text-red-500" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={prevModel}
                disabled={currentIndex === 0 || updating}
                className="w-12 h-12 rounded-full"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => rateModel(3)}
                disabled={updating}
                className="w-16 h-16 rounded-full border-2 border-green-500/50 hover:bg-green-500/10 hover:border-green-500"
              >
                <CheckCircle className="h-8 w-8 text-green-500" />
              </Button>
            </div>

            {/* Quick links */}
            <div className="flex justify-center gap-4 mt-6">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${currentModel.username}`} target="_blank">
                  <Eye className="h-4 w-4 mr-2" />
                  View Profile
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/admin/models/${currentModel.id}`} target="_blank">
                  <Users className="h-4 w-4 mr-2" />
                  Admin Details
                </Link>
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Help modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowHelp(false)}
        >
          <Card className="max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate 1-5 stars</span>
                <kbd className="px-2 py-1 bg-muted rounded">1-5</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skip (no rating)</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded">A</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded">←</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded">Space</kbd>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approve (3 stars)</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded">D</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded">→</kbd>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Go back</span>
                <kbd className="px-2 py-1 bg-muted rounded">↑</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toggle help</span>
                <kbd className="px-2 py-1 bg-muted rounded">?</kbd>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-medium mb-2">Swipe Gestures</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><ArrowLeft className="inline h-4 w-4" /> Swipe left to skip</p>
                <p><ArrowRight className="inline h-4 w-4" /> Swipe right to approve (3 stars)</p>
              </div>
            </div>
            <Button className="w-full mt-6" onClick={() => setShowHelp(false)}>
              Got it
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
