import { describe, it, expect } from "vitest";
import {
  emailSchema,
  usernameSchema,
  phoneSchema,
  coinAmountSchema,
  tipSchema,
  withdrawalRequestSchema,
  modelSignupSchema,
  sendMessageSchema,
  paginationSchema,
} from "../validations";

// Helper: shorthand for Zod v4 parse
function parse<T>(schema: { parse: (v: unknown) => T }, value: unknown): T {
  return schema.parse(value);
}

function safeParse<T>(schema: { safeParse: (v: unknown) => { success: boolean; error?: unknown; data?: T } }, value: unknown) {
  return schema.safeParse(value);
}

describe("emailSchema", () => {
  it("accepts valid email", () => {
    expect(parse(emailSchema, "user@example.com")).toBe("user@example.com");
  });

  it("rejects invalid email", () => {
    expect(safeParse(emailSchema, "not-an-email").success).toBe(false);
  });

  it("rejects email that is too long", () => {
    const longEmail = "a".repeat(250) + "@b.com";
    expect(safeParse(emailSchema, longEmail).success).toBe(false);
  });

  it("rejects email with leading/trailing whitespace (validated before trim)", () => {
    // In Zod v4, .email() validates before .trim() transforms
    expect(safeParse(emailSchema, "  user@example.com  ").success).toBe(false);
  });

  it("lowercases email", () => {
    expect(parse(emailSchema, "User@EXAMPLE.com")).toBe("user@example.com");
  });
});

describe("usernameSchema", () => {
  it("accepts valid username", () => {
    expect(parse(usernameSchema, "john_doe")).toBe("john_doe");
  });

  it("rejects too short (< 3 chars)", () => {
    expect(safeParse(usernameSchema, "ab").success).toBe(false);
  });

  it("rejects too long (> 30 chars)", () => {
    expect(safeParse(usernameSchema, "a".repeat(31)).success).toBe(false);
  });

  it("rejects special characters", () => {
    expect(safeParse(usernameSchema, "user@name").success).toBe(false);
  });

  it("allows underscores", () => {
    expect(safeParse(usernameSchema, "user_name_1").success).toBe(true);
  });

  it("lowercases output", () => {
    expect(parse(usernameSchema, "JohnDoe")).toBe("johndoe");
  });
});

describe("phoneSchema", () => {
  it("accepts valid phone format", () => {
    expect(safeParse(phoneSchema, "+1 (555) 123-4567").success).toBe(true);
  });

  it("rejects invalid characters", () => {
    expect(safeParse(phoneSchema, "abc-def-ghij").success).toBe(false);
  });

  it("accepts null (optional nullable)", () => {
    expect(safeParse(phoneSchema, null).success).toBe(true);
  });

  it("accepts undefined (optional)", () => {
    expect(safeParse(phoneSchema, undefined).success).toBe(true);
  });
});

describe("coinAmountSchema", () => {
  it("accepts minimum (1)", () => {
    expect(safeParse(coinAmountSchema, 1).success).toBe(true);
  });

  it("accepts maximum (100000)", () => {
    expect(safeParse(coinAmountSchema, 100000).success).toBe(true);
  });

  it("rejects zero", () => {
    expect(safeParse(coinAmountSchema, 0).success).toBe(false);
  });

  it("rejects decimal", () => {
    expect(safeParse(coinAmountSchema, 1.5).success).toBe(false);
  });

  it("rejects negative", () => {
    expect(safeParse(coinAmountSchema, -10).success).toBe(false);
  });

  it("rejects above maximum", () => {
    expect(safeParse(coinAmountSchema, 100001).success).toBe(false);
  });
});

describe("tipSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid tip", () => {
    expect(safeParse(tipSchema, {
      recipientId: validUuid,
      amount: 100,
    }).success).toBe(true);
  });

  it("rejects missing recipientId", () => {
    expect(safeParse(tipSchema, { amount: 100 }).success).toBe(false);
  });

  it("rejects amount too high", () => {
    expect(safeParse(tipSchema, {
      recipientId: validUuid,
      amount: 100001,
    }).success).toBe(false);
  });

  it("accepts optional conversationId", () => {
    expect(safeParse(tipSchema, {
      recipientId: validUuid,
      amount: 50,
      conversationId: validUuid,
    }).success).toBe(true);
  });
});

describe("withdrawalRequestSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid withdrawal with bank", () => {
    expect(safeParse(withdrawalRequestSchema, {
      amount: 1000,
      bankAccountId: validUuid,
    }).success).toBe(true);
  });

  it("accepts valid withdrawal with payoneer", () => {
    expect(safeParse(withdrawalRequestSchema, {
      amount: 1000,
      payoneerAccountId: validUuid,
    }).success).toBe(true);
  });

  it("rejects when neither bank nor payoneer is provided", () => {
    expect(safeParse(withdrawalRequestSchema, {
      amount: 1000,
    }).success).toBe(false);
  });

  it("rejects below minimum withdrawal (1000 coins)", () => {
    expect(safeParse(withdrawalRequestSchema, {
      amount: 999,
      bankAccountId: validUuid,
    }).success).toBe(false);
  });
});

describe("modelSignupSchema", () => {
  const validData = {
    name: "Jane Doe",
    email: "jane@example.com",
    instagram_username: "janedoe",
  };

  it("accepts valid data with instagram", () => {
    expect(safeParse(modelSignupSchema, validData).success).toBe(true);
  });

  it("accepts valid data with tiktok", () => {
    expect(safeParse(modelSignupSchema, {
      name: "Jane Doe",
      email: "jane@example.com",
      tiktok_username: "janedoe",
    }).success).toBe(true);
  });

  it("rejects when no social media is provided", () => {
    expect(safeParse(modelSignupSchema, {
      name: "Jane Doe",
      email: "jane@example.com",
    }).success).toBe(false);
  });

  it("rejects when socials are empty strings", () => {
    expect(safeParse(modelSignupSchema, {
      name: "Jane Doe",
      email: "jane@example.com",
      instagram_username: "   ",
      tiktok_username: "   ",
    }).success).toBe(false);
  });
});

describe("sendMessageSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid message with content", () => {
    expect(safeParse(sendMessageSchema, {
      conversationId: validUuid,
      content: "Hello!",
    }).success).toBe(true);
  });

  it("accepts valid message with media", () => {
    expect(safeParse(sendMessageSchema, {
      conversationId: validUuid,
      mediaUrl: "https://example.com/image.jpg",
      mediaType: "image",
    }).success).toBe(true);
  });

  it("rejects when neither content nor media", () => {
    expect(safeParse(sendMessageSchema, {
      conversationId: validUuid,
    }).success).toBe(false);
  });

  it("rejects empty content without media", () => {
    expect(safeParse(sendMessageSchema, {
      conversationId: validUuid,
      content: "   ",
    }).success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("applies defaults when no input", () => {
    const result = parse(paginationSchema, {});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it("coerces string values", () => {
    const result = parse(paginationSchema, { page: "3", limit: "50" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
  });

  it("rejects page below 1", () => {
    expect(safeParse(paginationSchema, { page: 0 }).success).toBe(false);
  });

  it("rejects limit above 100", () => {
    expect(safeParse(paginationSchema, { limit: 101 }).success).toBe(false);
  });
});
