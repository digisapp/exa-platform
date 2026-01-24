-- Restrict withdrawals to models only
-- Migration: 20260124000001_restrict_withdrawals_to_models.sql
--
-- This migration updates the withdrawal functions to explicitly verify
-- that only models can create withdrawal requests. Fans and brands cannot withdraw.

-- ==============================================
-- UPDATE create_withdrawal_request FUNCTION
-- Add verification that caller is the model owner
-- ==============================================

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
BEGIN
    -- SECURITY: Verify the caller owns this model record
    SELECT user_id INTO v_model_user_id
    FROM public.models
    WHERE id = p_model_id;

    IF v_model_user_id IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

    IF v_model_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only withdraw from your own account';
    END IF;

    -- Minimum check
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

    -- Get bank account
    v_bank_id := COALESCE(p_bank_account_id, (
        SELECT id FROM public.bank_accounts
        WHERE model_id = p_model_id AND is_primary = true
        LIMIT 1
    ));

    IF v_bank_id IS NULL THEN
        RAISE EXCEPTION 'No bank account found. Please add a bank account first.';
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
    INSERT INTO public.withdrawal_requests (model_id, bank_account_id, coins, usd_amount)
    VALUES (p_model_id, v_bank_id, p_coins, v_usd)
    RETURNING id INTO v_withdrawal_id;

    RETURN v_withdrawal_id;
END;
$$;

-- ==============================================
-- UPDATE create_payoneer_withdrawal_request FUNCTION
-- Add verification that caller is the model owner
-- ==============================================

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
BEGIN
    -- SECURITY: Verify the caller owns this model record
    SELECT user_id INTO v_model_user_id
    FROM public.models
    WHERE id = p_model_id;

    IF v_model_user_id IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

    IF v_model_user_id != auth.uid() THEN
        RAISE EXCEPTION 'You can only withdraw from your own account';
    END IF;

    -- Minimum check
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

-- ==============================================
-- COMMENT: Security Summary
-- ==============================================
--
-- Only models can withdraw coins because:
-- 1. The withdrawal functions verify auth.uid() matches the model's user_id
-- 2. Fans don't have model records, so they can't pass a valid model_id
-- 3. Brands don't have model records, so they can't pass a valid model_id
-- 4. The UI also hides withdrawal options for non-model users
--
-- Fans and brands can only BUY coins, never withdraw them.
