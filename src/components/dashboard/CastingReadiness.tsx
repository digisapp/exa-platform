"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Copy,
  Sparkles,
} from "lucide-react";
import type { ReadinessItem } from "@/lib/casting-readiness";

const COLLAPSE_KEY = "exa_runway_ready_collapsed";

/**
 * "Runway Ready" — casting readiness meter for the model dashboard.
 * Score + checklist are computed server-side (src/lib/casting-readiness.ts)
 * and passed in as props; this component only renders and handles the
 * copy-link / collapse interactions.
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
  const [collapsed, setCollapsed] = useState(false);

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

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="rounded-2xl border border-violet-500/30 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-transparent overflow-hidden shadow-[0_0_24px_rgba(139,92,246,0.12)]">
      <header className="p-5 pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-violet-300/80 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Casting considers your EXA presence
            </p>
            <h2 className="text-base font-semibold mt-1">
              Runway Ready —{" "}
              <span className="bg-gradient-to-r from-pink-400 to-violet-400 bg-clip-text text-transparent">
                {score}%
              </span>
            </h2>
          </div>
          <button
            onClick={toggleCollapsed}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition-colors shrink-0 mt-1"
            aria-expanded={!collapsed}
          >
            <span className="font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
              {doneCount}/{items.length}
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
            style={{ width: `${Math.max(score, 3)}%` }}
          />
        </div>
        {collapsed && <div className="h-5" />}
      </header>

      {!collapsed && (
        <div className="p-3 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {items.map((item) => (
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
                  <button
                    onClick={copyLink}
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy your link
                  </button>
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
