"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PhoneCall, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvailabilityToggleProps {
  initialAvailable: boolean;
  /** Compact pill (dashboard identity header) vs full row (settings) */
  variant?: "pill" | "row";
}

// "Available for calls" switch. Writes ONLY via /api/model/availability
// (service-role route) — never the session client, and never part of the
// settings bulk save. Optimistic flip with revert on failure.
export function AvailabilityToggle({
  initialAvailable,
  variant = "pill",
}: AvailabilityToggleProps) {
  const [available, setAvailable] = useState(initialAvailable);
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    if (saving) return;
    const next = !available;
    setAvailable(next); // optimistic
    setSaving(true);
    try {
      const res = await fetch("/api/model/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update availability");
      }
      toast.success(
        next
          ? "You're available for calls — fans can ring you even when you're off EXA."
          : "Call availability off — fans can call only while you're online."
      );
    } catch (err) {
      setAvailable(!next); // revert
      toast.error(err instanceof Error ? err.message : "Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  const knob = (
    <span
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-200",
        available
          ? "bg-emerald-400/90 shadow-[0_0_10px_rgba(52,211,153,0.6)]"
          : "bg-white/15"
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 rounded-full bg-white transition-transform duration-200",
          available ? "translate-x-[14px]" : "translate-x-0.5"
        )}
      />
    </span>
  );

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={saving}
        aria-pressed={available}
        className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-70"
      >
        <span className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
              available
                ? "bg-emerald-500/20 border border-emerald-400/50 shadow-[0_0_14px_rgba(52,211,153,0.35)]"
                : "bg-white/5 border border-white/10"
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin text-white/60" />
            ) : (
              <PhoneCall
                className={cn("h-4 w-4", available ? "text-emerald-300" : "text-white/40")}
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">
              Available for calls
            </span>
            <span className="block text-xs text-muted-foreground">
              {available
                ? "Fans can call you even when you're not on EXA — you'll be pinged to hop on."
                : "Fans can only call you while you're active on EXA."}
            </span>
          </span>
        </span>
        {knob}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving}
      aria-pressed={available}
      title={
        available
          ? "Fans can call you even when you're off EXA"
          : "Turn on so fans can call you even when you're off EXA"
      }
      className={cn(
        "inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all active:scale-95 disabled:opacity-70",
        available
          ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.3)]"
          : "border-white/15 bg-white/5 text-white/55 hover:border-emerald-400/40 hover:text-white/80"
      )}
    >
      {saving ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <PhoneCall className="h-3 w-3" />
      )}
      Available for calls
      {knob}
    </button>
  );
}
