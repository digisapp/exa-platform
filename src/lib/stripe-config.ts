// Coin packages configuration - safe for client and server
export const COIN_PACKAGES = [
  { coins: 20, price: 399, priceDisplay: "$3.99" },
  { coins: 50, price: 999, priceDisplay: "$9.99" },
  { coins: 100, price: 1699, priceDisplay: "$16.99" },
  { coins: 250, price: 3999, priceDisplay: "$39.99" },
  { coins: 500, price: 7499, priceDisplay: "$74.99" },
  { coins: 1000, price: 14299, priceDisplay: "$142.99" },
  { coins: 3000, price: 42999, priceDisplay: "$429.99" },
  { coins: 5000, price: 69999, priceDisplay: "$699.99" },
  { coins: 10000, price: 134999, priceDisplay: "$1,349.99" },
] as const;

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

// Comp card print packages (event-only, toggled via NEXT_PUBLIC_PRINT_PICKUP_ENABLED)
export const PRINT_PACKAGES = [
  { id: "print_10", quantity: 10, price: 2900, priceDisplay: "$29", name: "10 Cards" },
  { id: "print_25", quantity: 25, price: 5900, priceDisplay: "$59", name: "25 Cards" },
  { id: "print_50", quantity: 50, price: 9900, priceDisplay: "$99", name: "50 Cards" },
] as const;

export type PrintPackage = (typeof PRINT_PACKAGES)[number];
