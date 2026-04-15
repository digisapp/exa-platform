/**
 * Centralized API Error Handler
 * Standardizes error responses and logging across all API routes.
 */

import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Wraps a caught error into a standardized API response.
 * Logs the error server-side with context, returns a safe message to the client.
 */
export function handleApiError(
  error: unknown,
  publicMessage: string,
  context?: Record<string, unknown>
) {
  logger.error(publicMessage, error, context);
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}
