/**
 * Next.js instrumentation entry point — runs once at server start in each
 * runtime. Wires Sentry to the appropriate runtime config and registers a
 * global request error capture so unhandled errors in route handlers,
 * server components, and server actions all flow to Sentry.
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
