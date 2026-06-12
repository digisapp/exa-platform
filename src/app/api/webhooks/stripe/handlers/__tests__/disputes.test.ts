import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

vi.mock("@/lib/stripe", () => ({
  stripe: {
    charges: {
      retrieve: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  handleChargeRefunded,
  handleChargeDisputeCreated,
  handleChargeDisputeClosed,
} from "../disputes";
import { stripe } from "@/lib/stripe";
import { logger } from "@/lib/logger";

// A chainable Supabase mock: every builder method returns `this`, and the
// terminal `.maybeSingle()` resolves to whatever each test queues up.
function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
  };
  const client = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
  };
  return { client, chainable };
}

function makeCharge(overrides: Partial<Stripe.Charge> = {}): Stripe.Charge {
  return {
    id: "ch_test_123",
    payment_intent: "pi_test_456",
    amount: 1000,
    amount_refunded: 1000,
    ...overrides,
  } as unknown as Stripe.Charge;
}

const COIN_PURCHASE = { id: "tx_1", actor_id: "actor_1", amount: 100 };

describe("handleChargeRefunded", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
  });

  it("returns early if no payment_intent on charge", async () => {
    await handleChargeRefunded(makeCharge({ payment_intent: null as never }), mockSupa.client as never);
    expect(logger.error).toHaveBeenCalled();
    expect(mockSupa.client.from).not.toHaveBeenCalled();
  });

  it("skips partial refunds (routes to manual review)", async () => {
    await handleChargeRefunded(
      makeCharge({ amount: 1000, amount_refunded: 400 }),
      mockSupa.client as never
    );
    expect(logger.warn).toHaveBeenCalledWith("Partial refund — needs manual reversal", expect.any(Object));
    expect(mockSupa.client.rpc).not.toHaveBeenCalled();
  });

  it("claws back a coin purchase keyed on the payment_intent, allowing debt", async () => {
    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: COIN_PURCHASE });

    await handleChargeRefunded(makeCharge(), mockSupa.client as never);

    expect(mockSupa.client.rpc).toHaveBeenCalledWith(
      "clawback_coins",
      expect.objectContaining({
        p_actor_id: "actor_1",
        p_amount: 100,
        p_idempotency_key: "coins:pi_test_456",
        p_allow_negative: true,
      })
    );
  });

  it("logs for manual review when the payment matches no product", async () => {
    // every handler's maybeSingle returns null → nothing matched
    await handleChargeRefunded(makeCharge(), mockSupa.client as never);
    expect(logger.warn).toHaveBeenCalledWith(
      "Refund/chargeback for unrecognized payment — needs manual review",
      expect.objectContaining({ pi: "pi_test_456", reason: "refund" })
    );
  });
});

describe("handleChargeDisputeCreated", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
  });

  it("suspends the fan account on dispute", async () => {
    const dispute = { id: "dp_1", charge: "ch_1", amount: 1000, reason: "fraudulent", status: "needs_response" } as unknown as Stripe.Dispute;
    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_intent: "pi_1" });
    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: { actor_id: "fan_1" } });

    await handleChargeDisputeCreated(dispute, mockSupa.client as never);

    expect(mockSupa.client.from).toHaveBeenCalledWith("fans");
    expect(mockSupa.chainable.update).toHaveBeenCalledWith({ is_suspended: true });
  });
});

describe("handleChargeDisputeClosed", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
  });

  it("unsuspends the account when the dispute is won", async () => {
    const dispute = { id: "dp_1", charge: "ch_1", status: "won" } as unknown as Stripe.Dispute;
    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_intent: "pi_1" });
    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: { actor_id: "fan_1" } });

    await handleChargeDisputeClosed(dispute, mockSupa.client as never);

    expect(mockSupa.chainable.update).toHaveBeenCalledWith({ is_suspended: false });
  });

  it("reverses the purchase when the dispute is lost", async () => {
    const dispute = { id: "dp_1", charge: "ch_1", status: "lost" } as unknown as Stripe.Dispute;
    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_intent: "pi_lost", amount: 1000 });
    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: COIN_PURCHASE });

    await handleChargeDisputeClosed(dispute, mockSupa.client as never);

    expect(mockSupa.client.rpc).toHaveBeenCalledWith(
      "clawback_coins",
      expect.objectContaining({ p_idempotency_key: "coins:pi_lost", p_allow_negative: true })
    );
  });
});

describe("coin clawback idempotency (regression: refund + lost dispute must not double-deduct)", () => {
  it("uses the SAME idempotency key for a refund and a later lost dispute on the same charge", async () => {
    // Refund path
    const refundSupa = createMockSupabase();
    refundSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: COIN_PURCHASE });
    await handleChargeRefunded(makeCharge({ payment_intent: "pi_same" }), refundSupa.client as never);

    // Lost-dispute path for the same underlying charge/PI
    const disputeSupa = createMockSupabase();
    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({ payment_intent: "pi_same", amount: 1000 });
    disputeSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: COIN_PURCHASE });
    await handleChargeDisputeClosed(
      { id: "dp_x", charge: "ch_x", status: "lost" } as unknown as Stripe.Dispute,
      disputeSupa.client as never
    );

    const refundKey = refundSupa.client.rpc.mock.calls[0][1].p_idempotency_key;
    const disputeKey = disputeSupa.client.rpc.mock.calls[0][1].p_idempotency_key;
    // Identical keys → the DB unique index on idempotency_key makes the second a no-op.
    expect(refundKey).toBe("coins:pi_same");
    expect(disputeKey).toBe("coins:pi_same");
  });
});
