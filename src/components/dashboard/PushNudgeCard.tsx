"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, Loader2, X } from "lucide-react";
import { useNudgeSlot, useNudgeSnooze } from "@/components/dashboard/NudgeSlot";
import { getPushSupport, subscribeToPush } from "@/lib/push-client";

/**
 * Push nudge — "you're earning; hear about it even with the tab closed".
 *
 * The dashboard RSC only mounts this for models with money on the books
 * (earned this month OR live coin balance — both already computed there).
 * Client-side it additionally requires, before claiming the NudgeSlot:
 *   1. Push supported in THIS context (hides on iOS Safari tabs, where only
 *      the installed PWA can subscribe — no dead button; Settings → Privacy
 *      carries the install instructions),
 *   2. Notification.permission === "default" (granted → already decided;
 *      denied → we don't re-nudge people who said no — the settings section
 *      owns the unblock instructions),
 *   3. not snoozed (localStorage, re-eligible after 14 days).
 *
 * Renders inside <NudgeSlot> AFTER PayoutSetupPrompt — payout wins when both
 * are eligible (at most one nudge per page view).
 */

const DISMISS_KEY = "exa_push_nudge_dismissed_at";

export function PushNudgeCard() {
  // Start hidden until the client checks run so SSR/CSR markup match
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const claim = useNudgeSlot("push");
  const { snoozed, dismiss: snooze } = useNudgeSnooze(DISMISS_KEY);

  useEffect(() => {
    if (getPushSupport() !== "supported") return;
    if (Notification.permission !== "default") return;
    if (snoozed()) return;
    if (claim()) setVisible(true);
  }, [claim, snoozed]);

  const dismiss = () => {
    setVisible(false);
    snooze();
  };

  const enable = async () => {
    setBusy(true);
    const result = await subscribeToPush();
    setBusy(false);
    if (result.ok) {
      setVisible(false);
      toast.success("Push is on — you'll get pinged when you earn");
    } else if (result.reason === "denied") {
      setVisible(false);
      toast.error(
        "Notifications are blocked in your browser — you can unblock them from Settings"
      );
    } else {
      toast.error("Couldn't turn on push — try again from Settings");
    }
  };

  if (!visible) return null;

  return (
    <section className="flex items-center gap-3 rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/[0.06] to-transparent px-4 py-3 shadow-[0_0_16px_rgba(167,139,250,0.12)]">
      <div className="shrink-0 w-9 h-9 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center">
        <BellRing className="h-4 w-4 text-violet-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          Never miss a tip
        </p>
        <p className="text-xs text-white/60 truncate">
          Get a ping for tips, sales, and messages — even when EXA is closed
        </p>
      </div>
      <button
        onClick={enable}
        disabled={busy}
        className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-[0_0_12px_rgba(167,139,250,0.35)] disabled:opacity-50"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Turn on
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss notification reminder"
        className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}
