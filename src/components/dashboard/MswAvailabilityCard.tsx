"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Loader2, CalendarCheck } from "lucide-react";

const MSW_DAYS = [
  { date: "2026-05-26", label: "Mon", full: "May 26" },
  { date: "2026-05-27", label: "Tue", full: "May 27" },
  { date: "2026-05-28", label: "Wed", full: "May 28" },
  { date: "2026-05-29", label: "Thu", full: "May 29" },
  { date: "2026-05-30", label: "Fri", full: "May 30" },
  { date: "2026-05-31", label: "Sat", full: "May 31" },
];

export function MswAvailabilityCard({ gigId }: { gigId: string }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/gig-availability?gig_id=${gigId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dates) {
          setSelected(new Set(data.dates));
          if (data.dates.length > 0) setSaved(true);
        }
      })
      .finally(() => setLoading(false));
  }, [gigId]);

  function toggle(date: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/gig-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gig_id: gigId, dates: Array.from(selected) }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      toast.success("Availability saved");
    } else {
      toast.error("Failed to save — please try again");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-white/20" />
        <span className="text-sm text-white/30">Loading availability…</span>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-pink-500/20 bg-pink-500/[0.04] shadow-[inset_0_0_40px_rgba(236,72,153,0.04)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-pink-500/15 border border-pink-500/25 flex items-center justify-center shrink-0">
            <CalendarCheck className="h-4 w-4 text-pink-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90 uppercase tracking-wide">Miami Swim Week</p>
            <p className="text-[11px] text-white/35 mt-0.5">Select the days you&apos;re available — May 26–31, 2026</p>
          </div>
        </div>
        {saved && selected.size > 0 && (
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-emerald-400 font-semibold shrink-0">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </div>

      {/* Day toggles */}
      <div className="grid grid-cols-6 gap-2">
        {MSW_DAYS.map(({ date, label, full }) => {
          const on = selected.has(date);
          return (
            <button
              key={date}
              onClick={() => toggle(date)}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-center transition-all duration-150 ${
                on
                  ? "border-pink-500/60 bg-pink-500/15 shadow-[0_0_16px_rgba(236,72,153,0.2)]"
                  : "border-white/[0.07] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <span className={`text-[10px] uppercase tracking-widest font-semibold ${on ? "text-pink-300" : "text-white/30"}`}>
                {label}
              </span>
              <span className={`text-xs font-bold tabular-nums ${on ? "text-white/90" : "text-white/40"}`}>
                {full.split(" ")[1]}
              </span>
              {on && (
                <span className="h-1.5 w-1.5 rounded-full bg-pink-400 shadow-[0_0_6px_rgba(236,72,153,0.7)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-white/25">
          {selected.size === 0
            ? "No days selected"
            : `${selected.size} day${selected.size !== 1 ? "s" : ""} selected`}
        </p>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-400 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(236,72,153,0.3)]"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {saving ? "Saving…" : "Save Availability"}
        </button>
      </div>
    </div>
  );
}
