-- Spotlight vote dedupe + session RPC lockdown
--
-- Problem (2026-07-11 audit): the vote pipeline had no server-enforced
-- "one counted vote per model per session-cycle" guarantee. The route
-- called record_top_model_vote() BEFORE mark_model_swiped(), and only
-- consulted models_swiped as an advisory pre-check — so replayed or
-- session-less requests could award leaderboard points without limit
-- (up to the rate limit: ~172k points/day/IP), stuffing the weekly
-- leaderboard that drives the /models Trending row.
--
-- Mechanism chosen: since 20260711100004, mark_model_swiped() already
-- refuses duplicate appends atomically (conditional UPDATE — the row lock
-- serializes concurrent calls). That makes it the natural per-(session,
-- model) dedupe gate: top_model_votes has no session_id column, and
-- record_top_model_vote()'s signature (which must not change) carries no
-- session id, so the gate lives where the session state lives. This
-- migration:
--
--   1. Extends mark_model_swiped()'s return with `newly_swiped` so the
--      vote route can call it FIRST and only call record_top_model_vote()
--      when a swipe was actually recorded. Also refuses appends to
--      completed sessions (cooldown), closing the stale-session window.
--      Same signature/SECURITY DEFINER; old return keys unchanged.
--   2. Locks mark_model_swiped() and update_session_streak() down to
--      service_role (they previously had default PUBLIC EXECUTE, so any
--      anon PostgREST caller could mark models swiped on / complete /
--      streak-bump ARBITRARY sessions by id). The routes now do
--      fingerprint/user ownership checks and call via the service client,
--      mirroring the money-RPC lockdown convention (20260612000001).
--
-- record_top_model_vote() itself is intentionally untouched: its
-- signature, body, and permissions (service-role-only since
-- 20260612000001) are preserved. Dedupe is enforced at the
-- mark_model_swiped seam, which the route now calls first.
-- get_or_create_top_model_session() stays callable by anon/authenticated
-- — the deck route invokes it with the user-scoped client and anonymous
-- play must keep working.

-- 1) mark_model_swiped: report whether this call recorded a new swipe,
--    and never append to a completed session.
CREATE OR REPLACE FUNCTION mark_model_swiped(
  p_session_id UUID,
  p_model_id UUID,
  p_total_models INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_session top_model_sessions%ROWTYPE;
  v_new_count INTEGER;
BEGIN
  -- Append only when the session exists, isn't completed, and hasn't seen
  -- this model this cycle. The row lock serializes concurrent calls, so
  -- the containment check sees prior appends.
  UPDATE top_model_sessions
  SET models_swiped = array_append(models_swiped, p_model_id)
  WHERE id = p_session_id
    AND completed_at IS NULL
    AND NOT (COALESCE(models_swiped, '{}') @> ARRAY[p_model_id])
  RETURNING * INTO v_session;

  -- Nothing recorded: duplicate swipe, completed session, or unknown id.
  -- Re-read so the response still reports the real state.
  IF v_session.id IS NULL THEN
    SELECT * INTO v_session FROM top_model_sessions WHERE id = p_session_id;

    IF v_session.id IS NULL THEN
      RETURN jsonb_build_object(
        'completed', false,
        'models_swiped', 0,
        'newly_swiped', false
      );
    END IF;

    RETURN jsonb_build_object(
      'completed', v_session.completed_at IS NOT NULL,
      'models_swiped', COALESCE(array_length(v_session.models_swiped, 1), 0),
      'newly_swiped', false
    );
  END IF;

  v_new_count := COALESCE(array_length(v_session.models_swiped, 1), 0);

  -- Mark as completed if all models swiped
  IF v_new_count >= p_total_models THEN
    UPDATE top_model_sessions
    SET completed_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
      'completed', true,
      'models_swiped', v_new_count,
      'newly_swiped', true
    );
  END IF;

  RETURN jsonb_build_object(
    'completed', false,
    'models_swiped', v_new_count,
    'newly_swiped', true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Service-role-only: these mutate session state by raw session id, so
--    ownership must be verified by the API route before they run. Revoke
--    every overload by name and pin search_path (same pattern as
--    20260612000001).
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'mark_model_swiped',
        'update_session_streak'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.sig);
  END LOOP;
END $$;
