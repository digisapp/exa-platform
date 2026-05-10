"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, Loader2, Sparkles } from "lucide-react";

type Status =
  | "loading"
  | "not_started"
  | "pending_review"
  | "rejected"
  | "verified";

/**
 * Renders nothing for verified models — only shows up when the model needs
 * to take action (start verification, fix a rejection, or wait for review).
 */
export function IdentityVerificationBanner() {
  const [status, setStatus] = useState<Status>("loading");
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/verifications/me");
        if (!res.ok) {
          // Fans / brands hit this and get 404 — silently no-op.
          if (!cancelled) setStatus("verified");
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        if (data.status === "verified" || data.status === "approved") {
          setStatus("verified");
        } else if (data.status === "pending_review") {
          setStatus("pending_review");
        } else if (data.status === "rejected") {
          setStatus("rejected");
          setRejectionReason(data.rejectionReason || null);
        } else {
          setStatus("not_started");
        }
      } catch {
        if (!cancelled) setStatus("verified"); // fail closed: don't nag on transient errors
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading" || status === "verified") return null;

  if (status === "pending_review") {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(251,191,36,0.15)]">
        <Loader2 className="h-5 w-5 text-amber-300 shrink-0 mt-0.5 animate-spin" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-200">Identity verification under review</p>
          <p className="text-amber-100/70 mt-0.5">
            We&apos;ll release payouts once a team member confirms your documents (within 24 hours).
          </p>
        </div>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="mb-6 flex items-start gap-3 p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.15)]">
        <ShieldAlert className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-rose-200">Identity verification rejected</p>
          {rejectionReason && (
            <p className="text-rose-100/70 mt-0.5">Reason: {rejectionReason}</p>
          )}
          <Link
            href="/verify-identity"
            className="inline-flex items-center gap-1 mt-2 font-semibold text-rose-200 hover:text-white transition-colors"
          >
            Resubmit documents <Sparkles className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // not_started
  return (
    <Link
      href="/verify-identity"
      className="mb-6 flex items-center gap-3 p-4 rounded-xl border border-violet-500/40 bg-gradient-to-r from-pink-500/10 via-violet-500/10 to-cyan-500/10 hover:from-pink-500/15 hover:via-violet-500/15 hover:to-cyan-500/15 shadow-[0_0_20px_rgba(167,139,250,0.2)] hover:shadow-[0_0_28px_rgba(167,139,250,0.35)] transition-all group"
    >
      <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/40 group-hover:scale-110 transition-transform">
        <ShieldCheck className="h-5 w-5 text-violet-200" />
      </div>
      <div className="flex-1 text-sm">
        <p className="font-semibold text-violet-100">
          Verify your identity to enable payouts
        </p>
        <p className="text-violet-100/70 mt-0.5">
          One-time check — upload a photo ID and a selfie. Reviewed within 24 hours.
        </p>
      </div>
      <span className="text-violet-200 group-hover:translate-x-1 transition-transform">→</span>
    </Link>
  );
}
