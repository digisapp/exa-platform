import { describe, it, expect } from "vitest";
import {
  centsToCoins,
  coinsToUsd,
  usdToCoins,
  formatUsd,
  formatCoins,
  COIN_USD_RATE,
  MIN_WITHDRAWAL_COINS,
  MIN_WITHDRAWAL_USD,
} from "../coin-config";

describe("coinsToUsd", () => {
  it("returns 0 for 0 coins", () => {
    expect(coinsToUsd(0)).toBe(0);
  });

  it("converts 1 coin to $0.10", () => {
    expect(coinsToUsd(1)).toBeCloseTo(0.1);
  });

  it("converts 100 coins to $10.00", () => {
    expect(coinsToUsd(100)).toBeCloseTo(10);
  });

  it("handles large amounts", () => {
    expect(coinsToUsd(100000)).toBeCloseTo(10000);
  });
});

describe("usdToCoins", () => {
  it("converts exact amounts", () => {
    expect(usdToCoins(10)).toBe(100);
  });

  it("floors fractional results (10.99 -> 109)", () => {
    expect(usdToCoins(10.99)).toBe(109);
  });

  it("returns 0 for $0", () => {
    expect(usdToCoins(0)).toBe(0);
  });

  it("returns negative for negative input", () => {
    expect(usdToCoins(-1)).toBe(-10);
  });
});

describe("centsToCoins", () => {
  // Regression guard for a 10× overpayment bug: the affiliate-commission
  // Stripe handler used to credit `commissionCents` directly via add_coins,
  // but coins are worth $0.10 each. A $20 commission therefore credited
  // 2,000 coins ($200 cashout) instead of 200 ($20). centsToCoins() must
  // always do the cents/10 conversion.
  it("converts 10 cents to 1 coin (rate parity)", () => {
    expect(centsToCoins(10)).toBe(1);
  });

  it("converts a 20% commission on a $100 sale (2,000 cents) to 200 coins", () => {
    const saleCents = 10_000;
    const commissionCents = Math.round(saleCents * 0.2);
    expect(commissionCents).toBe(2_000);
    expect(centsToCoins(commissionCents)).toBe(200);
  });

  it("converts a 20% commission on a $150 ticket (3,000 cents) to 300 coins", () => {
    const saleCents = 15_000;
    const commissionCents = Math.round(saleCents * 0.2);
    expect(commissionCents).toBe(3_000);
    expect(centsToCoins(commissionCents)).toBe(300);
  });

  it("floors fractional coins (5 cents → 0 coins)", () => {
    expect(centsToCoins(5)).toBe(0);
  });

  it("floors 19 cents to 1 coin (not 1.9)", () => {
    expect(centsToCoins(19)).toBe(1);
  });

  it("handles zero", () => {
    expect(centsToCoins(0)).toBe(0);
  });

  it("round-trips with usdToCoins (cents/100 ≡ usd)", () => {
    const cents = 12_750;
    expect(centsToCoins(cents)).toBe(usdToCoins(cents / 100));
  });
});

describe("formatUsd", () => {
  it("formats basic amount", () => {
    expect(formatUsd(10)).toBe("$10.00");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.00");
  });

  it("formats large amounts", () => {
    expect(formatUsd(10000)).toBe("$10000.00");
  });
});

describe("formatCoins", () => {
  it("formats basic number", () => {
    expect(formatCoins(100)).toBe("100");
  });

  it("formats large numbers with locale separators", () => {
    const result = formatCoins(1000000);
    // Locale-dependent, but should contain digits
    expect(result).toContain("1");
    expect(result).toContain("000");
    expect(result).toContain("000");
  });
});

describe("constants", () => {
  it("COIN_USD_RATE is $0.10", () => {
    expect(COIN_USD_RATE).toBe(0.1);
  });

  it("MIN_WITHDRAWAL_COINS is 500", () => {
    expect(MIN_WITHDRAWAL_COINS).toBe(500);
  });

  it("MIN_WITHDRAWAL_USD equals coins * rate", () => {
    expect(MIN_WITHDRAWAL_USD).toBe(MIN_WITHDRAWAL_COINS * COIN_USD_RATE);
  });
});
