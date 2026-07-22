-- First-cashout minimum: 100 coins ($10) for a model's FIRST payout,
-- 500 coins ($50) for every payout after that.
-- Migration: 20260722000801_first_cashout_minimum.sql
--
-- WHY: the 500-coin floor was a wall for activation — a model's first $20
-- of earnings felt unreachable. Lowering ONLY the first cashout to $10
-- lets new models feel real money fast while keeping the $50 repeat
-- minimum that caps payout-processing overhead.
--
-- "First cashout" = zero prior rows in withdrawal_requests with
-- status = 'completed' for this model. Pending/processing/failed/cancelled
-- rows do NOT burn the exception (a cancelled first attempt shouldn't
-- strand a model at the $50 floor). A model can therefore file more than
-- one sub-500 request before the first completes — harmless: each request
-- is balance-gated and moves coins into withheld_balance, so total
-- exposure never exceeds their real balance.
--
-- ENFORCEMENT MATRIX (all layers must agree — this file owns 1 and 2):
--   1. DB CHECK constraint on withdrawal_requests.coins  (below: >= 100)
--   2. create_withdrawal_request + create_payoneer_withdrawal_request
--      SECURITY DEFINER RPCs (below: v_min_coins branch)
--   3. src/lib/coin-config.ts — FIRST_CASHOUT_MIN_COINS / minWithdrawalCoins()
--   4. src/app/(dashboard)/wallet/page.tsx — client toast pre-check
--   5. src/components/wallet/PayoutsTab.tsx — input min / disabled / copy
--   6. src/lib/email.ts — coin-balance reminder copy
--
-- GRANT POSTURE (deliberate, documented deviation from the money-RPC
-- service-role-only convention of 20260611000001): BOTH withdrawal RPCs
-- are intentionally called from the browser with the caller's session
-- (wallet/page.tsx) and self-authorize via `auth.uid()` ownership +
-- identity_verified_at checks INSIDE the function. Making them
-- service-role-only would break them outright — under the service role
-- auth.uid() IS NULL and the ownership check can never match. So we
-- re-assert EXECUTE for authenticated (and service_role) and instead
-- tighten the previously-unrevoked PUBLIC/anon default away.

-- ============================================================
-- 1. RELAX THE TABLE CHECK CONSTRAINT  (coins >= 500  →  >= 100)
-- ============================================================
-- 00010_wallet_payouts.sql created it inline (`coins INTEGER NOT NULL
-- CHECK (coins >= 500)`), which Postgres auto-names
-- withdrawal_requests_coins_check. Resolve the name dynamically (and drop
-- every matching coins-floor CHECK) in case the live name ever drifted —
-- a silently-surviving 500-floor CHECK would make every first cashout
-- fail at INSERT even though the RPC approved it.

DO $$
DECLARE
  v_con RECORD;
BEGIN
  FOR v_con IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.withdrawal_requests'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%coins%>=%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.withdrawal_requests DROP CONSTRAINT %I',
      v_con.conname
    );
  END LOOP;
END $$;

ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT withdrawal_requests_coins_check CHECK (coins >= 100);

COMMENT ON CONSTRAINT withdrawal_requests_coins_check
  ON public.withdrawal_requests IS
  'Absolute floor = FIRST-cashout minimum (100 coins / $10). The 500-coin repeat minimum is enforced per-model inside create_withdrawal_request / create_payoneer_withdrawal_request. Keep in sync with FIRST_CASHOUT_MIN_COINS / MIN_WITHDRAWAL_COINS in src/lib/coin-config.ts.';

-- ============================================================
-- 2a. create_withdrawal_request (bank / Zelle)
-- ============================================================
-- Identical to the 20260612000005 version except the minimum check:
-- ownership gate, KYC gate, balance lock, coin_balance→withheld_balance
-- move, and the Zelle/bank fallback are all unchanged.

CREATE OR REPLACE FUNCTION public.create_withdrawal_request(
    p_model_id UUID,
    p_coins INTEGER,
    p_bank_account_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance INTEGER;
    v_bank_id UUID;
    v_withdrawal_id UUID;
    v_usd DECIMAL(10, 2);
    v_model_user_id UUID;
    v_zelle_info TEXT;
    v_identity_verified_at TIMESTAMPTZ;
    v_has_completed_withdrawal BOOLEAN;
    v_min_coins INTEGER;
BEGIN
    -- SECURITY: Verify the caller owns this model record
    SELECT user_id, zelle_info, identity_verified_at
    INTO v_model_user_id, v_zelle_info, v_identity_verified_at
    FROM public.models
    WHERE id = p_model_id;

    IF v_model_user_id IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

    IF v_model_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only withdraw from your own account';
    END IF;

    -- SECURITY: Require completed identity verification before any payout
    IF v_identity_verified_at IS NULL THEN
        RAISE EXCEPTION 'Identity verification is required before requesting a payout. Please verify your identity first.';
    END IF;

    -- Minimum check: first-ever cashout 100 coins ($10), repeat 500 ($50).
    -- "First" = no prior COMPLETED withdrawal for this model (cancelled /
    -- failed attempts do not burn the exception).
    SELECT EXISTS (
        SELECT 1 FROM public.withdrawal_requests
        WHERE model_id = p_model_id AND status = 'completed'
    ) INTO v_has_completed_withdrawal;

    v_min_coins := CASE WHEN v_has_completed_withdrawal THEN 500 ELSE 100 END;

    IF p_coins < v_min_coins THEN
        IF v_has_completed_withdrawal THEN
            RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
        ELSE
            RAISE EXCEPTION 'Minimum first withdrawal is 100 coins ($10)';
        END IF;
    END IF;

    -- Check available balance (lock row for update)
    SELECT coin_balance INTO v_balance
    FROM public.models
    WHERE id = p_model_id
    FOR UPDATE;

    IF v_balance < p_coins THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_balance, p_coins;
    END IF;

    -- Get bank account (optional — Zelle models may not have one)
    v_bank_id := COALESCE(p_bank_account_id, (
        SELECT id FROM public.bank_accounts
        WHERE model_id = p_model_id AND is_primary = true
        LIMIT 1
    ));

    -- Require either a bank account or Zelle info
    IF v_bank_id IS NULL AND (v_zelle_info IS NULL OR v_zelle_info = '') THEN
        RAISE EXCEPTION 'No payout method found. Please add your Zelle info or a bank account.';
    END IF;

    -- Calculate USD
    v_usd := p_coins * 0.10;

    -- Move coins from available to withheld
    UPDATE public.models
    SET
        coin_balance = coin_balance - p_coins,
        withheld_balance = COALESCE(withheld_balance, 0) + p_coins
    WHERE id = p_model_id;

    -- Create withdrawal request (bank_account_id may be null for Zelle)
    INSERT INTO public.withdrawal_requests (model_id, bank_account_id, coins, usd_amount)
    VALUES (p_model_id, v_bank_id, p_coins, v_usd)
    RETURNING id INTO v_withdrawal_id;

    RETURN v_withdrawal_id;
END;
$$;

-- ============================================================
-- 2b. create_payoneer_withdrawal_request
-- ============================================================
-- Same change: only the minimum check differs from 20260612000005.

CREATE OR REPLACE FUNCTION public.create_payoneer_withdrawal_request(
    p_model_id UUID,
    p_coins INTEGER,
    p_payoneer_account_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance INTEGER;
    v_payoneer_status TEXT;
    v_withdrawal_id UUID;
    v_usd DECIMAL(10, 2);
    v_model_user_id UUID;
    v_identity_verified_at TIMESTAMPTZ;
    v_has_completed_withdrawal BOOLEAN;
    v_min_coins INTEGER;
BEGIN
    -- SECURITY: Verify the caller owns this model record
    SELECT user_id, identity_verified_at
    INTO v_model_user_id, v_identity_verified_at
    FROM public.models
    WHERE id = p_model_id;

    IF v_model_user_id IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

    IF v_model_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only withdraw from your own account';
    END IF;

    -- SECURITY: Require completed identity verification before any payout
    IF v_identity_verified_at IS NULL THEN
        RAISE EXCEPTION 'Identity verification is required before requesting a payout. Please verify your identity first.';
    END IF;

    -- Minimum check: first-ever cashout 100 coins ($10), repeat 500 ($50).
    SELECT EXISTS (
        SELECT 1 FROM public.withdrawal_requests
        WHERE model_id = p_model_id AND status = 'completed'
    ) INTO v_has_completed_withdrawal;

    v_min_coins := CASE WHEN v_has_completed_withdrawal THEN 500 ELSE 100 END;

    IF p_coins < v_min_coins THEN
        IF v_has_completed_withdrawal THEN
            RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
        ELSE
            RAISE EXCEPTION 'Minimum first withdrawal is 100 coins ($10)';
        END IF;
    END IF;

    -- Check Payoneer account is active and belongs to this model
    SELECT status INTO v_payoneer_status
    FROM public.payoneer_accounts
    WHERE id = p_payoneer_account_id AND model_id = p_model_id;

    IF v_payoneer_status IS NULL THEN
        RAISE EXCEPTION 'Payoneer account not found';
    END IF;

    IF v_payoneer_status != 'active' THEN
        RAISE EXCEPTION 'Payoneer account is not active. Please complete your Payoneer setup.';
    END IF;

    -- Check available balance (lock row for update)
    SELECT coin_balance INTO v_balance
    FROM public.models
    WHERE id = p_model_id
    FOR UPDATE;

    IF v_balance < p_coins THEN
        RAISE EXCEPTION 'Insufficient balance. Available: %, Requested: %', v_balance, p_coins;
    END IF;

    -- Calculate USD
    v_usd := p_coins * 0.10;

    -- Move coins from available to withheld
    UPDATE public.models
    SET
        coin_balance = coin_balance - p_coins,
        withheld_balance = COALESCE(withheld_balance, 0) + p_coins
    WHERE id = p_model_id;

    -- Create withdrawal request
    INSERT INTO public.withdrawal_requests (
        model_id,
        payoneer_account_id,
        coins,
        usd_amount,
        payout_method
    )
    VALUES (p_model_id, p_payoneer_account_id, p_coins, v_usd, 'payoneer')
    RETURNING id INTO v_withdrawal_id;

    RETURN v_withdrawal_id;
END;
$$;

-- ============================================================
-- 3. GRANTS — keep the client-callable posture, drop PUBLIC/anon
-- ============================================================
-- CREATE OR REPLACE preserves an existing ACL, but re-assert explicitly so
-- the intended posture is self-documenting. Do NOT revoke authenticated:
-- these two RPCs are session-called by design (see header).

REVOKE ALL ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) TO service_role;

-- ============================================================
-- 4. DRY-RUN SCRIPT (run BEFORE applying to prod, per the plpgsql
--    dry-run discipline — plpgsql does not validate table/column refs at
--    CREATE time; convert_model_wallet_to_fan shipped broken for 6 days
--    because nobody executed it). Paste the block below into the
--    Management API SQL endpoint in the SAME session/transaction AFTER
--    running this migration's statements, or run it against a branch DB.
--    It exercises both new v_min_coins branches against real tables and
--    ALWAYS rolls back via the final RAISE EXCEPTION.
--
-- Notes for the runner:
--   * Under the Management API auth.uid() is NULL, so the ownership check
--     (`v_model_user_id != auth.uid()`) is NULL → not true → passes, which
--     lets the dry run reach the minimum check. Pick a CLAIMED,
--     IDENTITY-VERIFIED model id or the KYC gate raises first.
--   * Expected output: two NOTICEs confirming the new error strings, then
--     'DRY RUN COMPLETE — rolling back'.
--
-- DO $$
-- DECLARE
--   v_model_id uuid;
--   v_dummy uuid;
-- BEGIN
--   -- an identity-verified claimed model with NO completed withdrawals
--   SELECT m.id INTO v_model_id
--   FROM public.models m
--   WHERE m.user_id IS NOT NULL
--     AND m.identity_verified_at IS NOT NULL
--     AND NOT EXISTS (
--       SELECT 1 FROM public.withdrawal_requests w
--       WHERE w.model_id = m.id AND w.status = 'completed'
--     )
--   LIMIT 1;
--   IF v_model_id IS NULL THEN
--     RAISE EXCEPTION 'DRY RUN: no eligible first-cashout model found — pick one manually';
--   END IF;
--
--   -- Branch 1: first-cashout model, 99 coins must be rejected with the $10 message
--   BEGIN
--     v_dummy := public.create_withdrawal_request(v_model_id, 99, NULL);
--     RAISE EXCEPTION 'DRY RUN FAILED: 99 coins was accepted for a first cashout';
--   EXCEPTION WHEN OTHERS THEN
--     IF SQLERRM LIKE 'Minimum first withdrawal is 100 coins%' THEN
--       RAISE NOTICE 'OK first-cashout branch: %', SQLERRM;
--     ELSE
--       RAISE;  -- unexpected error — surface it
--     END IF;
--   END;
--
--   -- Branch 2: repeat model (has a completed withdrawal), 499 must get the $50 message
--   SELECT m.id INTO v_model_id
--   FROM public.models m
--   WHERE m.user_id IS NOT NULL
--     AND m.identity_verified_at IS NOT NULL
--     AND EXISTS (
--       SELECT 1 FROM public.withdrawal_requests w
--       WHERE w.model_id = m.id AND w.status = 'completed'
--     )
--   LIMIT 1;
--   IF v_model_id IS NULL THEN
--     RAISE NOTICE 'DRY RUN: no repeat-withdrawal model in DB — branch 2 skipped';
--   ELSE
--     BEGIN
--       v_dummy := public.create_withdrawal_request(v_model_id, 499, NULL);
--       RAISE EXCEPTION 'DRY RUN FAILED: 499 coins was accepted for a repeat cashout';
--     EXCEPTION WHEN OTHERS THEN
--       IF SQLERRM LIKE 'Minimum withdrawal is 500 coins%' THEN
--         RAISE NOTICE 'OK repeat branch: %', SQLERRM;
--       ELSE
--         RAISE;
--       END IF;
--     END;
--   END IF;
--
--   RAISE EXCEPTION 'DRY RUN COMPLETE — rolling back';
-- END $$;
