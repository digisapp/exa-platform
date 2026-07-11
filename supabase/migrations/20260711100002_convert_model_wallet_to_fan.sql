-- Model → fan conversion: atomic wallet transfer + role flip.
--
-- The admin convert-to-fan route used to do this in four non-transactional
-- steps and had two money bugs:
--   1. It copied models.coin_balance onto a NEW fans row but never zeroed the
--      model row — the same coins then existed twice (the copy on the fan
--      wallet, plus the original on the soft-deleted model row, spendable
--      again if the model was ever restored).
--   2. If a fans row already existed it was reactivated with NO transfer at
--      all (the model's earnings stayed stranded on the soft-deleted model
--      row) and actors.deactivated_at was never cleared.
-- It also inserted the new fans row without an id, so the fan wallet got a
-- random uuid instead of the actor id that add_coins / deduct_coins /
-- get_coin_balance (and assertNotSuspended) look wallet rows up by.
--
-- Ledger safety mirrors 20260612000007 (convert_fan_wallet_to_model): the
-- actors row persists through conversion (only its type flips), so
-- coin_transactions.actor_id keeps following this user and the ledger-sum
-- invariant holds when the stored balance moves between wallet rows. Only
-- balances transfer — no ledger rewrite.

CREATE OR REPLACE FUNCTION public.convert_model_wallet_to_fan(p_model_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model record;
  v_actor_id uuid;
  v_fan_id uuid;
  v_balance int;
  v_reactivated boolean := false;
BEGIN
  SELECT id, user_id, first_name, last_name, email, coin_balance, total_coins_purchased
  INTO v_model
  FROM public.models
  WHERE id = p_model_id
  FOR UPDATE;

  IF v_model.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Model not found');
  END IF;

  IF v_model.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Model has no login to convert');
  END IF;

  v_balance := COALESCE(v_model.coin_balance, 0);

  -- models.id is a FK to actors(id), but resolve the actor via user_id to
  -- match how the old route flipped it (and to survive legacy id mismatches).
  -- Never resolve to an admin actor.
  SELECT id INTO v_actor_id
  FROM public.actors
  WHERE user_id = v_model.user_id
    AND type IN ('model', 'fan')
  LIMIT 1;

  SELECT id INTO v_fan_id
  FROM public.fans
  WHERE user_id = v_model.user_id
  FOR UPDATE;

  IF v_fan_id IS NOT NULL THEN
    -- Existing fan wallet (same actor): reactivate it and ADD the model's
    -- stored balance to it. The wallet may legitimately be negative
    -- (refund/chargeback clawbacks, 20260611000002) — plain addition is
    -- still conservation.
    v_reactivated := true;

    UPDATE public.fans
    SET deleted_at = NULL,
        deleted_reason = NULL,
        coin_balance = COALESCE(coin_balance, 0) + v_balance,
        updated_at = now()
    WHERE id = v_fan_id;
  ELSE
    -- Create the fan wallet, carrying the model's balance over. Use the
    -- actor id as the fan id: the coin RPCs address wallets by actor id.
    INSERT INTO public.fans (id, user_id, display_name, email, coin_balance, total_coins_purchased)
    VALUES (
      COALESCE(v_actor_id, p_model_id),
      v_model.user_id,
      CASE
        WHEN NULLIF(v_model.first_name, '') IS NOT NULL
          THEN trim(v_model.first_name || ' ' || COALESCE(v_model.last_name, ''))
        ELSE NULL
      END,
      v_model.email,
      v_balance,
      COALESCE(v_model.total_coins_purchased, 0)
    )
    RETURNING id INTO v_fan_id;
  END IF;

  -- The balance now lives on the fan wallet — zero the model wallet so the
  -- coins exist exactly once.
  UPDATE public.models
  SET coin_balance = 0
  WHERE id = p_model_id;

  -- Flip the actor to fan and reactivate it. Include 'fan' in the guard so a
  -- previous partial conversion heals; never touch an admin actor.
  UPDATE public.actors
  SET type = 'fan',
      deactivated_at = NULL
  WHERE user_id = v_model.user_id
    AND type IN ('model', 'fan');

  -- Soft-delete the (now orphaned) model row so it drops out of model lists
  -- while its history and money FKs stay intact. The model restore route
  -- refuses rows with this reason — restoring one would recreate the
  -- actor-type mismatch.
  UPDATE public.models
  SET deleted_at = now(),
      deleted_reason = 'converted_to_fan',
      is_approved = false
  WHERE id = p_model_id;

  RETURN jsonb_build_object(
    'success', true,
    'fan_id', v_fan_id,
    'migrated_coins', v_balance,
    'reactivated_existing_fan', v_reactivated
  );
END;
$$;

-- Money RPC: service-role only, per 20260611000001 convention
REVOKE EXECUTE ON FUNCTION public.convert_model_wallet_to_fan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_model_wallet_to_fan(uuid) TO service_role;
