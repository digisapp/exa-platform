/**
 * Coin and Payout Configuration
 * Centralized configuration for coin values and payout settings
 */

// Coin to USD conversion rate (model payout / internal accounting)
export const COIN_USD_RATE = 0.10;

// Coin purchase rate shown to fans (what they pay per coin)
export const FAN_COIN_USD_RATE = 0.15;

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

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatCoins(coins: number): string {
  return coins.toLocaleString();
}
