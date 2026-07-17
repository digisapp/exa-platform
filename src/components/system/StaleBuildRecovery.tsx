"use client";

import { useEffect } from "react";
import { isStaleBuildError, reloadOnceForStaleBuild } from "@/lib/stale-build";

/**
 * Catches stale-build chunk failures that never reach a React error boundary
 * (dynamic imports kicked off from event handlers, router prefetches) and
 * recovers with a single reload. Mounted once in the root layout.
 */
export function StaleBuildRecovery() {
  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isStaleBuildError(event.reason)) {
        event.preventDefault();
        reloadOnceForStaleBuild();
      }
    };
    const onError = (event: ErrorEvent) => {
      if (isStaleBuildError(event.error ?? event.message)) {
        reloadOnceForStaleBuild();
      }
    };
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return null;
}
