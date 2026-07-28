"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  EyeOff,
} from "lucide-react";
import type { ReadinessItem } from "@/lib/casting-readiness";

const COLLAPSE_KEY = "exa_runway_ready_collapsed";

/**
 * "Runway Ready" — the model dashboard's single completion meter (it
 * absorbed the old GettingStartedChecklist, 2026-07-22).
 * Score + checklist are computed server-side (src/lib/casting-readiness.ts)
 * and passed in as props; this component renders and handles the
 * copy-link / self-attest / collapse interactions.
 *
 * "I've added my link" self-attests the link_live step via
 * POST /api/model/readiness (service-role write to models.link_attested_at —
 * never a session-client model write) and marks it done optimistically.
 *
 * Copy constraint: upcoming shows are NOT announced — never name an event.
 */
export function CastingReadiness({
  score,
  items,
  username,
}: {
  score: number;
  items: ReadinessItem[];
  username: string;
}) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [linkAttested, setLinkAttested] = useState(false);
  const [attesting, setAttesting] = useState(false);

  // Respect a previously chosen collapsed state (declutter convention:
  // persistent cards must be dismissible to a one-line summary).
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      } catch {}
      return !prev;
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`examodels.com/${username}`);
      toast.success("Link copied — add it to your bio");
    } catch {
      toast.error("Couldn't copy — your link is examodels.com/" + username);
    }
  };

  // Self-attest fallback for the link step: persists server-side so it
  // survives reloads and devices; real referrer traffic later supersedes
  // it in copy ("verified" vs "marked done").
  const attestLink = async () => {
    if (attesting) return;
    setAttesting(true);
    try {
      const res = await fetch("/api/model/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "link_attested" }),
      });
      if (!res.ok) throw new Error("attest failed");
      setLinkAttested(true);
      toast.success("Marked done — nice work getting your link out there");
      // Reconcile with the server-computed items/copy/score (the optimistic
      // flip below is deliberately minimal).
      router.refresh();
    } catch {
      toast.error("Couldn't save that — try again in a moment");
    } finally {
      setAttesting(false);
    }
  };

  // Optimistic view: once attested this session, the link step reads done
  // and the score bumps by its weight — router.refresh() above then swaps in
  // the server-computed items/copy/score.
  const linkItem = items.find((i) => i.key === "link_live");
  const optimisticLinkDone = linkAttested && linkItem && !linkItem.done;
  const displayItems = optimisticLinkDone
    ? items.map((i) =>
        i.key === "link_live" ? { ...i, done: true, detail: "Marked done" } : i
      )
    : items;
  const displayScore = optimisticLinkDone ? score + linkItem.weight : score;

  const doneCount = displayItems.filter((i) => i.done).length;
  // Absorbed from the old GettingStartedChecklist: the amber "not visible"
  // warning must stay visible (even collapsed) until a profile photo exists.
  const photoMissing = displayItems.some((i) => i.key === "photo" && !i.done);

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-transparent overflow-hidden shadow-[0_0_24px_rgba(139,92,246,0.12)]">
      <header className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">
              Runway Ready —{" "}
              <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                {displayScore}%
              </span>
            </h2>
          </div>
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors shrink-0 mt-1"
            aria-expanded={!collapsed}
          >
            <span className="font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {doneCount}/{displayItems.length}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`}
            />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-violet-500 shadow-[0_0_12px_rgba(236,72,153,0.6)] transition-all"
            style={{ width: `${Math.max(displayScore, 3)}%` }}
          />
        </div>

        {/* Blocking state — outlives collapse so an invisible model always
            sees why (absorbed from the old GettingStartedChecklist) */}
        {photoMissing && (
          <Link
            href="/settings"
            className="mt-4 flex items-center gap-2 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-amber-300 hover:bg-amber-500/15 transition-colors"
          >
            <EyeOff className="h-4 w-4 shrink-0" />
            <span>
              You&apos;re not visible on EXA yet — add a profile photo to appear
              on the Models page.
            </span>
          </Link>
        )}
        {collapsed && <div className="h-5" />}
      </header>

      {!collapsed && (
        <div className="p-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayItems.map((item) => (
            <div
              key={item.key}
              className={`flex items-start gap-3 p-3 rounded-xl border ${
                item.done
                  ? "border-teal-500/20 bg-teal-500/5"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              {item.done ? (
                <CheckCircle2 className="h-5 w-5 text-teal-400 shrink-0 mt-0.5" />
              ) : (
                <ArrowRight className="h-5 w-5 text-pink-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-semibold ${
                    item.done ? "text-white/50" : "text-white"
                  }`}
                >
                  {item.label}
                </p>
                {item.detail && (
                  <p className={`text-xs mt-0.5 ${item.done ? "text-white/40" : "text-white/60"}`}>
                    {item.detail}
                  </p>
                )}
                {!item.done && (item.key === "link_live" || item.key === "fans_brought") && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <button
                      onClick={copyLink}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy your link
                    </button>
                    <button
                      onClick={attestLink}
                      disabled={attesting}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      I&apos;ve added my link
                    </button>
                  </div>
                )}
                {!item.done && item.cta && (
                  <Link
                    href={item.cta.href}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    {item.cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
