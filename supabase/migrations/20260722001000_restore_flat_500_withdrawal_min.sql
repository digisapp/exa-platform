-- Restore the flat 500-coin ($50) withdrawal minimum for ALL payouts.
-- Reverts 20260722000801 (the $10 first-cashout exception) same-day by
-- owner decision: "gotta be $50 min". Do not reintroduce a lower
-- first-payout tier without an explicit owner request.
--
-- Verified before applying: zero withdrawal_requests rows with
-- coins < 500 exist, so re-tightening the CHECK cannot fail validation.
--
-- ENFORCEMENT MATRIX after this migration:
--   1. DB CHECK constraint on withdrawal_requests.coins  (>= 500)
--   2. create_withdrawal_request + create_payoneer_withdrawal_request
--      (flat 500 check, no first-cashout branch)
--   3. src/lib/coin-config.ts — MIN_WITHDRAWAL_COINS
--   4. wallet/PayoutsTab UI copy
--
-- GRANT POSTURE unchanged from 20260722000801: both RPCs are deliberately
-- authenticated-callable (they self-authorize via auth.uid() inside);
-- PUBLIC/anon stay revoked.

-- ============================================================
-- 1. RE-TIGHTEN THE TABLE CHECK CONSTRAINT  (coins >= 100  →  >= 500)
-- ============================================================
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
  ADD CONSTRAINT withdrawal_requests_coins_check CHECK (coins >= 500);

COMMENT ON CONSTRAINT withdrawal_requests_coins_check
  ON public.withdrawal_requests IS
  'Flat payout floor: 500 coins ($50) for every withdrawal. Keep in sync with MIN_WITHDRAWAL_COINS in src/lib/coin-config.ts.';

-- ============================================================
-- 2a. create_withdrawal_request (bank / Zelle) — flat 500 minimum
-- ============================================================
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

    IF p_coins < 500 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
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
-- 2b. create_payoneer_withdrawal_request — flat 500 minimum
-- ============================================================
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

    IF p_coins < 500 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
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
-- 3. GRANTS — unchanged posture, re-asserted after CREATE OR REPLACE
-- ============================================================
REVOKE ALL ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request(UUID, INTEGER, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payoneer_withdrawal_request(UUID, INTEGER, UUID) TO service_role;
