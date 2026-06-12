-- ============================================================
-- MONEY RPC LOCKDOWN — round 2 (2026-06-12)
--
-- 20260611000001_security_remediation.sql revoked EXECUTE on eight money
-- functions, but a whole cluster of coin-moving SECURITY DEFINER functions was
-- missed. Postgres grants EXECUTE to PUBLIC by default and PostgREST exposes
-- every public function to anon/authenticated, so each of these was directly
-- callable via rpc(...) with NO auth.uid() binding. Because the caller supplies
-- the spender/actor id, an authenticated user could drain ANY actor's balance,
-- e.g. rpc('transfer_coins', {p_sender_id: <victim>, p_recipient_id: <me>, ...}).
--
-- Companion code changes (deployed together):
--   tips, tips/send, messages/send, messages/new, messages/unlock,
--   content/unlock, live-wall/tip, calls/end, games/boost/vote now call these
--   RPCs with the service-role client. Each route authenticates first and
--   derives the spender id from the session, so it cannot be used to drain
--   another actor. Internal function-to-function calls run as the definer and
--   are unaffected by these revokes.
--
-- This revokes every overload by name (signature drift can't leave a hole) and
-- also pins search_path = public on each definer function (search-path hijack
-- hardening; the 20260611000001 batch only did this for a few functions).
-- ============================================================
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef                       -- SECURITY DEFINER only
      AND p.proname IN (
        'transfer_coins',
        'send_tip',
        'send_message_with_coins',
        'tip_live_wall_message',
        'unlock_message_media',
        'unlock_content',
        'unlock_content_item',
        'unlock_content_set',
        'end_call_transfer',
        'debit_actor_coins_for_booking',
        'record_top_model_vote',
        'hold_coins_for_booking',
        'release_escrow_to_model',
        'refund_escrow',
        'accept_offer_spot',
        'add_gems_to_model',
        'claim_daily_spin'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn.sig);
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', fn.sig);
  END LOOP;
END $$;
