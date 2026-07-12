-- Fan → model conversion v2: the whole conversion (wallet + role + row
-- lifecycle) in one atomic, service-role-only RPC. Mirror of 20260711100002
-- (convert_model_wallet_to_fan), which fixed the opposite direction.
--
-- The admin convert-to-model route used to do this in five non-transactional
-- steps and had two money/lifecycle bugs:
--   1. Its existing-model branch OVERWROTE models.coin_balance with the fan's
--      balance — clobbering the model's earnings on a re-conversion (e.g. a
--      model converted to fan and back would come back with only the fan
--      balance, her earnings on the soft-deleted model row destroyed).
--   2. It HARD-deleted the fans row, violating the soft-delete convention
--      (all actor types soft-delete; money FKs are RESTRICT, so a fan row
--      referenced by ledger rows couldn't be deleted at all — the DELETE's
--      error was silently ignored on some rows and destructive on others).
--
-- v1 of this function (20260612000007) already transferred correctly (ADD,
-- never overwrite) but also hard-deleted the fan row, and could neither
-- create/reactivate the model row nor flip the actor — which is why the
-- route bypassed it. v2 keeps the (p_user_id) signature: the model-approval
-- flow (src/lib/model-approval.ts) also calls this function and keeps
-- working unchanged — it flips the actor and creates the model row itself
-- before calling, so for it v2 only upgrades the fan hard-delete to a
-- soft-delete; the create/flip branches are no-ops there.
--
-- Ledger safety, as in 20260612000007 / 20260711100002: the actors row
-- persists through conversion (only its type flips), so
-- coin_transactions.actor_id keeps following this user and the ledger-sum
-- invariant holds while the stored balance moves between wallet rows. Only
-- balances transfer — no ledger rewrite.

CREATE OR REPLACE FUNCTION public.convert_fan_wallet_to_model(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fan record;
  v_actor_id uuid;
  v_model_id uuid;
  v_username text;
  v_base text;
  v_balance int;
  v_reused_existing_model boolean := false;
BEGIN
  SELECT id, user_id, email, display_name, coin_balance
  INTO v_fan
  FROM public.fans
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- No fan wallet (direct model signup, or already converted) — keep v1's
  -- contract for the approval flow: success, nothing to migrate.
  IF v_fan.id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'migrated_coins', 0, 'no_fan_wallet', true);
  END IF;

  v_balance := COALESCE(v_fan.coin_balance, 0);

  -- fans.id should equal actors.id, but resolve the actor via user_id to
  -- survive legacy id mismatches (as 20260711100002 does). Never resolve to
  -- an admin actor.
  SELECT id INTO v_actor_id
  FROM public.actors
  WHERE user_id = p_user_id
    AND type IN ('fan', 'model')
  LIMIT 1;

  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Actor record not found for this fan');
  END IF;

  SELECT id, username INTO v_model_id, v_username
  FROM public.models
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_model_id IS NOT NULL THEN
    -- Existing model wallet for the same user (e.g. soft-deleted by a
    -- previous model→fan conversion): reactivate it and ADD the fan's stored
    -- balance. Never overwrite — the model row may hold earnings. The fan
    -- wallet may legitimately be negative (refund/chargeback clawbacks,
    -- 20260611000002) — plain addition is still conservation.
    v_reused_existing_model := true;

    UPDATE public.models
    SET coin_balance = COALESCE(coin_balance, 0) + v_balance,
        deleted_at = NULL,
        deleted_reason = NULL,
        is_approved = true, -- route parity: admin conversion (re)approves
        updated_at = now()
    WHERE id = v_model_id;
  ELSE
    -- If another model row holds this email (e.g. an orphaned import), remap
    -- its email so email lookups elsewhere (the approval flow uses .single())
    -- stay unambiguous. models.email has no unique constraint — this is
    -- hygiene carried over from the old route.
    IF NULLIF(v_fan.email, '') IS NOT NULL THEN
      UPDATE public.models
      SET email = 'orphan+' || id::text || '@placeholder.invalid'
      WHERE email = v_fan.email
        AND user_id IS DISTINCT FROM p_user_id;
    END IF;

    -- Same username recipe as the old route: display name (or email local
    -- part, or 'user'), lowercased/stripped, capped at 20 chars, plus a
    -- random suffix — with a uniqueness retry since models.username is
    -- UNIQUE NOT NULL and a collision would abort the whole conversion.
    v_base := left(
      regexp_replace(
        lower(COALESCE(NULLIF(v_fan.display_name, ''), NULLIF(split_part(v_fan.email, '@', 1), ''), 'user')),
        '[^a-z0-9]', '', 'g'),
      20);
    FOR i IN 1..20 LOOP
      v_username := v_base || substr(md5(random()::text), 1, 4);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.models WHERE username = v_username);
    END LOOP;

    -- Create the model wallet, carrying the fan's balance over. models.id is
    -- a FK to actors(id) — the coin RPCs address model wallets by that id.
    -- Field list preserved from the old route's insert.
    INSERT INTO public.models (id, user_id, email, username, first_name, last_name, is_approved, coin_balance)
    VALUES (
      v_actor_id,
      p_user_id,
      COALESCE(v_fan.email, ''),
      v_username,
      COALESCE(NULLIF(v_fan.display_name, ''), 'New'),
      'Model',
      true,
      v_balance
    )
    RETURNING id INTO v_model_id;
  END IF;

  -- The balance now lives on the model wallet — zero the fan wallet so the
  -- coins exist exactly once, and SOFT-delete the row (fans never
  -- hard-delete; money FKs are RESTRICT). The fan restore route 409s on this
  -- deleted_reason — restoring it would resurrect a fan wallet next to the
  -- active model account.
  UPDATE public.fans
  SET coin_balance = 0,
      deleted_at = now(),
      deleted_reason = 'converted_to_model',
      updated_at = now()
  WHERE id = v_fan.id;

  -- Flip the actor to model and reactivate it. Include 'model' in the guard
  -- so a previous partial conversion heals; never touch an admin actor.
  UPDATE public.actors
  SET type = 'model',
      deactivated_at = NULL
  WHERE user_id = p_user_id
    AND type IN ('fan', 'model');

  RETURN jsonb_build_object(
    'success', true,
    'model_id', v_model_id,
    'username', v_username,
    'migrated_coins', v_balance,
    'reused_existing_model', v_reused_existing_model
  );
END;
$$;

-- Money RPC: service-role only, per 20260611000001 convention
REVOKE EXECUTE ON FUNCTION public.convert_fan_wallet_to_model(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.convert_fan_wallet_to_model(uuid) TO service_role;
