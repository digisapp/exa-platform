/**
 * Client-safe Payoneer country lists.
 *
 * Kept out of payoneer.ts on purpose: that module imports node crypto for API
 * signing, and importing anything from it in a client component bundles the
 * ~98KB-gzip crypto-browserify polyfill (this exact regression shipped on
 * /wallet via PayoutsTab). payoneer.ts is `server-only` and re-exports these.
 */

/**
 * Countries where Payoneer is preferred over Stripe
 * (Stripe Connect not available or has limitations)
 */
export const PAYONEER_PREFERRED_COUNTRIES = [
  "AR", // Argentina - Stripe not available
  "GH", // Ghana - Stripe not available
  "NG", // Nigeria - Stripe limited
  "KE", // Kenya - Stripe limited
  "ZA", // South Africa - Stripe limited
  "PH", // Philippines - Stripe limited
  "VN", // Vietnam - Stripe not available
  "BD", // Bangladesh - Stripe not available
  "PK", // Pakistan - Stripe not available
  "EG", // Egypt - Stripe not available
  "MA", // Morocco - Stripe not available
  "TN", // Tunisia - Stripe not available
  "CO", // Colombia - Stripe limited
  "PE", // Peru - Stripe limited
  "CL", // Chile - Stripe limited
  "UA", // Ukraine - Stripe limited
];

/**
 * Countries where both Stripe and Payoneer work well
 * (Let user choose their preference)
 */
export const DUAL_PAYOUT_COUNTRIES = [
  "BR", // Brazil
  "TH", // Thailand
  "MY", // Malaysia
  "ID", // Indonesia
  "MX", // Mexico
  "IN", // India
];

/**
 * Check if country should use Payoneer
 */
export function shouldUsePayoneer(countryCode: string): boolean {
  return PAYONEER_PREFERRED_COUNTRIES.includes(countryCode.toUpperCase());
}

/**
 * Check if country supports both payout methods
 */
export function supportsBothPayoutMethods(countryCode: string): boolean {
  return DUAL_PAYOUT_COUNTRIES.includes(countryCode.toUpperCase());
}
