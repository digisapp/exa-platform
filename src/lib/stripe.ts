import Stripe from "stripe";
import { loadStripe, Stripe as StripeClient } from "@stripe/stripe-js";

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

// Client-side Stripe promise
let stripePromise: Promise<StripeClient | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Coin packages configuration
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
