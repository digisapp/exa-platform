import { describe, it, expect } from "vitest";
import { COIN_PACKAGES, BRAND_SUBSCRIPTION_TIERS } from "../stripe-config";

describe("COIN_PACKAGES", () => {
  it("all packages have positive coins", () => {
    for (const pkg of COIN_PACKAGES) {
      expect(pkg.coins).toBeGreaterThan(0);
    }
  });

  it("all packages have positive prices", () => {
    for (const pkg of COIN_PACKAGES) {
      expect(pkg.price).toBeGreaterThan(0);
    }
  });

  it("prices increase with coins", () => {
    for (let i = 1; i < COIN_PACKAGES.length; i++) {
      expect(COIN_PACKAGES[i].price).toBeGreaterThan(COIN_PACKAGES[i - 1].price);
    }
  });

  it("coins increase across packages", () => {
    for (let i = 1; i < COIN_PACKAGES.length; i++) {
      expect(COIN_PACKAGES[i].coins).toBeGreaterThan(COIN_PACKAGES[i - 1].coins);
    }
  });

  it("priceDisplay matches price in cents", () => {
    for (const pkg of COIN_PACKAGES) {
      const displayNum = parseFloat(pkg.priceDisplay.replace(/[$,]/g, ""));
      expect(pkg.price).toBe(Math.round(displayNum * 100));
    }
  });

  it("has expected package sizes (mirrors digis-app ladder)", () => {
    const coinValues = COIN_PACKAGES.map((p) => p.coins);
    expect(coinValues).toEqual([25, 55, 150, 325, 700, 1450, 3000, 10000]);
  });

  it("has 8 packages", () => {
    expect(COIN_PACKAGES).toHaveLength(8);
  });

  it("per-coin price strictly decreases up the ladder (no pack dominated by a smaller one)", () => {
    for (let i = 1; i < COIN_PACKAGES.length; i++) {
      const prev = COIN_PACKAGES[i - 1].price / COIN_PACKAGES[i - 1].coins;
      const curr = COIN_PACKAGES[i].price / COIN_PACKAGES[i].coins;
      expect(curr).toBeLessThan(prev);
    }
  });

  it("every pack clears a 20% margin after Stripe fees (coins cost $0.10 payout)", () => {
    for (const pkg of COIN_PACKAGES) {
      const stripeFee = pkg.price * 0.029 + 30;
      const netMargin = (pkg.price - pkg.coins * 10 - stripeFee) / pkg.price;
      expect(netMargin).toBeGreaterThanOrEqual(0.2);
    }
  });
});

describe("BRAND_SUBSCRIPTION_TIERS", () => {
  it("free tier has $0 price", () => {
    expect(BRAND_SUBSCRIPTION_TIERS.free.monthlyPrice).toBe(0);
    expect(BRAND_SUBSCRIPTION_TIERS.free.annualPrice).toBe(0);
  });

  it("tiers have increasing monthly prices", () => {
    const tiers = ["free", "discovery", "starter", "pro", "enterprise"] as const;
    for (let i = 1; i < tiers.length; i++) {
      expect(BRAND_SUBSCRIPTION_TIERS[tiers[i]].monthlyPrice).toBeGreaterThan(
        BRAND_SUBSCRIPTION_TIERS[tiers[i - 1]].monthlyPrice
      );
    }
  });

  it("pro tier is marked popular", () => {
    expect(BRAND_SUBSCRIPTION_TIERS.pro.popular).toBe(true);
  });

  it("enterprise has unlimited lists (-1)", () => {
    expect(BRAND_SUBSCRIPTION_TIERS.enterprise.maxLists).toBe(-1);
    expect(BRAND_SUBSCRIPTION_TIERS.enterprise.maxModelsPerList).toBe(-1);
  });

  it("free tier has no messaging or calling", () => {
    expect(BRAND_SUBSCRIPTION_TIERS.free.hasMessaging).toBe(false);
    expect(BRAND_SUBSCRIPTION_TIERS.free.hasCalling).toBe(false);
  });

  it("pro and enterprise have all features enabled", () => {
    for (const tier of [BRAND_SUBSCRIPTION_TIERS.pro, BRAND_SUBSCRIPTION_TIERS.enterprise]) {
      expect(tier.hasMessaging).toBe(true);
      expect(tier.hasCalling).toBe(true);
      expect(tier.hasVerifiedBadge).toBe(true);
      expect(tier.hasBulkTools).toBe(true);
    }
  });

  it("annual price is less than 12x monthly for paid tiers", () => {
    const paidTiers = ["discovery", "starter", "pro", "enterprise"] as const;
    for (const tierKey of paidTiers) {
      const tier = BRAND_SUBSCRIPTION_TIERS[tierKey];
      expect(tier.annualPrice).toBeLessThan(tier.monthlyPrice * 12);
    }
  });
});
