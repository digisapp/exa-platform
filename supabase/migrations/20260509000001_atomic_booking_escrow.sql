-- Atomic booking escrow RPC
--
-- Problem: src/app/api/bookings/[id]/route.ts performed escrow as a non-atomic
-- read-modify-write on fans.coin_balance / brands.coin_balance:
--
--   const { data: fan } = await admin.from("fans").select("coin_balance")...
--   if (fan.coin_balance < amount) { decline }
--   await admin.from("fans").update({ coin_balance: fan.coin_balance - amount })
--
-- Two concurrent accept / accept_counter calls could both read the same
-- pre-debit balance, both pass the sufficiency check, and both deduct —
-- spending more coins than the client has.
--
-- This RPC locks the client's row FOR UPDATE, checks the balance, performs
-- the debit, and writes the coin_transactions ledger entry in a single
-- transaction. Returns jsonb { success, new_balance, balance, error } so the
-- caller can map errors to user-facing responses.

CREATE OR REPLACE FUNCTION public.debit_actor_coins_for_booking(
  p_client_id uuid,
  p_amount int,
  p_booking_id uuid,
  p_booking_number text,
  p_model_id uuid,
  p_is_counter boolean DEFAULT false
)
RETURNS jsonb AS $$
DECLARE
  v_actor_type text;
  v_current_balance int;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  SELECT type INTO v_actor_type FROM public.actors WHERE id = p_client_id;

  IF v_actor_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'actor_not_found');
  END IF;

  IF v_actor_type = 'fan' THEN
    SELECT coin_balance INTO v_current_balance
      FROM public.fans WHERE id = p_client_id FOR UPDATE;
  ELSIF v_actor_type = 'brand' THEN
    SELECT coin_balance INTO v_current_balance
      FROM public.brands WHERE id = p_client_id FOR UPDATE;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'unsupported_actor_type');
  END IF;

  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'profile_not_found');
  END IF;

  IF v_current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'balance', v_current_balance
    );
  END IF;

  IF v_actor_type = 'fan' THEN
    UPDATE public.fans
       SET coin_balance = coin_balance - p_amount
     WHERE id = p_client_id;
  ELSE
    UPDATE public.brands
       SET coin_balance = coin_balance - p_amount
     WHERE id = p_client_id;
  END IF;

  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (
    p_client_id,
    -p_amount,
    'booking_escrow',
    jsonb_build_object(
      'booking_id', p_booking_id,
      'booking_number', p_booking_number,
      'model_id', p_model_id,
      'counter_offer', p_is_counter
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_current_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.debit_actor_coins_for_booking(uuid, int, uuid, text, uuid, boolean)
  TO authenticated, service_role;
