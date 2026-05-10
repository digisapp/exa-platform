/**
 * Sentry Node SDK initialization (App Router server runtime).
 *
 * Loaded by instrumentation.ts. Reads DSN from SENTRY_DSN. Errors logged via
 * src/lib/logger.ts forward here automatically.
 */

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,

    // Error tracking only.
    tracesSampleRate: 0,
  });
}
