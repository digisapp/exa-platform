// Coin packages configuration - safe for client and server
export const COIN_PACKAGES = [
  { coins: 20, price: 399, priceDisplay: "$3.99" },
  { coins: 50, price: 999, priceDisplay: "$9.99" },
  { coins: 100, price: 1699, priceDisplay: "$16.99" },
  { coins: 250, price: 3999, priceDisplay: "$39.99" },
  { coins: 500, price: 7499, priceDisplay: "$74.99" },
  { coins: 1000, price: 14299, priceDisplay: "$142.99" },
  { coins: 3000, price: 42999, priceDisplay: "$429.99" },
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
  starter: {
    id: "starter",
    name: "Starter",
    monthlyPrice: 14900, // $149
    annualPrice: 149000, // $1,490 (save ~$298)
    monthlyCoins: 500,
    features: [
      "Full model profile access",
      "500 coins/month included",
      "Message models directly",
      "Send booking requests",
      "Email support",
    ],
    restrictions: [],
  },
  pro: {
    id: "pro",
    name: "Professional",
    monthlyPrice: 34900, // $349
    annualPrice: 349000, // $3,490 (save ~$698)
    monthlyCoins: 1200,
    popular: true,
    features: [
      "Everything in Starter",
      "1,200 coins/month included",
      "Verified Brand badge",
      "Listed on Verified Brands page",
      "Priority support",
    ],
    restrictions: [],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: 69900, // $699
    annualPrice: 699000, // $6,990 (save ~$1,398)
    monthlyCoins: 2500,
    features: [
      "Everything in Professional",
      "2,500 coins/month included",
      "Featured brand placement",
      "Dedicated account manager",
      "Custom campaigns",
    ],
    restrictions: [],
  },
} as const;

export type BrandTier = keyof typeof BRAND_SUBSCRIPTION_TIERS;
export type BrandSubscriptionTier = typeof BRAND_SUBSCRIPTION_TIERS[BrandTier];

// Extra coin packages for brands (when they run out)
export const BRAND_COIN_PACKAGES = [
  { coins: 100, price: 2000, priceDisplay: "$20" }, // $0.20/coin
  { coins: 250, price: 4500, priceDisplay: "$45" }, // $0.18/coin
  { coins: 500, price: 8500, priceDisplay: "$85" }, // $0.17/coin
  { coins: 1000, price: 15000, priceDisplay: "$150" }, // $0.15/coin
] as const;
