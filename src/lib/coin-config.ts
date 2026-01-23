/**
 * Coin and Payout Configuration
 * Centralized configuration for coin values and payout settings
 */

// Coin to USD conversion rate
export const COIN_USD_RATE = 0.10;

// Minimum withdrawal amounts
export const MIN_WITHDRAWAL_COINS = 500;
export const MIN_WITHDRAWAL_USD = MIN_WITHDRAWAL_COINS * COIN_USD_RATE; // $50

// Payout methods
export type PayoutMethod = 'bank' | 'payoneer';

// Helper functions
export function coinsToUsd(coins: number): number {
  return coins * COIN_USD_RATE;
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
