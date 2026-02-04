import { z } from "zod";

/**
 * Shared Zod validation schemas for API endpoints
 * Centralized validation ensures consistency and makes it easy to update rules
 */

// ============================================
// Common Field Schemas (reusable primitives)
// ============================================

export const uuidSchema = z.string().uuid("Invalid ID format");

export const emailSchema = z
  .string()
  .email("Invalid email address")
  .max(254, "Email is too long")
  .toLowerCase()
  .trim();

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username is too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .toLowerCase()
  .trim();

export const phoneSchema = z
  .string()
  .max(20, "Phone number is too long")
  .regex(/^[+\d\s()-]+$/, "Invalid phone number format")
  .optional()
  .nullable();

export const urlSchema = z
  .string()
  .url("Invalid URL")
  .max(2048, "URL is too long");

export const positiveIntSchema = z
  .number()
  .int("Must be a whole number")
  .positive("Must be a positive number");

export const coinAmountSchema = z
  .number()
  .int("Amount must be a whole number")
  .min(1, "Minimum is 1 coin")
  .max(100000, "Maximum is 100,000 coins");

// ============================================
// Auth Schemas
// ============================================

export const modelSignupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").trim(),
  email: emailSchema,
  instagram_username: z.string().max(30, "Instagram username is too long").optional().nullable(),
  tiktok_username: z.string().max(24, "TikTok username is too long").optional().nullable(),
  phone: phoneSchema,
  date_of_birth: z.string().optional().nullable(),
  height: z.string().max(10, "Height is too long").optional().nullable(),
}).refine(
  (data) => data.instagram_username?.trim() || data.tiktok_username?.trim(),
  { message: "Please provide at least one social media handle", path: ["instagram_username"] }
);

export const fanSignupSchema = z.object({
  email: emailSchema,
  password: z.string().min(6, "Password must be at least 6 characters").max(128, "Password is too long"),
  username: usernameSchema,
  display_name: z.string().max(50, "Display name is too long").optional(),
});

export const brandSignupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
  company_name: z.string().min(1, "Company name is required").max(100, "Company name is too long").trim(),
  website: urlSchema.optional().nullable(),
  industry: z.string().max(50, "Industry is too long").optional().nullable(),
});

// ============================================
// Messaging Schemas
// ============================================

export const sendMessageSchema = z.object({
  conversationId: uuidSchema,
  content: z.string().max(5000, "Message is too long").optional().nullable(),
  mediaUrl: urlSchema.optional().nullable(),
  mediaType: z.enum(["image", "video", "audio"]).optional().nullable(),
}).refine(
  (data) => data.content?.trim() || data.mediaUrl,
  { message: "Message content or media required", path: ["content"] }
);

export const newConversationSchema = z.object({
  recipientId: uuidSchema,
  initialMessage: z.string().min(1, "Message is required").max(5000, "Message is too long").optional(),
  mediaUrl: urlSchema.optional().nullable(),
});

// ============================================
// Financial Schemas
// ============================================

export const tipSchema = z.object({
  recipientId: uuidSchema,
  amount: coinAmountSchema,
  conversationId: uuidSchema.optional().nullable(),
});

export const coinPurchaseSchema = z.object({
  packageId: z.string().min(1, "Package ID is required"),
  quantity: positiveIntSchema.max(10, "Maximum 10 packages per purchase").default(1),
});

export const withdrawalRequestSchema = z.object({
  amount: coinAmountSchema.min(1000, "Minimum withdrawal is 1,000 coins"),
  bankAccountId: uuidSchema.optional().nullable(),
  payoneerAccountId: uuidSchema.optional().nullable(),
}).refine(
  (data) => data.bankAccountId || data.payoneerAccountId,
  { message: "Please select a payout method", path: ["bankAccountId"] }
);

// ============================================
// Booking/Offer Schemas
// ============================================

export const createOfferSchema = z.object({
  modelIds: z.array(uuidSchema).min(1, "Select at least one model").max(100, "Maximum 100 models per offer"),
  title: z.string().min(1, "Title is required").max(200, "Title is too long").trim(),
  description: z.string().max(2000, "Description is too long").optional().nullable(),
  location: z.string().max(200, "Location is too long").optional().nullable(),
  date: z.string().optional().nullable(),
  compensation_type: z.enum(["paid", "tfp", "perks", "negotiable"]),
  compensation_amount: z.number().min(0, "Amount cannot be negative").optional().nullable(),
  compensation_description: z.string().max(500, "Description is too long").optional().nullable(),
});

export const bookingRequestSchema = z.object({
  modelId: uuidSchema,
  date: z.string().min(1, "Date is required"),
  time: z.string().optional().nullable(),
  duration: z.string().optional().nullable(),
  notes: z.string().max(1000, "Notes are too long").optional().nullable(),
  rate: positiveIntSchema.optional().nullable(),
});

// ============================================
// Content Schemas
// ============================================

export const uploadMediaSchema = z.object({
  type: z.enum(["avatar", "portfolio", "premium", "message"]),
  fileName: z.string().min(1, "File name is required").max(255, "File name is too long"),
  contentType: z.string().regex(/^(image|video|audio)\//, "Invalid content type"),
  fileSize: z.number().max(50 * 1024 * 1024, "File size exceeds 50MB limit"),
});

export const premiumContentSchema = z.object({
  title: z.string().max(100, "Title is too long").optional().nullable(),
  description: z.string().max(500, "Description is too long").optional().nullable(),
  price: coinAmountSchema,
  mediaUrls: z.array(urlSchema).min(1, "At least one media file required").max(10, "Maximum 10 files"),
});

// ============================================
// Search/Filter Schemas
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const modelSearchSchema = paginationSchema.extend({
  query: z.string().max(100, "Search query is too long").optional(),
  location: z.string().max(100).optional(),
  tags: z.array(z.string()).max(10).optional(),
  minHeight: z.coerce.number().min(0).max(300).optional(),
  maxHeight: z.coerce.number().min(0).max(300).optional(),
  sortBy: z.enum(["newest", "popular", "alphabetical"]).default("newest"),
});

// ============================================
// Type Exports (for TypeScript inference)
// ============================================

export type ModelSignupInput = z.infer<typeof modelSignupSchema>;
export type FanSignupInput = z.infer<typeof fanSignupSchema>;
export type BrandSignupInput = z.infer<typeof brandSignupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type TipInput = z.infer<typeof tipSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type PremiumContentInput = z.infer<typeof premiumContentSchema>;
export type ModelSearchInput = z.infer<typeof modelSearchSchema>;
