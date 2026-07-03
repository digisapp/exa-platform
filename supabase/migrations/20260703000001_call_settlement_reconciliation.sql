-- Call settlement & reconciliation
-- ------------------------------------------------------------------
-- Problem this fixes (revenue leak + data integrity):
--   1. A paid call is only billed when the client hits /api/calls/end.
--      If both parties crash / lose network, LiveKit's onDisconnected never
--      fires, the session sits in 'active' forever, and NO coins are charged.
--   2. In /api/calls/end the session was marked 'ended' with coins_charged set
--      BEFORE the transfer RPC ran; if the transfer failed the row falsely
--      claimed the fan was charged while no coins actually moved.
--
-- The fix introduces:
--   * last_heartbeat_at  - client pings this while the call is live, so a
--                          reconciliation sweeper knows a crashed call's true
--                          last-alive time and can bill the real duration.
--   * settled            - whether the coin transfer for this session has
--                          actually completed. The sweeper retries any ended
--                          session left unsettled by a failed transfer.
--   * end_call_transfer is made IDEMPOTENT so the sweeper can safely retry
--     without ever double-charging a fan.

-- 1. New columns -----------------------------------------------------
ALTER TABLE public.video_call_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at timestamptz,
  ADD COLUMN IF NOT EXISTS settled boolean NOT NULL DEFAULT false;

-- Existing terminal rows are historical and must never be re-processed
-- by the sweeper — treat them as already settled.
UPDATE public.video_call_sessions
SET settled = true
WHERE status IN ('ended', 'declined', 'missed');

-- Sweeper lookup index: unsettled sessions still in a live/terminal-but-unpaid state.
CREATE INDEX IF NOT EXISTS idx_call_sessions_unsettled
  ON public.video_call_sessions(status, last_heartbeat_at)
  WHERE settled = false;

-- 2. Idempotent end_call_transfer -----------------------------------
-- Adds a guard: if a debit ledger row for this session already exists, the
-- transfer has already happened, so return without charging again. This lets
-- the reconciliation sweeper retry a previously-failed transfer safely.
CREATE OR REPLACE FUNCTION public.end_call_transfer(
  p_session_id uuid,
  p_caller_fan_id uuid,
  p_recipient_model_user_id uuid,
  p_coins int,
  p_call_type text,
  p_duration_seconds int
)
RETURNS jsonb AS $$
DECLARE
  v_fan_balance int;
  v_actual_charge int;
  v_action_name text;
  v_received_action_name text;
BEGIN
  IF p_coins <= 0 THEN
    RETURN jsonb_build_object('success', true, 'coins_charged', 0);
  END IF;

  v_action_name := CASE WHEN p_call_type = 'voice' THEN 'voice_call' ELSE 'video_call' END;
  v_received_action_name := CASE WHEN p_call_type = 'voice' THEN 'voice_call_received' ELSE 'video_call_received' END;

  -- IDEMPOTENCY GUARD: if this session was already charged, do nothing.
  -- The debit ledger row carries the session_id in its metadata, so its
  -- presence is proof the transfer already completed. Makes retries safe.
  IF EXISTS (
    SELECT 1 FROM public.coin_transactions
    WHERE actor_id = p_caller_fan_id
      AND action = v_action_name
      AND metadata->>'session_id' = p_session_id::text
  ) THEN
    RETURN jsonb_build_object('success', true, 'already_settled', true, 'coins_charged', 0);
  END IF;

  -- Lock and read fan balance
  SELECT coin_balance INTO v_fan_balance
  FROM public.fans
  WHERE id = p_caller_fan_id
  FOR UPDATE;

  IF v_fan_balance IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fan not found');
  END IF;

  -- Charge only up to available balance
  v_actual_charge := LEAST(v_fan_balance, p_coins);

  IF v_actual_charge <= 0 THEN
    RETURN jsonb_build_object('success', true, 'coins_charged', 0);
  END IF;

  -- Deduct from fan (atomic)
  UPDATE public.fans
  SET coin_balance = coin_balance - v_actual_charge
  WHERE id = p_caller_fan_id;

  -- Credit model (atomic)
  UPDATE public.models
  SET coin_balance = coin_balance + v_actual_charge
  WHERE user_id = p_recipient_model_user_id;

  -- Record debit transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (
    p_caller_fan_id,
    -v_actual_charge,
    v_action_name,
    jsonb_build_object('session_id', p_session_id, 'duration_seconds', p_duration_seconds, 'call_type', p_call_type)
  );

  -- Record credit transaction (get recipient actor id)
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  SELECT a.id, v_actual_charge, v_received_action_name,
    jsonb_build_object('session_id', p_session_id, 'duration_seconds', p_duration_seconds, 'call_type', p_call_type)
  FROM public.actors a
  JOIN public.models m ON m.user_id = a.user_id
  WHERE m.user_id = p_recipient_model_user_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'coins_charged', v_actual_charge
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Keep the lockdown: money RPC stays service-role only.
REVOKE ALL ON FUNCTION public.end_call_transfer(uuid, uuid, uuid, int, text, int) FROM PUBLIC, anon, authenticated;
