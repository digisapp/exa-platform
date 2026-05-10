/**
 * Sentry browser SDK initialization.
 *
 * Loaded by Next.js automatically on every client page. Reads DSN from
 * NEXT_PUBLIC_SENTRY_DSN. If the DSN is unset (e.g. in dev or in CI builds
 * before the project is wired up), the SDK no-ops gracefully — no events sent.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

    // Error tracking only — no performance traces / replays. Add these later
    // by setting tracesSampleRate / replaysSessionSampleRate when ready to
    // accept the cost.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // Drop noisy/expected errors before sending.
    ignoreErrors: [
      // Browser extensions, network failures the user actually saw, etc.
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      // Common network blips
      /NetworkError/i,
      /Failed to fetch/i,
      /Load failed/i,
    ],
  });
}
