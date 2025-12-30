-- Wallet System: Bank Accounts and Withdrawal Requests
-- Migration: 00010_wallet_payouts.sql

-- ==============================================
-- BANK ACCOUNTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,

    -- Bank details
    account_holder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number_last4 TEXT NOT NULL,
    routing_number TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('checking', 'savings')),

    -- Status
    is_verified BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_model_id ON public.bank_accounts(model_id);

-- ==============================================
-- WITHDRAWAL REQUESTS TABLE
-- ==============================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,

    -- Amount (minimum $50 = 1000 coins at $0.05/coin)
    coins INTEGER NOT NULL CHECK (coins >= 1000),
    usd_amount DECIMAL(10, 2) NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
    ),

    -- Admin fields
    admin_notes TEXT,
    failure_reason TEXT,
    processed_by UUID,

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_model_id ON public.withdrawal_requests(model_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON public.withdrawal_requests(status);

-- ==============================================
-- ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Bank Accounts policies
CREATE POLICY "Models can view own bank accounts" ON public.bank_accounts
    FOR SELECT USING (
        model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
    );

CREATE POLICY "Models can insert own bank accounts" ON public.bank_accounts
    FOR INSERT WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Models can update own bank accounts" ON public.bank_accounts
    FOR UPDATE USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Models can delete own bank accounts" ON public.bank_accounts
    FOR DELETE USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Withdrawal Requests policies
CREATE POLICY "Models can view own withdrawals" ON public.withdrawal_requests
    FOR SELECT USING (
        model_id IN (SELECT id FROM models WHERE user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin')
    );

CREATE POLICY "Models can create withdrawals" ON public.withdrawal_requests
    FOR INSERT WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

CREATE POLICY "Admins can update withdrawals" ON public.withdrawal_requests
    FOR UPDATE USING (EXISTS (SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin'));

-- ==============================================
-- FUNCTIONS
-- ==============================================

-- Create withdrawal request
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
BEGIN
    IF p_coins < 1000 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 1000 coins ($50)';
    END IF;

    SELECT coin_balance INTO v_balance FROM public.models WHERE id = p_model_id FOR UPDATE;

    IF v_balance < p_coins THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    v_bank_id := COALESCE(p_bank_account_id, (
        SELECT id FROM public.bank_accounts WHERE model_id = p_model_id AND is_primary LIMIT 1
    ));

    IF v_bank_id IS NULL THEN
        RAISE EXCEPTION 'No bank account found';
    END IF;

    v_usd := p_coins * 0.05;

    UPDATE public.models SET coin_balance = coin_balance - p_coins WHERE id = p_model_id;

    INSERT INTO public.withdrawal_requests (model_id, bank_account_id, coins, usd_amount)
    VALUES (p_model_id, v_bank_id, p_coins, v_usd)
    RETURNING id INTO v_withdrawal_id;

    RETURN v_withdrawal_id;
END;
$$;

-- Cancel/refund withdrawal
CREATE OR REPLACE FUNCTION public.cancel_withdrawal(p_withdrawal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coins INTEGER;
    v_model_id UUID;
    v_status TEXT;
BEGIN
    SELECT coins, model_id, status INTO v_coins, v_model_id, v_status
    FROM public.withdrawal_requests WHERE id = p_withdrawal_id;

    IF v_status NOT IN ('pending', 'failed') THEN
        RAISE EXCEPTION 'Cannot cancel withdrawal with status: %', v_status;
    END IF;

    UPDATE public.models SET coin_balance = coin_balance + v_coins WHERE id = v_model_id;
    UPDATE public.withdrawal_requests SET status = 'cancelled', updated_at = NOW() WHERE id = p_withdrawal_id;

    RETURN true;
END;
$$;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT UPDATE ON public.withdrawal_requests TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_withdrawal_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_withdrawal TO authenticated;
