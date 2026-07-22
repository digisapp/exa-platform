"use client";

import { useEffect, useState } from "react";
import { Share, PlusSquare, Download } from "lucide-react";

// Install-the-PWA prompt, shown where push opt-in needs an installed app.
//
// iOS Safari only allows web push for an INSTALLED PWA (manifest.json already
// ships display:standalone + maskable icons), so on iOS in a regular tab we
// show Add-to-Home-Screen steps instead of a dead permission button.
//
// Android/desktop Chrome: best-effort capture of `beforeinstallprompt` — if
// the browser offers it we render an Install button; if not (already
// installed, unsupported, or Chrome just didn't fire it) we render nothing.
// The event is inconsistent by design; treat it as a bonus, never a gate.

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt({ ios }: { ios: boolean }) {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (ios) return; // iOS never fires beforeinstallprompt
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [ios]);

  if (ios) {
    return (
      <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/[0.06] to-transparent p-4 space-y-3">
        <p className="text-sm font-semibold text-white">
          Install EXA to get notifications on iPhone
        </p>
        <ol className="space-y-2 text-sm text-white/70">
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            Tap the <Share className="inline h-4 w-4 text-violet-300" /> Share
            button in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            Choose{" "}
            <span className="inline-flex items-center gap-1 font-medium text-white">
              <PlusSquare className="h-4 w-4 text-violet-300" /> Add to Home
              Screen
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            Open EXA from your home screen and turn on notifications here
          </li>
        </ol>
      </div>
    );
  }

  if (!installEvent) return null;

  return (
    <button
      onClick={() => {
        installEvent.prompt().catch(() => {});
        setInstallEvent(null);
      }}
      className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400 transition-all shadow-[0_0_14px_rgba(167,139,250,0.35)]"
    >
      <Download className="h-4 w-4" />
      Install the EXA app
    </button>
  );
}
