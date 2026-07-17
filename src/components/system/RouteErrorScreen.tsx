"use client";

import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, Loader2 } from "lucide-react";
import Link from "next/link";
import { isStaleBuildError, reloadOnceForStaleBuild } from "@/lib/stale-build";

interface RouteErrorScreenProps {
  error: Error & { digest?: string };
  reset: () => void;
  /** Prefix for the console.error line, e.g. "Dashboard error" */
  logLabel: string;
  title: string;
  description: string;
  homeHref: string;
  homeLabel: string;
}

/**
 * Shared body for route-group error.tsx boundaries. Stale-build errors
 * (chunk 404s after a deploy) auto-reload once and show a quiet updating
 * state; real errors are reported to Sentry and show the error screen.
 */
export function RouteErrorScreen({
  error,
  reset,
  logLabel,
  title,
  description,
  homeHref,
  homeLabel,
}: RouteErrorScreenProps) {
  const stale = isStaleBuildError(error);
  const [reloading, setReloading] = useState(false);

  useEffect(() => {
    console.error(`${logLabel}:`, error);
    if (stale) {
      if (reloadOnceForStaleBuild()) setReloading(true);
      return;
    }
    Sentry.captureException(error);
  }, [error, stale, logLabel]);

  if (reloading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-violet-400 mb-4" />
        <p className="text-muted-foreground">Updating to the latest version…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3 justify-center">
          <Button
            onClick={stale ? () => window.location.reload() : reset}
            variant="outline"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild>
            <Link href={homeHref}>
              <Home className="mr-2 h-4 w-4" />
              {homeLabel}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
