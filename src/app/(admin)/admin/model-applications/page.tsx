"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Instagram,
  Loader2,
  CheckCircle,
  XCircle,
  Keyboard,
  ExternalLink,
  ChevronLeft,
  Camera,
  Mail,
  Trash2,
  Ruler,
  Cake,
  CalendarClock,
  SkipForward,
  Music2,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ModelApplication {
  id: string;
  display_name: string;
  email: string;
  bio: string | null;
  instagram_username: string | null;
  tiktok_username: string | null;
  date_of_birth: string | null;
  height: string | null;
  status: string;
  created_at: string;
  email_confirmed_at: string | null;
  profile_photo_url: string | null;
  photo_requested_at: string | null;
}

function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function appliedAgo(createdAt: string): string {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (24 * 60 * 60 * 1000));
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function cleanHandle(handle: string): string {
  return handle.replace(/^@/, "").replace(/\s+/g, "");
}

type ActionKind = "approve" | "reject" | "request_photo" | "resend_confirm" | "delete";

export default function AdminModelApplicationsPage() {
  const supabase = createClient();

  const [apps, setApps] = useState<ModelApplication[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<ActionKind | null>(null);
  const [sessionActioned, setSessionActioned] = useState(0);
  const [initialCount, setInitialCount] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from("model_applications") as any)
        .select("id, display_name, email, bio, instagram_username, tiktok_username, date_of_birth, height, status, created_at, email_confirmed_at, profile_photo_url, photo_requested_at")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      // Review-ready first: an app with a photo can be decided right now
      // (photo-request returners land here), the rest stay newest-first
      const sorted = [...(data || [])].sort(
        (a: ModelApplication, b: ModelApplication) =>
          (b.profile_photo_url ? 1 : 0) - (a.profile_photo_url ? 1 : 0)
      );
      setApps(sorted);
      setInitialCount(sorted.length);
      setCurrentIndex(0);
      setSessionActioned(0);
    } catch (err) {
      console.error("Failed to load applications:", err);
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadApps();
  }, [loadApps]);

  const current = apps[currentIndex];

  // Remove the acted-on card from the queue; the next one slides into its slot
  const removeCurrent = () => {
    setApps((prev) => prev.filter((_, i) => i !== currentIndex));
    setCurrentIndex((prev) => Math.min(prev, apps.length - 2 < 0 ? 0 : apps.length - 2));
    setSessionActioned((prev) => prev + 1);
  };

  const patchStatus = async (app: ModelApplication, status: string) => {
    const res = await fetch(`/api/admin/model-applications/${app.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update");
    }
  };

  const handleApprove = async () => {
    if (!current || updating) return;
    setUpdating("approve");
    try {
      await patchStatus(current, "approved");
      toast.success(`${current.display_name} approved!`);
      removeCurrent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setUpdating(null);
    }
  };

  const handleReject = async () => {
    if (!current || updating) return;
    const app = current;
    setUpdating("reject");
    try {
      await patchStatus(app, "rejected");
      removeCurrent();
      // No email goes out on rejection; the undo restores her to pending
      toast.success(`${app.display_name} rejected`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await patchStatus(app, "pending");
              setApps((prev) => [app, ...prev]);
              setCurrentIndex(0);
              setSessionActioned((prev) => Math.max(0, prev - 1));
              toast.success(`${app.display_name} restored to pending`);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Undo failed");
            }
          },
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setUpdating(null);
    }
  };

  const handleRequestPhoto = async () => {
    if (!current || updating) return;
    setUpdating("request_photo");
    try {
      await patchStatus(current, "request_photo");
      toast.success("Photo request sent — she'll return to this queue when it's uploaded");
      removeCurrent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Photo request failed");
    } finally {
      setUpdating(null);
    }
  };

  const handleResendConfirm = async () => {
    if (!current || updating) return;
    setUpdating("resend_confirm");
    try {
      const res = await fetch(`/api/admin/model-applications/${current.id}/resend-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to resend");
      }
      toast.success("Confirmation email resent");
      // She stays pending — advance past her for this session
      nextApp();
      setSessionActioned((prev) => prev + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resend failed");
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    if (!current || updating) return;
    setUpdating("delete");
    try {
      const res = await fetch(`/api/admin/model-applications/${current.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Deleted");
      setShowDeleteDialog(false);
      removeCurrent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setUpdating(null);
    }
  };

  const nextApp = () => {
    if (currentIndex < apps.length - 1) setCurrentIndex((prev) => prev + 1);
  };

  const prevApp = () => {
    if (currentIndex > 0) setCurrentIndex((prev) => prev - 1);
  };

  // The contextual primary action mirrors the backend gates: unconfirmed
  // email → resend link; no photo → request one; otherwise → approve.
  const primary: ActionKind | null = !current
    ? null
    : !current.email_confirmed_at
      ? "resend_confirm"
      : !current.profile_photo_url
        ? "request_photo"
        : "approve";

  const firePrimary = () => {
    if (primary === "resend_confirm") void handleResendConfirm();
    else if (primary === "request_photo") void handleRequestPhoto();
    else if (primary === "approve") void handleApprove();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (showDeleteDialog || updating) return;

      switch (e.key) {
        case "ArrowRight":
        case "Enter":
          e.preventDefault();
          firePrimary();
          break;
        case "r":
        case "R":
          void handleReject();
          break;
        case "x":
        case "X":
          setShowDeleteDialog(true);
          break;
        case " ":
          e.preventDefault();
          nextApp();
          break;
        case "ArrowLeft":
          prevApp();
          break;
        case "i":
        case "I":
          if (current?.instagram_username) {
            window.open(`https://instagram.com/${cleanHandle(current.instagram_username)}`, "_blank");
          }
          break;
        case "?":
          setShowHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, apps, updating, showDeleteDialog, primary]);

  const progress = initialCount > 0 ? (sessionActioned / initialCount) * 100 : 0;
  const age = ageFromDob(current?.date_of_birth ?? null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/admin/community">
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold">Model Applications</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionActioned} handled this session · {apps.length} remaining
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowHelp(true)}>
              <Keyboard className="h-4 w-4 mr-2" />
              Shortcuts
            </Button>
          </div>
          <div className="mt-4">
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
        ) : apps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Queue cleared!</h2>
            <p className="text-muted-foreground mb-4">No pending applications left.</p>
            <Button asChild>
              <Link href="/admin/community">Back to Community</Link>
            </Button>
          </div>
        ) : current ? (
          <div className="max-w-md mx-auto">
            <div className="text-center mb-4 text-sm text-muted-foreground">
              {currentIndex + 1} of {apps.length} in queue
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ scale: 0.97, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.97, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Card className="overflow-hidden shadow-2xl">
                  {/* Photo */}
                  <div className="relative aspect-[3/4] max-h-[50vh] w-full bg-gradient-to-br from-pink-500/20 to-violet-500/20">
                    {current.profile_photo_url ? (
                      <img
                        src={current.profile_photo_url}
                        alt={current.display_name}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white font-bold text-4xl">
                          {current.display_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <span className="text-sm text-muted-foreground">No photo submitted</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

                    {/* Status badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      {!current.email_confirmed_at && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-amber-500/90 text-black">
                          email unconfirmed
                        </span>
                      )}
                      {current.photo_requested_at && !current.profile_photo_url && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded bg-violet-500/90 text-white">
                          photo requested
                        </span>
                      )}
                    </div>

                    {/* Info overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                      <h2 className="text-2xl font-bold mb-1">{current.display_name}</h2>
                      <p className="text-white/70 text-sm mb-2">{current.email}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        {age !== null && (
                          <span className="flex items-center gap-1"><Cake className="h-4 w-4" />{age} yrs</span>
                        )}
                        {current.height && (
                          <span className="flex items-center gap-1"><Ruler className="h-4 w-4" />{current.height}</span>
                        )}
                        <span className="flex items-center gap-1 text-white/70">
                          <CalendarClock className="h-4 w-4" />applied {appliedAgo(current.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-card space-y-3">
                    {current.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">{current.bio}</p>
                    )}

                    {/* The judgment call happens on Instagram — make it the loudest link */}
                    <div className="flex gap-2">
                      {current.instagram_username ? (
                        <Button
                          asChild
                          className="flex-1 bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600"
                        >
                          <a
                            href={`https://instagram.com/${cleanHandle(current.instagram_username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Instagram className="h-4 w-4 mr-2" />
                            @{cleanHandle(current.instagram_username)}
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      ) : (
                        <div className="flex-1 text-center text-sm text-muted-foreground py-2">No Instagram</div>
                      )}
                      {current.tiktok_username && (
                        <Button asChild variant="outline">
                          <a
                            href={`https://www.tiktok.com/@${cleanHandle(current.tiktok_username)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Music2 className="h-4 w-4 mr-1" />
                            TikTok
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>

            {/* Action row */}
            <div className="flex justify-center items-center gap-3 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowDeleteDialog(true)}
                disabled={updating !== null}
                title="Delete (spam) — X"
                className="w-12 h-12 rounded-full border-red-500/40 hover:bg-red-500/10 hover:border-red-500 p-0"
              >
                <Trash2 className="h-5 w-5 text-red-500" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleReject}
                disabled={updating !== null}
                title="Reject (silent, undoable) — R"
                className="w-16 h-16 rounded-full border-2 border-red-500/50 hover:bg-red-500/10 hover:border-red-500 p-0"
              >
                {updating === "reject" ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </Button>

              {primary === "resend_confirm" && (
                <Button
                  size="lg"
                  onClick={handleResendConfirm}
                  disabled={updating !== null}
                  title="Re-send the confirm link; approval unlocks once she clicks it — → or Enter"
                  className="h-16 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {updating === "resend_confirm" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-5 w-5 mr-2" />
                      Resend confirm
                    </>
                  )}
                </Button>
              )}
              {primary === "request_photo" && (
                <Button
                  size="lg"
                  onClick={handleRequestPhoto}
                  disabled={updating !== null}
                  title="You're-selected email; she returns to this queue for review when she uploads a photo — → or Enter"
                  className="h-16 px-6 rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                >
                  {updating === "request_photo" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="h-5 w-5 mr-2" />
                      {current.photo_requested_at ? "Resend photo request" : "Request photo"}
                    </>
                  )}
                </Button>
              )}
              {primary === "approve" && (
                <Button
                  size="lg"
                  onClick={handleApprove}
                  disabled={updating !== null}
                  title="Approve — → or Enter"
                  className="h-16 px-6 rounded-full bg-green-500 hover:bg-green-600 font-semibold"
                >
                  {updating === "approve" ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approve
                    </>
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                size="lg"
                onClick={nextApp}
                disabled={updating !== null || currentIndex >= apps.length - 1}
                title="Skip for now — Space"
                className="w-12 h-12 rounded-full p-0"
              >
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {/* Back */}
            <div className="flex justify-center mt-4">
              <Button variant="ghost" size="sm" onClick={prevApp} disabled={currentIndex === 0 || updating !== null}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes {current?.display_name}&apos;s application. Use this for spam only — for a real
              person who isn&apos;t a fit, use Reject instead (it&apos;s silent and undoable).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating === "delete"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={updating === "delete"}
              className="bg-red-500 hover:bg-red-600"
            >
              {updating === "delete" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                <span className="text-muted-foreground">Primary action (approve / request photo / resend confirm)</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-muted rounded">→</kbd>
                  <kbd className="px-2 py-1 bg-muted rounded">Enter</kbd>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reject (silent, undoable)</span>
                <kbd className="px-2 py-1 bg-muted rounded">R</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delete (spam)</span>
                <kbd className="px-2 py-1 bg-muted rounded">X</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Open Instagram</span>
                <kbd className="px-2 py-1 bg-muted rounded">I</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skip for now</span>
                <kbd className="px-2 py-1 bg-muted rounded">Space</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Go back</span>
                <kbd className="px-2 py-1 bg-muted rounded">←</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Toggle help</span>
                <kbd className="px-2 py-1 bg-muted rounded">?</kbd>
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
