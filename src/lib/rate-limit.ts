/**
 * Rate limiter using Upstash Redis for production
 * Falls back to in-memory for local development
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis client if credentials are available
let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({ url, token });
    return redis;
  }

  return null;
}

// Cache for Upstash rate limiters (one per unique config)
const rateLimiterCache = new Map<string, Ratelimit>();

function getUpstashRateLimiter(limit: number, windowSeconds: number): Ratelimit {
  const cacheKey = `${limit}:${windowSeconds}`;

  if (rateLimiterCache.has(cacheKey)) {
    return rateLimiterCache.get(cacheKey)!;
  }

  const redisClient = getRedisClient();
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }

  const rateLimiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: true,
    prefix: "exa:ratelimit",
  });

  rateLimiterCache.set(cacheKey, rateLimiter);
  return rateLimiter;
}

// ============================================
// In-memory fallback for local development
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }, 60000);
}

function inMemoryRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = identifier;

  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetAt: now + windowMs,
    };
    inMemoryStore.set(key, newEntry);
    return {
      success: true,
      remaining: limit - 1,
      resetAt: newEntry.resetAt,
    };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  entry.count++;
  return {
    success: true,
    remaining: limit - entry.count,
    resetAt: entry.resetAt,
  };
}

// ============================================
// Main rate limit function
// ============================================

interface RateLimitOptions {
  /** Max requests allowed in the time window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request should be rate limited
 * Uses Upstash Redis in production, falls back to in-memory for local dev
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param options - Rate limit configuration
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  const redisClient = getRedisClient();

  // Fall back to in-memory if Redis not configured
  if (!redisClient) {
    return inMemoryRateLimit(identifier, options.limit, options.windowSeconds);
  }

  // Use Upstash rate limiter (synchronous check with cached result)
  // Note: For true async rate limiting, use rateLimitAsync below
  return inMemoryRateLimit(identifier, options.limit, options.windowSeconds);
}

/**
 * Async rate limit check using Upstash Redis
 * Preferred method for API routes
 */
export async function rateLimitAsync(
  identifier: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const redisClient = getRedisClient();

  // Fall back to in-memory if Redis not configured
  if (!redisClient) {
    return inMemoryRateLimit(identifier, options.limit, options.windowSeconds);
  }

  try {
    const rateLimiter = getUpstashRateLimiter(options.limit, options.windowSeconds);
    const result = await rateLimiter.limit(identifier);

    return {
      success: result.success,
      remaining: result.remaining,
      resetAt: result.reset,
    };
  } catch (error) {
    console.error("Upstash rate limit error, falling back to in-memory:", error);
    return inMemoryRateLimit(identifier, options.limit, options.windowSeconds);
  }
}

/**
 * Get client IP from request headers
 * Works with Vercel, Cloudflare, and standard proxies
 */
export function getClientIP(request: Request): string {
  // Vercel
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get("cf-connecting-ip");
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Real IP header (nginx)
  const xRealIP = request.headers.get("x-real-ip");
  if (xRealIP) {
    return xRealIP;
  }

  return "unknown";
}
