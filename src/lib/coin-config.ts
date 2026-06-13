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

// Minimum withdrawal amounts
export const MIN_WITHDRAWAL_COINS = 500;
export const MIN_WITHDRAWAL_USD = MIN_WITHDRAWAL_COINS * COIN_USD_RATE; // $50

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
