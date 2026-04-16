-- Allow withdrawals without a bank account (for Zelle-only models)
-- The bank_account_id is optional — admin sees the model's Zelle info and pays via Zelle

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
BEGIN
    -- SECURITY: Verify the caller owns this model record
    SELECT user_id, zelle_info INTO v_model_user_id, v_zelle_info
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
