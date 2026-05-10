/**
 * Structured Logger
 * Provides consistent logging with levels, context, and production-safe output.
 * In production, debug/info logs are suppressed unless LOG_LEVEL is set.
 *
 * When SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is configured, error- and warn-level
 * calls also forward to Sentry. The Sentry SDK no-ops gracefully if no DSN is
 * set, so this code is safe to ship before the Sentry project exists.
 */

import * as Sentry from "@sentry/nextjs";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "warn" : "debug");

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatMessage(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>
): string {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  if (context && Object.keys(context).length > 0) {
    return `${base} ${JSON.stringify(context)}`;
  }
  return base;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog("debug")) {
      console.debug(formatMessage("debug", message, context));
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog("info")) {
      console.info(formatMessage("info", message, context));
    }
  },

  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog("warn")) {
      console.warn(formatMessage("warn", message, context));
    }
    Sentry.captureMessage(message, {
      level: "warning",
      extra: context,
    });
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    if (shouldLog("error")) {
      const errorContext: Record<string, unknown> = { ...context };
      if (error instanceof Error) {
        errorContext.errorMessage = error.message;
        errorContext.stack = error.stack;
      } else if (error !== undefined) {
        errorContext.error = error;
      }
      console.error(formatMessage("error", message, errorContext));
    }

    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: { message, ...context },
      });
    } else {
      Sentry.captureMessage(message, {
        level: "error",
        extra: { error, ...context },
      });
    }
  },
};
