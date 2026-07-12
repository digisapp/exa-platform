-- Repair fans.total_coins_purchased (stale since 2026-02)
--
-- The original 4-arg add_coins (00003) bumped fans.total_coins_purchased on
-- purchases, but 20260207000007 redefined it without the bump, and the 5-arg
-- overload the Stripe webhook actually calls (20260509000003) never touched
-- it either — so the column froze in February while the ledger
-- (coin_transactions, action='purchase') kept the truth. Admin FansTab and
-- any "paid fans" metric reading the column have been undercounting since.
--
-- Verified against prod before writing this (2026-07-12): 46 fans drifted,
-- every one of them column=0 with a positive ledger sum (the missed
-- post-February purchases); zero cases of a nonzero column with no ledger
-- rows. So "set column = ledger sum" is an exact repair, not a heuristic.
--
-- Semantics (documented here deliberately): total_coins_purchased is the
-- LIFETIME GROSS of purchased coins. It is NOT decremented by refund/
-- chargeback clawbacks — eligibility logic (e.g. the first-purchase bonus)
-- reads the ledger directly and does not use this column.

-- 1) Maintain the column going forward: same 5-arg add_coins as
--    20260509000003, plus the total_coins_purchased bump on fan purchases.
--    CREATE OR REPLACE preserves the function's ACLs, so the RPC lockdown
--    from 20260611000001 (service-role-only) remains in force.
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
    UPDATE public.fans
    SET coin_balance = coin_balance + p_amount,
        -- Lifetime gross of purchased coins (see header); purchases only,
        -- never decremented.
        total_coins_purchased = CASE
          WHEN p_action = 'purchase'
          THEN COALESCE(total_coins_purchased, 0) + p_amount
          ELSE total_coins_purchased
        END
    WHERE id = p_actor_id;
  ELSIF v_type = 'brand' THEN
    UPDATE public.brands SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  ELSE
    UPDATE public.models SET coin_balance = coin_balance + p_amount WHERE id = p_actor_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'duplicate', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Backfill from the ledger (exact repair, verified above). Ledger rows are
--    keyed by actors.id and fans.id == actors.id, so a direct id match covers
--    every fan; ledger actors with no fans row (models/brands/converted
--    accounts) are correctly untouched.
UPDATE public.fans f
SET total_coins_purchased = pt.total
FROM (
  SELECT actor_id, SUM(amount)::int AS total
  FROM public.coin_transactions
  WHERE action = 'purchase'
  GROUP BY actor_id
) pt
WHERE pt.actor_id = f.id
  AND COALESCE(f.total_coins_purchased, 0) IS DISTINCT FROM pt.total;
