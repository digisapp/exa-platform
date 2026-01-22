-- Payoneer Integration for International Payouts
-- Migration: 20260122000008_payoneer_payouts.sql

-- ==============================================
-- PAYOUT METHODS TABLE
-- Stores model's payout preferences (bank, Payoneer, etc.)
-- ==============================================

-- Add payout method enum type
DO $$ BEGIN
    CREATE TYPE payout_method_type AS ENUM ('bank', 'payoneer', 'stripe_connect');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================
-- PAYONEER ACCOUNTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.payoneer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,

    -- Payoneer identifiers
    payee_id TEXT NOT NULL UNIQUE, -- Payoneer's payee ID
    email TEXT NOT NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    can_receive_payments BOOLEAN DEFAULT false,

    -- Model info (cached from Payoneer)
    first_name TEXT,
    last_name TEXT,
    country TEXT, -- ISO 3166-1 alpha-2

    -- Registration
    registration_link TEXT, -- Link for model to complete Payoneer setup
    registration_completed_at TIMESTAMPTZ,

    -- Preferences
    is_primary BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_model_id ON public.payoneer_accounts(model_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_payee_id ON public.payoneer_accounts(payee_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_accounts_status ON public.payoneer_accounts(status);

-- ==============================================
-- UPDATE WITHDRAWAL REQUESTS TABLE
-- Add support for different payout methods
-- ==============================================

-- Add payout method column to withdrawal_requests
ALTER TABLE public.withdrawal_requests
    ADD COLUMN IF NOT EXISTS payout_method TEXT DEFAULT 'bank'
    CHECK (payout_method IN ('bank', 'payoneer', 'stripe_connect'));

-- Add Payoneer-specific fields
ALTER TABLE public.withdrawal_requests
    ADD COLUMN IF NOT EXISTS payoneer_account_id UUID REFERENCES public.payoneer_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.withdrawal_requests
    ADD COLUMN IF NOT EXISTS payoneer_payout_id TEXT; -- Payoneer's payout reference

ALTER TABLE public.withdrawal_requests
    ADD COLUMN IF NOT EXISTS external_reference TEXT; -- Generic external reference

-- ==============================================
-- UPDATE MODELS TABLE
-- Add preferred payout method
-- ==============================================

ALTER TABLE public.models
    ADD COLUMN IF NOT EXISTS preferred_payout_method TEXT DEFAULT 'bank'
    CHECK (preferred_payout_method IN ('bank', 'payoneer', 'stripe_connect'));

ALTER TABLE public.models
    ADD COLUMN IF NOT EXISTS country_code TEXT; -- ISO 3166-1 alpha-2 for payout routing

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.payoneer_accounts ENABLE ROW LEVEL SECURITY;

-- Models can view their own Payoneer accounts
DROP POLICY IF EXISTS "Models can view own payoneer accounts" ON public.payoneer_accounts;
CREATE POLICY "Models can view own payoneer accounts" ON public.payoneer_accounts
    FOR SELECT USING (
        model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
    );

-- Models can insert their own Payoneer accounts
DROP POLICY IF EXISTS "Models can insert own payoneer accounts" ON public.payoneer_accounts;
CREATE POLICY "Models can insert own payoneer accounts" ON public.payoneer_accounts
    FOR INSERT WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Models can update their own Payoneer accounts
DROP POLICY IF EXISTS "Models can update own payoneer accounts" ON public.payoneer_accounts;
CREATE POLICY "Models can update own payoneer accounts" ON public.payoneer_accounts
    FOR UPDATE USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Models can delete their own Payoneer accounts
DROP POLICY IF EXISTS "Models can delete own payoneer accounts" ON public.payoneer_accounts;
CREATE POLICY "Models can delete own payoneer accounts" ON public.payoneer_accounts
    FOR DELETE USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Create Payoneer withdrawal request
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
BEGIN
    -- Minimum check
    IF p_coins < 500 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 500 coins ($50)';
    END IF;

    -- Check Payoneer account is active
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

    IF v_balance IS NULL THEN
        RAISE EXCEPTION 'Model not found';
    END IF;

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
-- PAYONEER PAYOUT TRACKING TABLE (for reconciliation)
-- ==============================================

CREATE TABLE IF NOT EXISTS public.payoneer_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    withdrawal_request_id UUID NOT NULL REFERENCES public.withdrawal_requests(id) ON DELETE CASCADE,
    payoneer_payout_id TEXT NOT NULL UNIQUE, -- Payoneer's payout ID
    payee_id TEXT NOT NULL, -- Payoneer's payee ID

    -- Amount
    amount_usd DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    failure_reason TEXT,

    -- Timestamps from Payoneer
    payoneer_created_at TIMESTAMPTZ,
    payoneer_completed_at TIMESTAMPTZ,

    -- Our timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_withdrawal_id ON public.payoneer_payouts(withdrawal_request_id);
CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_status ON public.payoneer_payouts(status);
CREATE INDEX IF NOT EXISTS idx_payoneer_payouts_payoneer_id ON public.payoneer_payouts(payoneer_payout_id);

-- RLS for payoneer_payouts
ALTER TABLE public.payoneer_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Models can view own payoneer payouts" ON public.payoneer_payouts;
CREATE POLICY "Models can view own payoneer payouts" ON public.payoneer_payouts
    FOR SELECT USING (
        withdrawal_request_id IN (
            SELECT id FROM withdrawal_requests WHERE model_id IN (
                SELECT id FROM models WHERE user_id = auth.uid()
            )
        )
        OR EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
    );

-- ==============================================
-- GRANTS
-- ==============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payoneer_accounts TO authenticated;
GRANT SELECT ON public.payoneer_payouts TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payoneer_withdrawal_request TO authenticated;
