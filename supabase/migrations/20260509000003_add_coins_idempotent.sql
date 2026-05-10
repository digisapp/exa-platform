-- Atomic, idempotent coin credit
--
-- Problem: src/app/api/webhooks/stripe/handlers/checkout.ts checks for an
-- existing coin_transactions row with the session_id, then calls add_coins,
-- then UPDATEs the row to set idempotency_key. Two concurrent webhook deliveries
-- (Stripe retries are common) can both pass the existence check before either
-- has inserted, leading to double-credit.
--
-- Existing safety net: idx_coin_transactions_idempotency_key from
-- 20260207000005 is a unique index on (idempotency_key) WHERE idempotency_key
-- IS NOT NULL. This works only if the key is set at insert time.
--
-- This overload of add_coins inserts the ledger row WITH the idempotency_key
-- as the first step. If a concurrent invocation has already inserted the same
-- key, the unique index raises unique_violation and we return early without
-- double-crediting the balance.

CREATE OR REPLACE FUNCTION public.add_coins(
  p_actor_id uuid,
  p_amount int,
  p_action text,
  p_metadata jsonb,
  p_idempotency_key text
)
RETURNS jsonb AS $$
DECLARE
  v_type text;
BEGIN
  IF p_idempotency_key IS NULL OR p_idempotency_key = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'idempotency_key_required');
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT type INTO v_type FROM public.actors WHERE id = p_actor_id;
  IF v_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'actor_not_found');
  END IF;

  -- Insert the ledger row with the idempotency key first. The unique index
  -- idx_coin_transactions_idempotency_key on (idempotency_key) WHERE NOT NULL
  -- guarantees that only one concurrent caller wins.
  BEGIN
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata, idempotency_key)
    VALUES (p_actor_id, p_amount, p_action, COALESCE(p_metadata, '{}'::jsonb), p_idempotency_key);
  EXCEPTION WHEN unique_violation THEN
    -- Another delivery already credited; safe to no-op.
    RETURN jsonb_build_object('success', true, 'duplicate', true);
  END;

  -- We won the insert race — apply the balance change.
  IF v_type = 'fan' THEN
    UPDATE public.fans SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSIF v_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSE
    UPDATE public.models SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.add_coins(uuid, int, text, jsonb, text)
  TO authenticated, service_role;
