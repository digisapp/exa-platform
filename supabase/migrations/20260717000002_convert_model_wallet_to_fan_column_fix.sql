-- Fix convert_model_wallet_to_fan: it selected total_coins_purchased FROM
-- public.models, but that column has only ever existed on public.fans.
-- plpgsql doesn't validate table references at CREATE time, so the function
-- shipped fine (20260711100002) and then threw 42703 on first execution —
-- every admin model→fan conversion has returned 500 since it shipped.
--
-- The value is only used when creating a brand-new fan wallet. Instead of a
-- non-existent models column, derive it from the ledger, which is the source
-- of truth for purchases (same expression as the 20260712100006 backfill):
-- SUM(amount) of action='purchase' rows for the actor id the wallet will use.
-- Ledger rows are keyed by actors.id and the actor persists through
-- conversions, so this correctly carries purchase history (e.g. keeps a
-- previously-paying user from re-qualifying for the first-purchase bonus).
-- The reactivate-existing-fan branch never touched the column and is
-- unchanged.

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
  v_purchased int;
  v_reactivated boolean := false;
BEGIN
  SELECT id, user_id, first_name, last_name, email, coin_balance
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
    -- Lifetime purchases come from the ledger (see header comment).
    SELECT COALESCE(SUM(amount), 0)::int INTO v_purchased
    FROM public.coin_transactions
    WHERE actor_id = COALESCE(v_actor_id, p_model_id)
      AND action = 'purchase';

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
      v_purchased
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
