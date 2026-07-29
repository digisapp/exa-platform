"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BellRing, Loader2, Smartphone, X } from "lucide-react";
import { useNudgeSlot, useNudgeSnooze } from "@/components/dashboard/NudgeSlot";
import { getPushSupport, subscribeToPush } from "@/lib/push-client";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { trackEvent } from "@/lib/analytics-client";

/**
 * Push nudge — "hear about tips, sales, and messages even with the tab
 * closed". Mounted for EVERY model on the dashboard (launch prep: the first
 * dashboard visit after approval is the highest-motivation moment to ask —
 * gating on earnings meant new models never saw it).
 *
 * Two modes, resolved client-side before claiming the NudgeSlot:
 * - "push": Push API available here → permission button. Requires
 *   Notification.permission === "default" (granted → already decided;
 *   denied → we don't re-nudge people who said no — the settings section
 *   owns the unblock instructions) + not snoozed.
 * - "a2hs": iOS Safari tab, where only the installed PWA can subscribe →
 *   Add-to-Home-Screen row that expands into InstallPrompt's steps.
 *   Separate snooze key so a model who dismissed the permission ask on
 *   desktop still hears about the iPhone install path (and vice versa).
 *
 * Funnel analytics: push_nudge_shown (metadata.mode) on impression,
 * push_subscribed / push_denied on the permission outcome — opt-in rate =
 * subscribed / shown, reported per mode.
 *
 * Renders inside <NudgeSlot> AFTER PayoutSetupPrompt — payout wins when both
 * are eligible (at most one nudge per page view).
 */

const DISMISS_KEY = "exa_push_nudge_dismissed_at";
const A2HS_DISMISS_KEY = "exa_a2hs_nudge_dismissed_at";

export function PushNudgeCard({ modelId }: { modelId?: string }) {
  // Start hidden until the client checks run so SSR/CSR markup match
  const [mode, setMode] = useState<"push" | "a2hs" | null>(null);
  const [busy, setBusy] = useState(false);
  const [showInstallSteps, setShowInstallSteps] = useState(false);
  const claim = useNudgeSlot("push");
  const { snoozed: pushSnoozed, dismiss: pushDismiss } =
    useNudgeSnooze(DISMISS_KEY);
  const { snoozed: a2hsSnoozed, dismiss: a2hsDismiss } =
    useNudgeSnooze(A2HS_DISMISS_KEY);

  useEffect(() => {
    const support = getPushSupport();
    if (support === "supported") {
      // Notification is guaranteed present when support === "supported"
      if (Notification.permission !== "default") return;
      if (pushSnoozed()) return;
      if (claim()) {
        setMode("push");
        trackEvent("push_nudge_shown", { modelId, metadata: { mode: "push" } });
      }
    } else if (support === "needs-install") {
      if (a2hsSnoozed()) return;
      if (claim()) {
        setMode("a2hs");
        trackEvent("push_nudge_shown", { modelId, metadata: { mode: "a2hs" } });
      }
    }
  }, [claim, pushSnoozed, a2hsSnoozed, modelId]);

  const dismiss = () => {
    (mode === "a2hs" ? a2hsDismiss : pushDismiss)();
    setMode(null);
  };

  const enable = async () => {
    setBusy(true);
    const result = await subscribeToPush();
    setBusy(false);
    if (result.ok) {
      trackEvent("push_subscribed", {
        modelId,
        metadata: { source: "dashboard_nudge" },
      });
      setMode(null);
      toast.success("Push is on — you'll get pinged when you earn");
    } else if (result.reason === "denied") {
      trackEvent("push_denied", {
        modelId,
        metadata: { source: "dashboard_nudge" },
      });
      setMode(null);
      toast.error(
        "Notifications are blocked in your browser — you can unblock them from Settings"
      );
    } else {
      toast.error("Couldn't turn on push — try again from Settings");
    }
  };

  if (mode === null) return null;

  if (mode === "a2hs") {
    return (
      <section className="rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 via-fuchsia-500/[0.06] to-transparent px-4 py-3 shadow-[0_0_16px_rgba(167,139,250,0.12)] space-y-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-9 h-9 rounded-full bg-violet-500/15 ring-1 ring-violet-500/30 flex items-center justify-center">
            <Smartphone className="h-4 w-4 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              Get pings on your iPhone
            </p>
            <p className="text-xs text-white/60 truncate">
              Install EXA to your home screen to hear about tips and messages
            </p>
          </div>
          {!showInstallSteps && (
            <button
              onClick={() => setShowInstallSteps(true)}
              className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-[0_0_12px_rgba(167,139,250,0.35)]"
            >
              Show me how
            </button>
          )}
          <button
            onClick={dismiss}
            aria-label="Dismiss install reminder"
            className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {showInstallSteps && <InstallPrompt ios />}
      </section>
    );
  }

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
