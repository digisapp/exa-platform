import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Reset modules and env before each test
beforeEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("logger", () => {
  it("logs debug in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "debug").mockImplementation(() => {});

    // Fresh import to pick up env
    const { logger } = await import("../logger");
    logger.debug("test debug message");

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("DEBUG: test debug message");
  });

  it("includes context in output", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { logger } = await import("../logger");
    logger.info("with context", { userId: "123", action: "test" });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain("INFO: with context");
    expect(output).toContain('"userId":"123"');
    expect(output).toContain('"action":"test"');
  });

  it("error includes Error object details", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { logger } = await import("../logger");
    const testError = new Error("something broke");
    logger.error("failure", testError, { route: "/api/test" });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain("ERROR: failure");
    expect(output).toContain("something broke");
    expect(output).toContain("/api/test");
  });

  it("error handles non-Error objects", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { logger } = await import("../logger");
    logger.error("failure", { code: "DB_ERROR" });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0];
    expect(output).toContain("ERROR: failure");
    expect(output).toContain("DB_ERROR");
  });

  it("warn outputs at warn level", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "warn");
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { logger } = await import("../logger");
    logger.warn("something concerning", { detail: "x" });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("WARN: something concerning");
  });

  it("includes ISO timestamp in output", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "debug");
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { logger } = await import("../logger");
    logger.info("timestamp test");

    const output = spy.mock.calls[0][0];
    // Should contain ISO date format like [2026-04-15T...]
    expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/);
  });
});
