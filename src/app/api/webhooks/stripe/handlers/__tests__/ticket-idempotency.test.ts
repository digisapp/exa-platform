import { describe, it, expect, vi, beforeEach } from "vitest";

// checkout.ts pulls in the server Stripe SDK and the email lib; mock them so the
// module imports cleanly under Vitest and we can assert on the Supabase calls.
vi.mock("@/lib/stripe", () => ({ stripe: {} }));
vi.mock("@/lib/email", () => ({ sendTicketPurchaseConfirmationEmail: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { processAffiliateCommission } from "../checkout";

// Chainable Supabase mock. Builder methods return `this`; the terminal
// `.single()` / `.maybeSingle()` resolve to values queued per test in call order.
function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
  };
  const client = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: vi.fn().mockResolvedValue({ error: null }),
  };
  return { client, chainable };
}

const EVENT_ID = "evt_1";
const MODEL_ID = "model_1";
const PURCHASE_ID = "purchase_1";
const SALE_CENTS = 10_000; // 20% commission = 2000 cents = 200 coins

describe("processAffiliateCommission idempotency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("credits coins with a per-purchase idempotency key on first delivery", async () => {
    const { client, chainable } = createMockSupabase();
    // 1) models lookup, 2) existing-commission check (none), 3) commission insert
    chainable.single
      .mockResolvedValueOnce({ data: { id: MODEL_ID } })
      .mockResolvedValueOnce({ data: { id: "commission_1" } });
    chainable.maybeSingle.mockResolvedValueOnce({ data: null });

    await processAffiliateCommission(
      MODEL_ID,
      EVENT_ID,
      null,
      PURCHASE_ID,
      SALE_CENTS,
      client as never
    );

    expect(client.rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = client.rpc.mock.calls[0];
    expect(fn).toBe("add_coins");
    expect(args.p_idempotency_key).toBe(`ticket_aff:${PURCHASE_ID}`);
  });

  it("does NOT re-credit when a commission already exists (webhook redelivery)", async () => {
    const { client, chainable } = createMockSupabase();
    chainable.single.mockResolvedValueOnce({ data: { id: MODEL_ID } });
    // existing-commission check returns a row -> must short-circuit
    chainable.maybeSingle.mockResolvedValueOnce({ data: { id: "commission_1" } });

    await processAffiliateCommission(
      MODEL_ID,
      EVENT_ID,
      null,
      PURCHASE_ID,
      SALE_CENTS,
      client as never
    );

    expect(client.rpc).not.toHaveBeenCalled();
    expect(chainable.insert).not.toHaveBeenCalled();
  });
});
