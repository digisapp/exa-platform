import { describe, it, expect, beforeEach } from "vitest";
import { getClientIP, EndpointLimits } from "../rate-limit";

// We can't easily import inMemoryRateLimit since it's not exported.
// We'll test it indirectly through rateLimitAsync (which falls back to in-memory
// when Redis is not configured).

describe("getClientIP", () => {
  function makeRequest(headers: Record<string, string>): Request {
    return new Request("https://example.com", {
      headers: new Headers(headers),
    });
  }

  it("extracts IP from x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4" });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("takes first IP from x-forwarded-for with multiple IPs", () => {
    const req = makeRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("extracts IP from cf-connecting-ip", () => {
    const req = makeRequest({ "cf-connecting-ip": "10.0.0.1" });
    expect(getClientIP(req)).toBe("10.0.0.1");
  });

  it("extracts IP from x-real-ip", () => {
    const req = makeRequest({ "x-real-ip": "172.16.0.1" });
    expect(getClientIP(req)).toBe("172.16.0.1");
  });

  it("returns 'unknown' when no headers present", () => {
    const req = makeRequest({});
    expect(getClientIP(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over cf-connecting-ip", () => {
    const req = makeRequest({
      "x-forwarded-for": "1.1.1.1",
      "cf-connecting-ip": "2.2.2.2",
    });
    expect(getClientIP(req)).toBe("1.1.1.1");
  });

  it("trims whitespace from x-forwarded-for", () => {
    const req = makeRequest({ "x-forwarded-for": "  1.2.3.4  " });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });
});

describe("rateLimitAsync (in-memory fallback)", () => {
  // Import dynamically to get the in-memory path (no Redis env vars set)
  let rateLimitAsync: typeof import("../rate-limit").rateLimitAsync;

  beforeEach(async () => {
    // Re-import to get fresh module
    const mod = await import("../rate-limit");
    rateLimitAsync = mod.rateLimitAsync;
  });

  it("allows requests within limit", async () => {
    const id = `test-allow-${Date.now()}-${Math.random()}`;
    const result = await rateLimitAsync(id, { limit: 5, windowSeconds: 60 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("blocks after exceeding limit", async () => {
    const id = `test-block-${Date.now()}-${Math.random()}`;
    const opts = { limit: 3, windowSeconds: 60 };

    await rateLimitAsync(id, opts); // 1
    await rateLimitAsync(id, opts); // 2
    await rateLimitAsync(id, opts); // 3

    const result = await rateLimitAsync(id, opts); // 4 - should fail
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("different identifiers are independent", async () => {
    const id1 = `test-ind-a-${Date.now()}-${Math.random()}`;
    const id2 = `test-ind-b-${Date.now()}-${Math.random()}`;
    const opts = { limit: 1, windowSeconds: 60 };

    await rateLimitAsync(id1, opts);
    const result = await rateLimitAsync(id2, opts);
    expect(result.success).toBe(true);
  });

  it("window resets after expiry", async () => {
    const id = `test-reset-${Date.now()}-${Math.random()}`;
    // Use a very short window
    const opts = { limit: 1, windowSeconds: 1 };

    await rateLimitAsync(id, opts); // use the 1 allowed request
    const blocked = await rateLimitAsync(id, opts);
    expect(blocked.success).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 1100));

    const after = await rateLimitAsync(id, opts);
    expect(after.success).toBe(true);
  });
});

describe("EndpointLimits constants", () => {
  it("financial is strictest (10/min)", () => {
    expect(EndpointLimits.financial.limit).toBe(10);
    expect(EndpointLimits.financial.windowSeconds).toBe(60);
  });

  it("general is highest (200/min)", () => {
    expect(EndpointLimits.general.limit).toBe(200);
    expect(EndpointLimits.general.windowSeconds).toBe(60);
  });

  it("auth is strict (10/min)", () => {
    expect(EndpointLimits.auth.limit).toBe(10);
  });

  it("all limits have positive values", () => {
    for (const [, config] of Object.entries(EndpointLimits)) {
      expect(config.limit).toBeGreaterThan(0);
      expect(config.windowSeconds).toBeGreaterThan(0);
    }
  });
});
