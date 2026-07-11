# Stripe Connect Migration Plan (staged — DO NOT apply until go-live)

> **Status:** Dormant / reference only. Nothing in this document is wired into the
> running app. Every code block is written to drop into a real file at go-live.
> When you say "do Stripe Connect," we execute the **Go-Live Sequence** at the bottom.
>
> Written against your current stack: `stripe@^20.1.0`, apiVersion `2026-01-28.clover`,
> Stripe client at `@/lib/stripe`, Supabase service-role client at `@/lib/supabase/service`,
> withdrawal lifecycle in `withdrawal_requests` (`pending → processing → completed/failed/cancelled`).

---

## 1. The decision (and why)

**Product: Stripe Connect — Express accounts.**
- Express = Stripe hosts the onboarding UI and **does the KYC/AML/sanctions itself**, gives the model a lightweight payout dashboard, and you keep control of payout timing. Standard hands creators a full Stripe dashboard (overkill); Custom makes you rebuild all the onboarding UI (too much work). Express is the marketplace default.

**Money flow: Separate charges and transfers.**
- You already collect fan coin purchases into the **platform** Stripe balance. Connect does **not** change that. At payout time you create a **Transfer** from the platform balance to the model's connected account. This is the minimal-blast-radius choice: your coin economy, `coin_balance`, `withheld_balance`, and the whole fan side are untouched. Connect only replaces "how the money physically reaches the model."

**Connect becomes an *additional* payout method, not a replacement.**
- `payout_method` already allows `'bank' | 'payoneer' | 'stripe_connect'`. Payoneer stays for countries Connect doesn't cover; Zelle/bank stay as-is. Models pick their method; Connect is just the best option where available.

**Biggest win: the ID-hoarding problem deletes itself.**
- For Connect models, **Stripe does identity verification.** When Stripe reports `payouts_enabled = true`, we stamp the existing `models.identity_verified_at` automatically — so Connect models **never upload an ID to us**, and we **stop storing government documents** for them. The manual `/admin/verifications` flow remains only for Payoneer/Zelle models.

---

## 2. What changes vs. what stays

| Area | Stays the same | Changes |
|---|---|---|
| Fan coin purchases | ✅ entirely unchanged | — |
| `coin_balance` / `withheld_balance` accounting | ✅ unchanged | — |
| Withdrawal lifecycle (`pending→…→completed`) | ✅ unchanged | Completion of a `stripe_connect` request creates a Stripe Transfer |
| KYC payout gate (`identity_verified_at`) | ✅ still enforced in RPCs | Connect onboarding auto-satisfies it (no manual upload) |
| Manual ID upload + `/admin/verifications` | ✅ kept for Payoneer/Zelle | Bypassed for Connect models |
| Payoneer / Zelle / bank payouts | ✅ kept | Coexist with Connect |
| Admin payouts page | ✅ kept | "Complete" on a Connect row triggers a transfer instead of a manual bank push |

---

## 3. Database migration

Stage this as `supabase/migrations/<timestamp>_stripe_connect.sql` at go-live.
It is **purely additive** (new columns + one table + one RPC) — safe, no destructive changes.

```sql
-- Stripe Connect: connected-account state on models + payout linkage + creation RPC
-- Additive only. payout_method already allows 'stripe_connect' (20260122000008).

-- 1. Connect account state on models
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_requirements_due jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stripe_onboarded_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_models_stripe_account_id
  ON public.models (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN public.models.stripe_payouts_enabled IS
  'Stripe Connect reports the account can receive payouts (KYC cleared). When true we also stamp identity_verified_at.';

-- 2. Link a withdrawal row to its Stripe Transfer for reconciliation
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS stripe_payout_id text;

-- 3. Creation RPC for Connect withdrawals — mirrors create_withdrawal_request,
--    but gates on Stripe payout capability (which itself implies KYC).
CREATE OR REPLACE FUNCTION public.create_stripe_connect_withdrawal_request(
    p_model_id UUID,
    p_coins INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance INTEGER;
    v_withdrawal_id UUID;
    v_usd DECIMAL(10, 2);
    v_model_user_id UUID;
    v_payouts_enabled BOOLEAN;
    v_account_id TEXT;
BEGIN
    SELECT user_id, stripe_payouts_enabled, stripe_account_id
      INTO v_model_user_id, v_payouts_enabled, v_account_id
      FROM public.models
     WHERE id = p_model_id;

    IF v_model_user_id IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

    IF v_model_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only withdraw from your own account';
    END IF;

    -- Connect payout capability IS the KYC gate for this method.
    IF v_account_id IS NULL OR v_payouts_enabled IS NOT TRUE THEN
        RAISE EXCEPTION 'Your Stripe payout account is not ready. Please finish setting up payouts first.';
    END IF;

    IF p_coins < 500 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
    END IF;

    SELECT coin_balance INTO v_balance
      FROM public.models
     WHERE id = p_model_id
       FOR UPDATE;

    IF v_balance < p_coins THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_balance, p_coins;
    END IF;

    v_usd := p_coins * 0.10;

    UPDATE public.models
       SET coin_balance = coin_balance - p_coins,
           withheld_balance = COALESCE(withheld_balance, 0) + p_coins
     WHERE id = p_model_id;

    INSERT INTO public.withdrawal_requests (model_id, coins, usd_amount, payout_method)
    VALUES (p_model_id, p_coins, v_usd, 'stripe_connect')
    RETURNING id INTO v_withdrawal_id;

    RETURN v_withdrawal_id;
END;
$$;

-- Callable by the model (user-context) — auth.uid() ownership enforced inside.
GRANT EXECUTE ON FUNCTION public.create_stripe_connect_withdrawal_request(uuid, integer) TO authenticated;
```

> **Note on the gate:** the existing `complete_withdrawal` / `cancel_withdrawal` RPCs are
> method-agnostic (they just move coins between `withheld_balance` and out/back), so they
> need **no changes**. The transfer is created in the API layer *before* calling
> `complete_withdrawal`, so coins only leave `withheld` after Stripe accepts the transfer.

---

## 4. Stripe client helper

Stage as `src/lib/stripe/connect.ts`. Uses your existing `stripe` singleton.

```ts
import "server-only";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Countries where we offer Connect. Everything else falls back to Payoneer.
// Expand as you verify coverage in the Stripe dashboard.
export const CONNECT_SUPPORTED_COUNTRIES = new Set(["US", "MX", "GB", "CA"]);

/**
 * Create (or return) an Express connected account for a model.
 * `transfers` capability is what a receive-only marketplace account needs.
 */
export async function createExpressAccount(params: {
  countryCode: string;
  email?: string;
  modelId: string;
  username: string;
}): Promise<Stripe.Account> {
  const country = params.countryCode?.toUpperCase();
  if (!country || !CONNECT_SUPPORTED_COUNTRIES.has(country)) {
    throw new Error(`Stripe Connect is not available in country: ${country ?? "unknown"}`);
  }

  return stripe.accounts.create({
    type: "express",
    country,
    email: params.email,
    capabilities: { transfers: { requested: true } },
    business_type: "individual",
    business_profile: {
      product_description: "Creator earnings payout on EXA Models",
    },
    metadata: { model_id: params.modelId, username: params.username },
  });
}

/** Hosted onboarding link (expires ~a few minutes; regenerate on demand). */
export async function createOnboardingLink(params: {
  accountId: string;
  refreshUrl: string;
  returnUrl: string;
}): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });
  return link.url;
}

/** Express dashboard login link (for a model to manage their payout details). */
export async function createDashboardLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

/** Pull current capability state (used by onboarding return + as webhook fallback). */
export async function getAccountState(accountId: string) {
  const acct = await stripe.accounts.retrieve(accountId);
  return {
    detailsSubmitted: acct.details_submitted ?? false,
    chargesEnabled: acct.charges_enabled ?? false,
    payoutsEnabled: acct.payouts_enabled ?? false,
    requirementsDue: acct.requirements?.currently_due ?? [],
  };
}

/** Transfer platform funds to a model's connected account. amountUsd in dollars. */
export async function createTransfer(params: {
  accountId: string;
  amountUsd: number;
  currency?: string;
  withdrawalId: string;
}): Promise<Stripe.Transfer> {
  return stripe.transfers.create({
    amount: Math.round(params.amountUsd * 100), // cents
    currency: params.currency ?? "usd",
    destination: params.accountId,
    metadata: { withdrawal_id: params.withdrawalId },
  });
}
```

---

## 5. API routes

All three are new files; they don't exist until go-live, so they add zero live surface now.

### 5a. Start / resume onboarding — `src/app/api/connect/onboarding/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { createExpressAccount, createOnboardingLink } from "@/lib/stripe/connect";
import { checkEndpointRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const rl = await checkEndpointRateLimit(request, "general", user.id);
    if (rl) return rl;

    const { data: model } = await supabase
      .from("models")
      .select("id, username, country_code, stripe_account_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!model) return NextResponse.json({ error: "Model profile not found" }, { status: 404 });

    const admin = createServiceRoleClient();
    let accountId = model.stripe_account_id as string | null;

    // Create the connected account on first run.
    if (!accountId) {
      const acct = await createExpressAccount({
        countryCode: model.country_code || "US",
        email: user.email ?? undefined,
        modelId: model.id,
        username: model.username,
      });
      accountId = acct.id;
      await (admin as any).from("models").update({ stripe_account_id: accountId }).eq("id", model.id);
    }

    const origin = new URL(request.url).origin;
    const url = await createOnboardingLink({
      accountId,
      refreshUrl: `${origin}/api/connect/onboarding/refresh`,
      returnUrl: `${origin}/wallet?connect=return`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    logger.error("Connect onboarding error", error);
    return NextResponse.json({ error: "Failed to start payout setup" }, { status: 500 });
  }
}
```

### 5b. Onboarding refresh (link expiry bounce) — `src/app/api/connect/onboarding/refresh/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOnboardingLink } from "@/lib/stripe/connect";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: model } = await supabase
    .from("models").select("stripe_account_id").eq("user_id", user.id).maybeSingle();

  const origin = new URL(request.url).origin;
  if (!model?.stripe_account_id) return NextResponse.redirect(`${origin}/wallet`);

  const url = await createOnboardingLink({
    accountId: model.stripe_account_id,
    refreshUrl: `${origin}/api/connect/onboarding/refresh`,
    returnUrl: `${origin}/wallet?connect=return`,
  });
  return NextResponse.redirect(url);
}
```

### 5c. Sync-after-return (belt-and-suspenders with the webhook) — `src/app/api/connect/status/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { getAccountState } from "@/lib/stripe/connect";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: model } = await supabase
      .from("models")
      .select("id, stripe_account_id, stripe_payouts_enabled, stripe_details_submitted")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!model) return NextResponse.json({ error: "Model profile not found" }, { status: 404 });
    if (!model.stripe_account_id) return NextResponse.json({ status: "not_started" });

    const state = await getAccountState(model.stripe_account_id);

    // Reconcile DB with Stripe (webhook is primary; this covers the redirect race).
    const admin = createServiceRoleClient();
    const patch: Record<string, unknown> = {
      stripe_details_submitted: state.detailsSubmitted,
      stripe_charges_enabled: state.chargesEnabled,
      stripe_payouts_enabled: state.payoutsEnabled,
      stripe_requirements_due: state.requirementsDue,
    };
    if (state.payoutsEnabled) {
      patch.stripe_onboarded_at = new Date().toISOString();
      // Stripe did the KYC → satisfy the platform payout gate.
      patch.identity_verified_at = new Date().toISOString();
    }
    await (admin as any).from("models").update(patch).eq("id", model.id);

    return NextResponse.json({
      status: state.payoutsEnabled ? "ready" : state.detailsSubmitted ? "pending" : "incomplete",
      requirementsDue: state.requirementsDue,
    });
  } catch (error) {
    logger.error("Connect status error", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
```

---

## 6. Connect webhook (separate endpoint + secret)

Connect events for connected accounts carry `event.account`. Keep them on their own
endpoint with their own signing secret so they don't tangle with the platform webhook.

Stage as `src/app/api/webhooks/stripe-connect/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/service";
import Stripe from "stripe";
import { logger } from "@/lib/logger";

const admin = createServiceRoleClient();

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    logger.error("Connect webhook signature failed", err);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        const acct = event.data.object as Stripe.Account;
        const payoutsEnabled = acct.payouts_enabled ?? false;
        const patch: Record<string, unknown> = {
          stripe_details_submitted: acct.details_submitted ?? false,
          stripe_charges_enabled: acct.charges_enabled ?? false,
          stripe_payouts_enabled: payoutsEnabled,
          stripe_requirements_due: acct.requirements?.currently_due ?? [],
        };
        if (payoutsEnabled) {
          patch.stripe_onboarded_at = new Date().toISOString();
          patch.identity_verified_at = new Date().toISOString(); // Stripe did KYC
        }
        await (admin as any).from("models").update(patch).eq("stripe_account_id", acct.id);
        break;
      }
      case "transfer.reversed": {
        // A transfer was reversed (e.g. dispute/refund upstream). Flag for review.
        const tr = event.data.object as Stripe.Transfer;
        await (admin as any)
          .from("withdrawal_requests")
          .update({ status: "failed", failure_reason: "Stripe transfer reversed" })
          .eq("stripe_transfer_id", tr.id);
        break;
      }
      case "payout.paid":
      case "payout.failed": {
        // Optional: surface the model's bank payout state. event.account is the model.
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Connect webhook handler error", error);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}
```

---

## 7. Completion path — create the Transfer

At go-live, edit the `status === "completed"` branch of
`src/app/api/admin/payouts/[id]/route.ts` so a `stripe_connect` request creates a
Stripe Transfer **before** `complete_withdrawal` moves coins out of `withheld`.

```ts
// inside the status === "completed" branch, after fetching `withdrawal`
// (withdrawal now also selects: payout_method, stripe_account?, stripe...)

if (withdrawal?.payout_method === "stripe_connect") {
  // Fetch the model's connected account id
  const { data: m } = await adminClient
    .from("models")
    .select("stripe_account_id, stripe_payouts_enabled")
    .eq("id", withdrawal.model_id)
    .single();

  if (!m?.stripe_account_id || !m.stripe_payouts_enabled) {
    return NextResponse.json({ error: "Model's Stripe payout account is not ready" }, { status: 400 });
  }

  let transfer;
  try {
    const { createTransfer } = await import("@/lib/stripe/connect");
    transfer = await createTransfer({
      accountId: m.stripe_account_id,
      amountUsd: withdrawal.coins * 0.10,
      withdrawalId: id,
    });
  } catch (e) {
    // Do NOT complete — coins stay in withheld, admin can retry.
    console.error("Stripe transfer failed:", e);
    return NextResponse.json({ error: "Stripe transfer failed — not completed" }, { status: 502 });
  }

  await adminClient
    .from("withdrawal_requests")
    .update({ stripe_transfer_id: transfer.id })
    .eq("id", id);
  // fall through to complete_withdrawal (moves coins out of withheld)
}
```

> The existing `complete_withdrawal` call stays exactly as-is right after this block.
> Order matters: transfer first, then complete. If the transfer throws, we return early
> and coins remain in `withheld_balance` — no double-spend, safe retry.

---

## 8. Wallet UI wiring

In `src/app/(dashboard)/wallet/page.tsx`:

1. Widen the method state:
   ```ts
   const [selectedPayoutMethod, setSelectedPayoutMethod] =
     useState<'bank' | 'payoneer' | 'stripe_connect'>('bank');
   ```
2. Add a Connect option to the payout-method picker, shown when
   `CONNECT_SUPPORTED_COUNTRIES.has(model.country_code)`.
3. If the model isn't onboarded (`!stripe_payouts_enabled`), the button says
   **"Set up instant payouts"** → `POST /api/connect/onboarding` → redirect to `url`.
   If onboarded, the withdraw button calls the new RPC:
   ```ts
   const { data, error } = await (supabase.rpc as any)("create_stripe_connect_withdrawal_request", {
     p_model_id: modelId,
     p_coins: coins,
   });
   ```
4. On `?connect=return`, call `GET /api/connect/status` once to reconcile and show
   "Payouts ready ✅" or "Stripe still needs: {requirementsDue}".

The `/verify-identity` manual upload page stays, but for Connect-eligible models the
wallet routes them to Stripe instead — they never see it.

---

## 9. Environment variables (set at go-live)

```
# Already present:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...            # platform webhook (coin purchases)

# New for Connect:
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...    # the Connect endpoint's signing secret
```

No publishable-key changes needed — onboarding is a hosted redirect.

---

## 10. Stripe Dashboard checklist (do once, in test mode first)

1. **Enable Connect** (Settings → Connect). Choose platform profile.
2. Set the **Express** branding (logo, color, support email/URL) — this is what models see.
3. Add webhook endpoint → `https://examodels.com/api/webhooks/stripe-connect`, listening
   to **events on connected accounts**: `account.updated`, `transfer.reversed`,
   `payout.paid`, `payout.failed`. Copy its signing secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.
4. Confirm your **platform balance** funding: coin-purchase charges must settle into the
   available balance you'll transfer from. (Transfers fail if available balance < transfer amount.)
5. Review **Connect pricing** (Express monthly active-account fee + payout fees) so you know
   the unit economics before flipping it on.

---

## 11. Testing checklist (Stripe test mode)

- [ ] `POST /api/connect/onboarding` creates an account + returns a hosted link.
- [ ] Complete Stripe's **test onboarding** (use test SSN `000-00-0000`, routing `110000000`, acct `000123456789`).
- [ ] `account.updated` webhook fires → model row shows `stripe_payouts_enabled = true` and `identity_verified_at` stamped.
- [ ] `GET /api/connect/status` returns `ready`.
- [ ] Withdraw ≥ 500 coins via the new RPC → row created `pending`, coins moved to `withheld`.
- [ ] Admin marks **completed** → `transfers.create` succeeds, `stripe_transfer_id` saved, coins leave `withheld`.
- [ ] Force a transfer failure (insufficient platform balance) → request stays uncompleted, coins stay in `withheld`.
- [ ] Unverified/unonboarded model → RPC rejects with the "payout account not ready" error.
- [ ] Payoneer/Zelle withdrawal still works unchanged (regression check).
- [ ] `transfer.reversed` marks the withdrawal `failed`.

---

## 12. Edge cases / gotchas (already accounted for)

- **KYC gate reconciliation:** Connect payout-enabled ⇒ we stamp `identity_verified_at`, so the *existing* gate on the other RPCs still holds and nothing about the manual flow breaks.
- **Refund / clawback interaction:** your model allows negative fan balances and coin clawbacks. Once coins are transferred + paid out via Connect they're gone from your control, so keep the **admin-approved completion step** (don't auto-transfer on request) — it's your fraud/refund checkpoint. `withheld_balance` already isolates in-flight coins.
- **Transfer before complete:** enforced ordering means a failed transfer never loses coins.
- **Country coverage:** `CONNECT_SUPPORTED_COUNTRIES` gates the UI; unsupported countries fall back to Payoneer automatically. Expand the set as you verify each country in Stripe.
- **Account restricted later:** `account.updated` with `payouts_enabled=false` flips the model back to un-ready; the RPC will then block new withdrawals until they resolve Stripe's `requirements_due`.
- **Idempotency:** webhook handlers are keyed by `stripe_account_id` / `stripe_transfer_id` (idempotent upserts), so Stripe redelivery is safe.
- **`identity-documents` cleanup:** once Connect is the default, add a one-time script to purge stored ID scans for models who are now Connect-verified (closes the retention liability entirely).

---

## 13. Go-Live Sequence (what "do Stripe Connect" executes)

1. Enable Connect + Express branding in Stripe **test mode**; add the Connect webhook; set `STRIPE_CONNECT_WEBHOOK_SECRET` in a preview env.
2. Create the migration file from §3 and `supabase db push` to a **branch/preview** DB.
3. Create the real files from §4, §5, §6; apply the §7 and §8 edits.
4. Run the full §11 testing checklist in test mode end-to-end.
5. Flip Stripe to **live**, set live `STRIPE_CONNECT_WEBHOOK_SECRET` in Vercel, apply the migration to prod (`supabase db push`), deploy.
6. Soft-launch: enable the Connect option for **US models only** (or a single test model), watch one real payout settle, then widen `CONNECT_SUPPORTED_COUNTRIES`.
7. Once stable, run the ID-document purge for Connect-verified models (§12).

## 14. Rollback

Connect is purely additive and behind a payout-method choice, so rollback = stop
offering the `stripe_connect` option in the wallet UI. Existing `bank`/`payoneer`
withdrawals are untouched. No data migration to reverse; the new columns/table are inert
if unused.
```

---

**Effort at go-live:** ~1 focused day of build + a half-day of test-mode verification,
assuming the Stripe Connect account is approved and enabled.
