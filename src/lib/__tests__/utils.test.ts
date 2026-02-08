import { describe, it, expect } from "vitest";
import { escapeIlike } from "../utils";

describe("escapeIlike", () => {
  it("passes clean string through unchanged", () => {
    expect(escapeIlike("hello world")).toBe("hello world");
  });

  it("escapes % wildcard", () => {
    expect(escapeIlike("100%")).toBe("100\\%");
  });

  it("escapes _ wildcard", () => {
    expect(escapeIlike("user_name")).toBe("user\\_name");
  });

  it("escapes backslash", () => {
    expect(escapeIlike("path\\to")).toBe("path\\\\to");
  });

  it("escapes combined special characters", () => {
    expect(escapeIlike("%_\\")).toBe("\\%\\_\\\\");
  });

  it("handles empty string", () => {
    expect(escapeIlike("")).toBe("");
  });

  it("preserves other special characters", () => {
    expect(escapeIlike("hello@world.com")).toBe("hello@world.com");
  });

  it("handles string with only special chars", () => {
    expect(escapeIlike("%%%")).toBe("\\%\\%\\%");
  });
});
