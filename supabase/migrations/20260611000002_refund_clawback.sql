-- ============================================================
-- Refund / dispute clawback support
--
-- Companion code: src/app/api/webhooks/stripe/handlers/disputes.ts now reverses
-- coin purchases AND non-coin products (tickets, shop, workshops, content
-- program) on charge.refunded and on LOST charge.dispute.closed.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Allow FANS to carry a negative coin balance (debt).
-- When a fan refunds/charges back coins they have already spent, the clawback
-- must still apply or the platform eats the loss. Every spend function checks
-- balance >= amount, so a fan in debt cannot spend; fans have no withdrawal
-- path. The debt nets against their next purchase. models/brands KEEP their
-- non-negative constraint — affiliate-commission clawback clamps at 0 rather
-- than pushing an earner into debt for a buyer's chargeback.
-- ------------------------------------------------------------
ALTER TABLE public.fans DROP CONSTRAINT IF EXISTS fans_coin_balance_non_negative;
-- Drop any remaining inline CHECK (coin_balance >= 0) (auto-named in 00003).
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.fans'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%coin_balance%>= 0%'
  LOOP
    EXECUTE format('ALTER TABLE public.fans DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 2. clawback_coins — atomic, idempotent coin reversal for the refund/dispute
-- webhook (service-role only). Routes by actor type. When p_allow_negative is
-- false, removes only the available balance (clamp at 0) so models/brands never
-- violate their non-negative constraint; the ledger records the actual amount
-- removed. Idempotent via the unique idx_coin_transactions_idempotency_key.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.clawback_coins(
  p_actor_id uuid,
  p_amount int,                       -- positive number of coins to remove
  p_action text,
  p_metadata jsonb,
  p_idempotency_key text,
  p_allow_negative boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_type text;
  v_balance int;
  v_deduct int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;
  IF v_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'actor_not_found');
  END IF;

  -- Lock the balance row and read the current balance.
  IF v_type = 'fan' THEN
    SELECT coin_balance INTO v_balance FROM public.fans WHERE id = p_actor_id FOR UPDATE;
  ELSIF v_type = 'brand' THEN
    SELECT coin_balance INTO v_balance FROM public.brands WHERE id = p_actor_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO v_balance FROM public.models WHERE id = p_actor_id FOR UPDATE;
  END IF;

  IF v_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'balance_not_found');
  END IF;

  IF p_allow_negative THEN
    v_deduct := p_amount;
  ELSE
    v_deduct := least(p_amount, greatest(v_balance, 0));
  END IF;

  -- Ledger row first: a unique idempotency_key makes redelivery a no-op.
  BEGIN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata, idempotency_key)
    VALUES (p_actor_id, -v_deduct, p_action, p_metadata, p_idempotency_key);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END;

  IF v_deduct > 0 THEN
    IF v_type = 'fan' THEN
      UPDATE public.fans SET coin_balance = coin_balance - v_deduct WHERE id = p_actor_id;
    ELSIF v_type = 'brand' THEN
      UPDATE public.brands SET coin_balance = coin_balance - v_deduct WHERE id = p_actor_id;
    ELSE
      UPDATE public.models SET coin_balance = coin_balance - v_deduct WHERE id = p_actor_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'clawed_back', v_deduct,
    'requested', p_amount,
    'shortfall', p_amount - v_deduct,
    'new_balance', v_balance - v_deduct
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.clawback_coins(uuid, int, text, jsonb, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clawback_coins(uuid, int, text, jsonb, text, boolean)
  TO service_role;

-- ------------------------------------------------------------
-- 3. Allow a single refunded content-program month to be marked without
-- cancelling the enrollment (status enum had no 'refunded').
-- ------------------------------------------------------------
DO $$
DECLARE c text;
BEGIN
  SELECT conname INTO c FROM pg_constraint
  WHERE conrelid = 'public.content_program_payments'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%'
  LIMIT 1;
  IF c IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.content_program_payments DROP CONSTRAINT %I', c);
  END IF;
END $$;
ALTER TABLE public.content_program_payments
  ADD CONSTRAINT content_program_payments_status_check
  CHECK (status IN ('pending', 'due', 'paid', 'overdue', 'waived', 'refunded'));
