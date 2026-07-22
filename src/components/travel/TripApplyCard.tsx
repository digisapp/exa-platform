"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plane,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  PartyPopper,
} from "lucide-react";

interface TripApplyCardProps {
  gigId: string;
  gigSlug: string;
  isLoggedIn: boolean;
  isModel: boolean;
  canApply: boolean;
  closedReason: string | null;
  application: {
    id: string;
    status: string;
    confirmed_at: string | null;
  } | null;
}

export function TripApplyCard({
  gigId,
  gigSlug,
  isLoggedIn,
  isModel,
  canApply,
  closedReason,
  application,
}: TripApplyCardProps) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function apply() {
    setLoading(true);
    try {
      const res = await fetch("/api/gigs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gigId, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to apply");
        return;
      }
      toast.success("Application submitted!");
      router.refresh();
    } catch {
      toast.error("Failed to apply");
    } finally {
      setLoading(false);
    }
  }

  async function withdraw() {
    if (!application) return;
    setLoading(true);
    try {
      const res = await fetch("/api/gigs/apply", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to withdraw");
        return;
      }
      toast.success("Application withdrawn");
      router.refresh();
    } catch {
      toast.error("Failed to withdraw");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSpot() {
    if (!application) return;
    setLoading(true);
    try {
      const res = await fetch("/api/trips/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: application.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to confirm");
        return;
      }
      toast.success("You're confirmed — see you there! ✈️");
      router.refresh();
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setLoading(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-sm p-5 space-y-4">
      {children}
    </div>
  );

  // ── Existing application states ──────────────────────────────────────────
  if (application) {
    if (application.status === "accepted" && application.confirmed_at) {
      return shell(
        <div className="text-center space-y-2 py-2">
          <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-400" />
          <p className="font-semibold text-emerald-300">Spot confirmed</p>
          <p className="text-sm text-white/60">
            You&apos;re on this trip. We&apos;ll reach out with logistics closer to the date.
          </p>
          <Link href="/trips" className="text-sm text-violet-400 hover:text-violet-300 inline-block">
            View in My Trips →
          </Link>
        </div>
      );
    }
    if (application.status === "accepted") {
      return shell(
        <div className="text-center space-y-3 py-2">
          <PartyPopper className="h-10 w-10 mx-auto text-pink-400" />
          <p className="font-semibold text-white">You&apos;re in! 🎉</p>
          <p className="text-sm text-white/60">
            You&apos;ve been accepted for this trip. Lock in your spot so we can plan around you.
          </p>
          <Button
            onClick={confirmSpot}
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-xl shadow-lg shadow-emerald-500/25"
            size="lg"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Confirm My Spot
          </Button>
        </div>
      );
    }
    if (application.status === "waitlist") {
      return shell(
        <div className="text-center space-y-2 py-2">
          <Sparkles className="h-10 w-10 mx-auto text-violet-400" />
          <p className="font-semibold text-violet-300">You&apos;re shortlisted</p>
          <p className="text-sm text-white/60">
            You&apos;re on the shortlist — if a spot opens up, you&apos;ll be accepted automatically and emailed.
          </p>
        </div>
      );
    }
    if (application.status === "pending") {
      return shell(
        <div className="text-center space-y-3 py-2">
          <Clock className="h-10 w-10 mx-auto text-amber-400" />
          <p className="font-semibold text-amber-300">Application submitted</p>
          <p className="text-sm text-white/60">
            We&apos;re reviewing applications and will email you if you&apos;re selected.
          </p>
          <button
            onClick={withdraw}
            disabled={loading}
            className="text-xs text-white/40 hover:text-white/70 underline underline-offset-2"
          >
            Withdraw application
          </button>
        </div>
      );
    }
    // rejected / withdrawn — keep it soft, no dead-end
    return shell(
      <div className="text-center space-y-2 py-2">
        <Plane className="h-10 w-10 mx-auto text-white/30" />
        <p className="text-sm text-white/60">
          This one didn&apos;t work out — new trips are announced on the{" "}
          <Link href="/travel" className="text-violet-400 hover:text-violet-300">
            Travel page
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  // ── No application yet ───────────────────────────────────────────────────
  if (!isLoggedIn) {
    return shell(
      <div className="text-center space-y-3 py-2">
        <Plane className="h-10 w-10 mx-auto text-pink-400" />
        <p className="text-sm text-white/60">Sign in to apply for this trip</p>
        <Button
          asChild
          className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl shadow-lg shadow-pink-500/25"
          size="lg"
        >
          <Link href={`/signin?redirect=/travel/${gigSlug}`}>Sign In</Link>
        </Button>
      </div>
    );
  }

  if (!isModel) {
    return shell(
      <div className="text-center space-y-2 py-2">
        <Plane className="h-10 w-10 mx-auto text-white/30" />
        <p className="text-sm text-white/60">
          EXA Travel trips are exclusive to EXA models.{" "}
          <Link href="/apply" className="text-violet-400 hover:text-violet-300">
            Apply to join the roster
          </Link>
        </p>
      </div>
    );
  }

  if (!canApply) {
    return shell(
      <div className="text-center py-3">
        <p className="text-white/50 text-sm">{closedReason || "Not accepting applications right now"}</p>
      </div>
    );
  }

  return shell(
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.25em] text-white/50 font-semibold">
        Apply for this trip
      </p>
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Why are you a great fit? (optional)"
        className="bg-white/[0.03] border-white/10"
      />
      <Button
        onClick={apply}
        disabled={loading}
        className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 rounded-xl shadow-lg shadow-pink-500/25"
        size="lg"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plane className="h-4 w-4 mr-2" />}
        Apply Now
      </Button>
      <p className="text-xs text-center text-white/40">
        Applying is free. If you&apos;re selected, we&apos;ll email you with next steps.
      </p>
    </div>
  );
}
