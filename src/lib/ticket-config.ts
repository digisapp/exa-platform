// Ticket sales configuration

export const TICKET_CONFIG = {
  // Commission rate for affiliate referrals (20%)
  COMMISSION_RATE: 0.20,

  // Maximum tickets per order
  MAX_QUANTITY_PER_ORDER: 10,

  // Cookie name for affiliate tracking
  AFFILIATE_COOKIE_NAME: "exa_affiliate",

  // Minimum ticket price in cents ($1)
  MIN_PRICE_CENTS: 100,
} as const;

export type TicketTier = {
  id: string;
  event_id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  quantity_available: number | null;
  quantity_sold: number;
  sort_order: number;
  is_active: boolean;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
};

export type TicketPurchase = {
  id: string;
  ticket_tier_id: string;
  event_id: string;
  buyer_email: string;
  buyer_name: string | null;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
  status: "pending" | "completed" | "refunded" | "cancelled";
  affiliate_model_id: string | null;
};
