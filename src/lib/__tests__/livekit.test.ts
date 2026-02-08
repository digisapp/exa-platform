import { describe, it, expect, vi } from "vitest";

// Mock the livekit-server-sdk to avoid module-level env var check
vi.mock("livekit-server-sdk", () => ({
  AccessToken: vi.fn(),
}));

// Set env vars before importing the module
vi.stubEnv("LIVEKIT_API_KEY", "test-api-key");
vi.stubEnv("LIVEKIT_API_SECRET", "test-api-secret");

const { calculateCallCost, generateRoomName } = await import("../livekit");

describe("calculateCallCost", () => {
  it("returns 0 for zero duration", () => {
    expect(calculateCallCost(0, 10)).toBe(0);
  });

  it("returns 0 for zero rate", () => {
    expect(calculateCallCost(60, 0)).toBe(0);
  });

  it("returns 0 for negative duration", () => {
    expect(calculateCallCost(-10, 10)).toBe(0);
  });

  it("returns 0 for negative rate", () => {
    expect(calculateCallCost(60, -5)).toBe(0);
  });

  it("rounds up 30s to 1 minute", () => {
    expect(calculateCallCost(30, 10)).toBe(10);
  });

  it("charges exactly 1 minute for 60s", () => {
    expect(calculateCallCost(60, 10)).toBe(10);
  });

  it("rounds up 61s to 2 minutes", () => {
    expect(calculateCallCost(61, 10)).toBe(20);
  });

  it("handles large duration", () => {
    // 600s = 10 minutes
    expect(calculateCallCost(600, 5)).toBe(50);
  });

  it("charges minimum 1 minute for any positive duration", () => {
    expect(calculateCallCost(1, 10)).toBe(10);
  });
});

describe("generateRoomName", () => {
  it("returns a string", () => {
    expect(typeof generateRoomName()).toBe("string");
  });

  it("starts with 'exa-call-'", () => {
    expect(generateRoomName()).toMatch(/^exa-call-/);
  });

  it("generates unique names across calls", () => {
    const names = new Set(Array.from({ length: 100 }, () => generateRoomName()));
    expect(names.size).toBe(100);
  });
});
