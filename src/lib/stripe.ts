import Stripe from "stripe";

// Server-side Stripe instance - only use in server components/API routes
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

// Re-export config for convenience (but prefer direct import from stripe-config)
export { COIN_PACKAGES, type CoinPackage } from "./stripe-config";
