import { describe, it, expect, vi } from "vitest";
import { apiError, handleApiError } from "../api-error";

// Mock the logger to avoid console output in tests
vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("apiError", () => {
  it("returns JSON response with error message", async () => {
    const response = apiError("Not found", 404);
    const body = await response.json();
    expect(body).toEqual({ error: "Not found" });
    expect(response.status).toBe(404);
  });

  it("defaults to 500 status", async () => {
    const response = apiError("Something went wrong");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: "Something went wrong" });
  });

  it("supports all HTTP error statuses", async () => {
    expect(apiError("Bad request", 400).status).toBe(400);
    expect(apiError("Unauthorized", 401).status).toBe(401);
    expect(apiError("Forbidden", 403).status).toBe(403);
    expect(apiError("Conflict", 409).status).toBe(409);
    expect(apiError("Rate limited", 429).status).toBe(429);
  });
});

describe("handleApiError", () => {
  it("returns 500 JSON response with public message", async () => {
    const response = handleApiError(
      new Error("db connection failed"),
      "Failed to process request"
    );
    const body = await response.json();
    expect(body).toEqual({ error: "Failed to process request" });
    expect(response.status).toBe(500);
  });

  it("does not leak internal error details to client", async () => {
    const response = handleApiError(
      new Error("SELECT * FROM secret_table failed: password=hunter2"),
      "Internal error"
    );
    const body = await response.json();
    expect(body.error).toBe("Internal error");
    expect(JSON.stringify(body)).not.toContain("secret_table");
    expect(JSON.stringify(body)).not.toContain("hunter2");
  });

  it("logs the error via logger", async () => {
    const { logger } = await import("../logger");
    const testError = new Error("test");
    handleApiError(testError, "public msg", { route: "/test" });
    expect(logger.error).toHaveBeenCalledWith("public msg", testError, { route: "/test" });
  });
});
