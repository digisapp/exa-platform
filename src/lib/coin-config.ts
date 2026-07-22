/**
 * Coin and Payout Configuration
 * Centralized configuration for coin values and payout settings.
 *
 * ─── UNITS POLICY ────────────────────────────────────────────────────────
 * Every Stripe-fiat amount is in **CENTS**. Every wallet/`add_coins`
 * amount is in **COINS** (1 coin = $0.10 cashout per `COIN_USD_RATE`).
 * THESE ARE DIFFERENT UNITS — never pass cents into add_coins.
 *
 * At every fiat → wallet boundary (Stripe webhooks, commission credits),
 * convert with `centsToCoins()` first. Skipping this is a 10× overpayment
 * bug; we shipped exactly that in 2026-05 in
 * `src/app/api/webhooks/stripe/handlers/checkout.ts` (fix: commit 91adb530).
 * Mirror helper exists in digis-app at `src/lib/stripe/constants.ts`.
 * ─────────────────────────────────────────────────────────────────────────
 */

// Coin to USD conversion rate (model payout / internal accounting)
export const COIN_USD_RATE = 0.10;

// Coin purchase rate shown to fans (what they pay per coin)
export const FAN_COIN_USD_RATE = 0.15;

// ─── First-purchase bonus (fan activation promo) ────────────────────────
// A fan's FIRST coin purchase earns +25% bonus coins on top, granted
// server-side by the Stripe webhook (action 'first_purchase_bonus') and
// clawed back alongside the purchase if it is refunded/charged back.
// Fans only — brands/models never get it. Once per actor, ever (enforced
// by the `first_purchase_bonus:{actor_id}` idempotency key in the ledger).
export const FIRST_PURCHASE_BONUS_PCT = 0.25;
export const FIRST_PURCHASE_BONUS_MIN_COINS = 5;

/** Bonus coins for a first purchase: +25% rounded down, minimum 5. */
export function firstPurchaseBonusCoins(purchasedCoins: number): number {
  return Math.max(
    FIRST_PURCHASE_BONUS_MIN_COINS,
    Math.floor(purchasedCoins * FIRST_PURCHASE_BONUS_PCT)
  );
}

// Paid messaging (fan/brand → model)
export const DEFAULT_MESSAGE_COST = 5;

/**
 * Coins charged per message sent to a model. Single source of truth shared by
 * the send route and every UI that previews the cost — keep them identical or
 * fans see one price and get charged another.
 */
export function messageCoinCost(modelRate: number | null | undefined): number {
  return Math.max(DEFAULT_MESSAGE_COST, modelRate ?? DEFAULT_MESSAGE_COST);
}

// ─── PRICING FLOORS / DEFAULTS / CAPS ────────────────────────────────────
// Single source of truth for every model-priced surface. Every client input
// AND server enforcement point imports from here — never restate these
// numbers at a priced surface, or client and server silently drift.
// ─────────────────────────────────────────────────────────────────────────

// Studio "Pay to Unlock" content (content_items.coin_price). Floor raised
// 1 → 5 on 2026-07-22, FORWARD-ONLY: new writes/edits are held to it, but
// existing sub-floor items stay live and unlockable (no backfill, and the
// DB CHECK stays coin_price >= 0 — 0 is valid for private/portfolio rows).
export const CONTENT_UNLOCK_MIN_COINS = 5;
export const CONTENT_PRICE_MAX_COINS = 10000;
// Pre-filled price when a studio dialog first offers Pay to Unlock
export const CONTENT_UNLOCK_DEFAULT_COINS = 100;

// Locked chat media (messages.media_price) — set in MessageInput, enforced
// server-side in /api/messages/send (messages/new carries no media price)
export const CHAT_MEDIA_MIN_COINS = 10;
export const CHAT_MEDIA_MAX_COINS = 10000;

// Model per-message rate (models.message_rate). The floor is owned by
// DEFAULT_MESSAGE_COST so the rate floor and the messageCoinCost() charge
// fallback can never diverge.
export const MESSAGE_RATE_MIN_COINS = DEFAULT_MESSAGE_COST;
export const MESSAGE_RATE_MAX_COINS = 100;

// Model per-minute call rates (models.video_call_rate / voice_call_rate).
// NOTE: rate floors (message + call) are enforced client-side only — rates
// persist via a session-client write in settings, no API route in the path.
export const CALL_RATE_MIN_COINS = 10;
export const CALL_RATE_MAX_COINS = 1000;

/**
 * Counterparty model id from a coin_transactions metadata blob. The key varies
 * by RPC: send_tip writes recipient_model_id, send_message_with_coins and
 * transfer_coins write recipient_id, content unlock writes model_id. Non-model
 * ids (fan/brand recipients) simply won't resolve against the models table.
 */
export function counterpartyIdOf(tx: { metadata?: Record<string, unknown> | null }): string | undefined {
  const m = tx.metadata;
  return (m?.recipient_model_id || m?.recipient_id || m?.model_id) as string | undefined;
}

/**
 * Every coin_transactions action that credits a MODEL for real fan/brand
 * revenue. This is the single source of truth for "earned" stats — sum rows
 * matching these actions with no amount filter (clawback reversals net out).
 * Consumed by the Monday owner email's model-activation north star
 * (weekly-analytics-report cron: "first $1 within 14 days of approval"), so
 * changing this list changes that metric's definition.
 *
 * Deliberately excluded: `purchase` (fan buys), `signup_bonus` (removed
 * 2026-06-12; model rows were ledgered but never credited to balances),
 * `daily_spin` / `first_purchase_bonus` / `subscription_renewal` (fan-side
 * grants that ride along on fan→model converted actors), and fan-spend
 * actions (`video_call`, `voice_call`, `*_sent`, `content_unlock`,
 * `ppv_unlock`, `exa_boost*`, `auction_escrow*`, `ticket_purchase`).
 */
export const MODEL_EARNING_ACTIONS = [
  "content_sale",
  "message_received",
  "tip_received",
  "live_wall_tip_received",
  "ppv_sale",
  "auction_sale",
  "booking_payment",
  "booking_payment_received",
  "video_call_received",
  "voice_call_received",
  "affiliate_commission",
] as const;

// ─── WITHDRAWAL MINIMUM ──────────────────────────────────────────────────
// Flat 500 coins ($50) for every payout. A $10 first-cashout exception
// shipped briefly on 2026-07-22 and was reverted the same day by owner
// decision — do not reintroduce a lower first-payout tier. The REAL gates
// live in the DB — CHECK (coins >= 500) on withdrawal_requests plus the
// minimum check inside create_withdrawal_request /
// create_payoneer_withdrawal_request (20260722000900) — these constants
// only keep the UI/toasts in step. Change them together or client and
// server drift.
export const MIN_WITHDRAWAL_COINS = 500;
export const MIN_WITHDRAWAL_USD = MIN_WITHDRAWAL_COINS * COIN_USD_RATE; // $50

// Dashboard payout nudge gate — fires well before the $50 payout minimum
// on purpose: getting a payout method + ID verification on file at 100
// coins means the first real cashout is instant when the model hits 500.
// (PR #73 killed the v1 prompt partly for firing at any balance > 0.)
export const PAYOUT_NUDGE_MIN_COINS = 100;

// Payout methods
export type PayoutMethod = 'bank' | 'payoneer';

// Helper functions
export function coinsToUsd(coins: number): number {
  return coins * COIN_USD_RATE;
}

/** USD value shown to fans (based on what they pay per coin) */
export function coinsToFanUsd(coins: number): number {
  return coins * FAN_COIN_USD_RATE;
}

export function usdToCoins(usd: number): number {
  return Math.floor(usd / COIN_USD_RATE);
}

/**
 * Convert a fiat cent amount (e.g. Stripe `session.amount_total`, commission
 * cents, ticket totals) into **coins**, rounded down. 1 coin = $0.10 = 10
 * cents, so `cents / 10 = coins`.
 *
 * **Always use this helper at any Stripe-fiat → `add_coins` boundary** —
 * passing raw cents into `supabaseAdmin.rpc('add_coins', { p_amount: cents })`
 * is a 10× overpayment bug. We had this incident in 2026-05 (commit 91adb530)
 * on the affiliate-commission webhook; do not repeat.
 */
export function centsToCoins(cents: number): number {
  return Math.floor(cents / (COIN_USD_RATE * 100));
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCoins(coins: number): string {
  return coins.toLocaleString();
}
