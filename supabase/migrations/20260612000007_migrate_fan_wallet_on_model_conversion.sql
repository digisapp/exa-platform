-- Fan → model conversion: carry the fan's coin balance over instead of
-- dropping it with the fan row.
--
-- Before this, the approval route hard-deleted the fan row and created the
-- model with coin_balance 0, so a converting fan's coins (or clawback debt —
-- a debt-escape loophole) silently vanished. Transaction HISTORY was never
-- at risk: coin_transactions.actor_id references actors(id), and the actors
-- row persists through conversion (only its type changes), so the ledger-sum
-- invariant holds when we move the stored balance — no ledger rewrite needed.
--
-- Atomic: transfer balance to the model row, zero the fan row, delete it.
-- The approval route calls this INSTEAD of a bare DELETE FROM fans.

CREATE OR REPLACE FUNCTION public.convert_fan_wallet_to_model(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan_id uuid;
  v_fan_balance int;
  v_model_id uuid;
BEGIN
  SELECT id, coin_balance INTO v_fan_id, v_fan_balance
  FROM public.fans
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- No fan row (e.g. direct model signup, or already converted) — nothing to do
  IF v_fan_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'migrated_coins', 0);
  END IF;

  SELECT id INTO v_model_id
  FROM public.models
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Never delete a fan wallet without a model wallet to receive it
  IF v_model_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No model record for user');
  END IF;

  IF COALESCE(v_fan_balance, 0) <> 0 THEN
    UPDATE public.models
    SET coin_balance = COALESCE(coin_balance, 0) + v_fan_balance
    WHERE id = v_model_id;

    UPDATE public.fans
    SET coin_balance = 0
    WHERE id = v_fan_id;
  END IF;

  DELETE FROM public.fans WHERE id = v_fan_id;

  RETURN jsonb_build_object('success', true, 'migrated_coins', COALESCE(v_fan_balance, 0));
END;
$$;

-- Money RPC: service-role only, per 20260611000001 convention
REVOKE EXECUTE ON FUNCTION public.convert_fan_wallet_to_model(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_fan_wallet_to_model(uuid) TO service_role;
