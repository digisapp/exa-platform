// Coin packages configuration - safe for client and server
//
// COINS + PRICES MIRROR digis-app `src/lib/stripe/constants.ts` COIN_PACKAGES
// — the two platforms sell coins at identical coin/price points. Change the
// numbers in BOTH repos or not at all. Labels are EXA's original menu voice
// (Nathan, 2026-07-23: keep the names the EXA menu always had), each mapped
// to its nearest new size — "Mega" retired with the old 5,000-coin size, and
// the old "Starter" became "Mini" so no label is shared with digis (only
// "Elite" appears on both platforms, at different sizes — accepted). Margins
// step 50% → 23% up the ladder against the $0.10/coin payout rate; every
// pack must clear a ≥20% margin floor AFTER Stripe fees.
export const COIN_PACKAGES = [
  { coins: 25, price: 499, priceDisplay: "$4.99", label: "Mini" },
  { coins: 55, price: 999, priceDisplay: "$9.99", label: "Basic" },
  { coins: 150, price: 2499, priceDisplay: "$24.99", label: "Value" },
  { coins: 325, price: 4999, priceDisplay: "$49.99", label: "Pro" },
  { coins: 700, price: 9999, priceDisplay: "$99.99", label: "Super" },
  { coins: 1450, price: 19999, priceDisplay: "$199.99", label: "Elite" },
  { coins: 3000, price: 39999, priceDisplay: "$399.99", label: "Ultimate" },
  { coins: 10000, price: 129999, priceDisplay: "$1,299.99", label: "Whale" },
] as const;

/**
 * Percent saved per coin vs the smallest (most expensive per-coin) package.
 * Honest math off the real tier pricing — used as the big-pack purchase nudge.
 */
export function packageSavingsPct(pkg: CoinPackage): number {
  const baseRate = COIN_PACKAGES[0].price / COIN_PACKAGES[0].coins;
  return Math.round((1 - pkg.price / pkg.coins / baseRate) * 100);
}

export type CoinPackage = (typeof COIN_PACKAGES)[number];

// Brand subscription tiers
export const BRAND_SUBSCRIPTION_TIERS = {
  free: {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyCoins: 0,
    maxLists: 0,
    maxModelsPerList: 0,
    teamSeats: 0,
    hasMessaging: false,
    hasCalling: false,
    hasVerifiedBadge: false,
    hasBulkTools: false,
    features: [
      "Browse models (limited preview)",
      "View model rates",
    ],
    restrictions: [
      "Cannot view full model profiles",
      "Cannot message models",
      "Cannot send booking requests",
    ],
  },
  discovery: {
    id: "discovery",
    name: "Discovery",
    monthlyPrice: 19900, // $199
    annualPrice: 199000, // $1,990 (save ~$398)
    monthlyCoins: 0,
    maxLists: 5,
    maxModelsPerList: 50,
    teamSeats: 0,
    hasMessaging: false,
    hasCalling: false,
    hasVerifiedBadge: false,
    hasBulkTools: false,
    features: [
      "Full model profile access",
      "5 lists (50 models each)",
      "Send booking requests",
      "Email support",
    ],
    restrictions: [
      "No direct messaging",
      "No direct calling",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 49900, // $499
    annualPrice: 499000, // $4,990 (save ~$998)
    monthlyCoins: 1000,
    maxLists: 15,
    maxModelsPerList: 100,
    teamSeats: 0,
    hasMessaging: true,
    hasCalling: false,
    hasVerifiedBadge: false,
    hasBulkTools: false,
    features: [
      "Everything in Discovery",
      "15 lists (100 models each)",
      "1,000 coins/month included",
      "Direct messaging with models",
      "Email support",
    ],
    restrictions: [
      "No direct calling",
    ],
  },
  pro: {
    id: "pro",
    name: "Professional",
    monthlyPrice: 99900, // $999
    annualPrice: 999000, // $9,990 (save ~$1,998)
    monthlyCoins: 2500,
    maxLists: 50,
    maxModelsPerList: 250,
    teamSeats: 0,
    hasMessaging: true,
    hasCalling: true,
    hasVerifiedBadge: true,
    hasBulkTools: true,
    popular: true,
    features: [
      "Everything in Starter",
      "50 lists (250 models each)",
      "2,500 coins/month included",
      "Direct calling with models",
      "Bulk add tools",
      "Verified Brand badge",
      "Priority support",
    ],
    restrictions: [],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 199900, // $1,999
    annualPrice: 1999000, // $19,990 (save ~$3,998)
    monthlyCoins: 5000,
    maxLists: -1, // unlimited
    maxModelsPerList: -1, // unlimited
    teamSeats: 0,
    hasMessaging: true,
    hasCalling: true,
    hasVerifiedBadge: true,
    hasBulkTools: true,
    features: [
      "Everything in Professional",
      "Unlimited lists & models",
      "5,000 coins/month included",
      "Dedicated account manager",
      "Custom campaigns",
    ],
    restrictions: [],
  },
} as const;

export type BrandTier = keyof typeof BRAND_SUBSCRIPTION_TIERS;
export type BrandSubscriptionTier = typeof BRAND_SUBSCRIPTION_TIERS[BrandTier];

// Comp card print pricing (event-only, toggled via NEXT_PUBLIC_PRINT_PICKUP_ENABLED)
export const PRINT_PRICE_PER_CARD = 300; // $3.00 in cents
export const PRINT_MIN_QUANTITY = 10;
