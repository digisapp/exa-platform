"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, BellRing, BellOff, ShieldAlert } from "lucide-react";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { trackEvent } from "@/lib/analytics-client";
import {
  getPushDeviceState,
  isIos,
  subscribeToPush,
  unsubscribeFromPush,
  type PushDeviceState,
} from "@/lib/push-client";

// Master push enable/disable control for THIS device (Settings → Privacy).
//
// NEVER auto-prompts: the permission request only ever fires from the button
// tap below (browsers punish load-time prompts with auto-denial).
//
// States handled:
// - needs-install  → iOS Safari tab: A2HS instructions (InstallPrompt), no dead button
// - unsupported    → muted one-liner (no dead button)
// - denied         → how-to-unblock instructions
// - subscribed     → "on for this device" + turn-off
// - ready          → the enable button

export function PushOptIn({ onSubscribed }: { onSubscribed?: () => void }) {
  const [state, setState] = useState<PushDeviceState | "loading">("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushDeviceState().then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    const result = await subscribeToPush();
    setBusy(false);
    if (result.ok) {
      trackEvent("push_subscribed", { metadata: { source: "settings" } });
      setState("subscribed");
      onSubscribed?.();
      toast.success("Push notifications are on for this device");
    } else if (result.reason === "denied") {
      trackEvent("push_denied", { metadata: { source: "settings" } });
      setState("denied");
    } else {
      toast.error("Couldn't enable push notifications — please try again");
    }
  };

  const disable = async () => {
    setBusy(true);
    const ok = await unsubscribeFromPush();
    setBusy(false);
    if (ok) {
      setState("ready");
      toast.success("Push notifications are off for this device");
    } else {
      toast.error("Couldn't turn off push — please try again");
    }
  };

  if (state === "loading") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking this device…
      </div>
    );
  }

  if (state === "needs-install") {
    return <InstallPrompt ios={isIos()} />;
  }

  if (state === "unsupported") {
    // No dead button for browsers without the Push API — the per-event
    // toggles below still work (they apply to the model's other devices).
    return (
      <p className="text-sm text-muted-foreground">
        This browser doesn&apos;t support push notifications. Your settings
        below still apply to devices where push is turned on.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
        <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-200/90">
          Notifications are blocked for EXA in this browser. To unblock: open
          your browser&apos;s site settings for examodels.com (usually the lock
          icon next to the address bar), set Notifications to Allow, then come
          back here.
        </p>
      </div>
    );
  }

  if (state === "subscribed") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <BellRing className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-200/90 truncate">
            Push is on for this device
          </p>
        </div>
        <button
          onClick={disable}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <BellOff className="h-3.5 w-3.5" />
          )}
          Turn off
        </button>
      </div>
    );
  }

  // state === "ready"
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        Turn on push for this device to get pinged the moment something
        happens.
      </p>
      <button
        onClick={enable}
        disabled={busy}
        className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-[0_0_14px_rgba(167,139,250,0.35)] disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        Enable push notifications
      </button>
    </div>
  );
}
