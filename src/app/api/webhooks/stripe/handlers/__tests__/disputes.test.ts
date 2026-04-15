import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// Mock stripe
vi.mock("@/lib/stripe", () => ({
  stripe: {
    charges: {
      retrieve: vi.fn(),
    },
  },
}));

import {
  handleChargeRefunded,
  handleChargeDisputeCreated,
  handleChargeDisputeClosed,
} from "../disputes";
import { stripe } from "@/lib/stripe";

// Helper to create mock Supabase client
function createMockSupabase() {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    single: vi.fn().mockResolvedValue({ data: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    then: vi.fn().mockImplementation((resolve) => resolve?.()),
  };

  const client = {
    from: vi.fn().mockReturnValue(chainable),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };

  return { client, chainable };
}

function makeCharge(overrides: Partial<Stripe.Charge> = {}): Stripe.Charge {
  return {
    id: "ch_test_123",
    payment_intent: "pi_test_456",
    refunds: { data: [{ reason: "requested_by_customer" }] },
    ...overrides,
  } as unknown as Stripe.Charge;
}

describe("handleChargeRefunded", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("returns early if no payment_intent on charge", async () => {
    const charge = makeCharge({ payment_intent: null as any });
    await handleChargeRefunded(charge, mockSupa.client as any);

    expect(console.error).toHaveBeenCalledWith(
      "No payment intent on refunded charge:",
      "ch_test_123"
    );
    expect(mockSupa.client.from).not.toHaveBeenCalled();
  });

  it("returns early if no coin transaction found for payment intent", async () => {
    const charge = makeCharge();
    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({ data: null });

    await handleChargeRefunded(charge, mockSupa.client as any);

    expect(console.log).toHaveBeenCalledWith(
      "Refund received for non-coin payment:",
      "pi_test_456",
      "charge:",
      "ch_test_123"
    );
  });

  it("skips duplicate refund (idempotency check)", async () => {
    const charge = makeCharge();
    mockSupa.chainable.maybeSingle
      .mockResolvedValueOnce({ data: { id: "tx_1", actor_id: "actor_1", amount: 100, action: "purchase" } })
      .mockResolvedValueOnce({ data: { id: "refund_existing" } });

    await handleChargeRefunded(charge, mockSupa.client as any);

    expect(console.log).toHaveBeenCalledWith(
      "Duplicate refund webhook ignored for charge:",
      "ch_test_123"
    );
    expect(mockSupa.client.rpc).not.toHaveBeenCalled();
  });

  it("deducts full amount via add_coins RPC", async () => {
    const charge = makeCharge();
    mockSupa.chainable.maybeSingle
      .mockResolvedValueOnce({ data: { id: "tx_1", actor_id: "actor_1", amount: 100, action: "purchase" } })
      .mockResolvedValueOnce({ data: null });

    mockSupa.client.rpc.mockResolvedValue({ data: null, error: null });

    await handleChargeRefunded(charge, mockSupa.client as any);

    expect(mockSupa.client.rpc).toHaveBeenCalledWith("add_coins", {
      p_actor_id: "actor_1",
      p_amount: -100,
      p_action: "refund",
      p_metadata: expect.objectContaining({
        original_transaction_id: "tx_1",
        stripe_charge_id: "ch_test_123",
        stripe_payment_intent: "pi_test_456",
      }),
    });

    expect(console.log).toHaveBeenCalledWith(
      "Coins deducted for refund:",
      100,
      "actor:",
      "actor_1",
      "charge:",
      "ch_test_123"
    );
  });

  it("logs error when rpc fails", async () => {
    const charge = makeCharge();
    mockSupa.chainable.maybeSingle
      .mockResolvedValueOnce({ data: { id: "tx_1", actor_id: "actor_1", amount: 50, action: "purchase" } })
      .mockResolvedValueOnce({ data: null });

    mockSupa.client.rpc.mockResolvedValue({ data: null, error: { message: "constraint violation" } });

    await handleChargeRefunded(charge, mockSupa.client as any);

    expect(console.error).toHaveBeenCalledWith(
      "Failed to deduct coins for refund (balance may be insufficient):",
      expect.objectContaining({
        actor_id: "actor_1",
        amount: 50,
      })
    );
  });
});

describe("handleChargeDisputeCreated", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("suspends fan account on dispute", async () => {
    const dispute = {
      id: "dp_test_1",
      charge: "ch_test_1",
      amount: 1000,
      reason: "fraudulent",
      status: "needs_response",
    } as unknown as Stripe.Dispute;

    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({
      payment_intent: "pi_test_1",
    });

    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({
      data: { actor_id: "fan_actor_1" },
    });

    await handleChargeDisputeCreated(dispute, mockSupa.client as any);

    expect(mockSupa.client.from).toHaveBeenCalledWith("fans");
    expect(mockSupa.chainable.update).toHaveBeenCalledWith({ is_suspended: true });

    expect(console.log).toHaveBeenCalledWith(
      "Account flagged/suspended due to dispute:",
      "fan_actor_1",
      "dispute:",
      "dp_test_1"
    );
  });
});

describe("handleChargeDisputeClosed", () => {
  let mockSupa: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupa = createMockSupabase();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("unsuspends account when dispute is won", async () => {
    const dispute = {
      id: "dp_test_1",
      charge: "ch_test_1",
      status: "won",
    } as unknown as Stripe.Dispute;

    (stripe.charges.retrieve as ReturnType<typeof vi.fn>).mockResolvedValue({
      payment_intent: "pi_test_1",
    });

    mockSupa.chainable.maybeSingle.mockResolvedValueOnce({
      data: { actor_id: "fan_actor_1" },
    });

    await handleChargeDisputeClosed(dispute, mockSupa.client as any);

    expect(mockSupa.chainable.update).toHaveBeenCalledWith({ is_suspended: false });
    expect(console.log).toHaveBeenCalledWith(
      "Account unsuspended after dispute won:",
      "fan_actor_1"
    );
  });

  it("does not unsuspend when dispute is lost", async () => {
    const dispute = {
      id: "dp_test_1",
      charge: "ch_test_1",
      status: "lost",
    } as unknown as Stripe.Dispute;

    await handleChargeDisputeClosed(dispute, mockSupa.client as any);

    expect(stripe.charges.retrieve).not.toHaveBeenCalled();
    expect(mockSupa.chainable.update).not.toHaveBeenCalled();
  });
});
