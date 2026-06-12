import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/lib/supabase/service", () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle }),
      }),
    }),
  }),
}));

import { assertNotSuspended } from "../suspension";

describe("assertNotSuspended", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a 403 response for a suspended fan", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { is_suspended: true } });
    const res = await assertNotSuspended("actor_1");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("returns null for a fan that is not suspended", async () => {
    maybeSingle.mockResolvedValueOnce({ data: { is_suspended: false } });
    expect(await assertNotSuspended("actor_1")).toBeNull();
  });

  it("returns null for a non-fan actor (no fans row)", async () => {
    maybeSingle.mockResolvedValueOnce({ data: null });
    expect(await assertNotSuspended("model_actor")).toBeNull();
  });
});
