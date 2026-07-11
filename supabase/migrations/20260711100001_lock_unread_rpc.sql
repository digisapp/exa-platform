-- Lock down increment_unread_for_conversations (RPC lockdown convention,
-- see 20260611000001)
--
-- 20260710000003 granted EXECUTE to authenticated, so any participant could
-- call the RPC from the browser console in a loop and inflate the other
-- side's unread badge unboundedly (the "only conversations you're in" guard
-- limits WHICH rows, not HOW OFTEN). Blasting is the only legitimate caller
-- and its route already authenticates the sender, so this follows the money-
-- RPC convention: auth in the route, then call via the service-role client.
--
-- The service-role client has no auth.uid(), so the function is redefined to
-- take the sender explicitly instead of deriving it from the session. The
-- membership guard is kept: it still only bumps participants of conversations
-- the sender is actually in, and never the sender's own row.
--
-- Companion code change (deploys together): api/messages/blast now calls this
-- with the service client, passing p_sender_actor_id, and only for
-- conversations whose message insert actually succeeded.

DROP FUNCTION IF EXISTS public.increment_unread_for_conversations(uuid[]);

CREATE OR REPLACE FUNCTION public.increment_unread_for_conversations(
  p_conversation_ids uuid[],
  p_sender_actor_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_sender_actor_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.conversation_participants cp
  SET unread_count = COALESCE(cp.unread_count, 0) + 1
  WHERE cp.conversation_id = ANY(p_conversation_ids)
    AND cp.actor_id <> p_sender_actor_id
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants me
      WHERE me.conversation_id = cp.conversation_id
        AND me.actor_id = p_sender_actor_id
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_unread_for_conversations(uuid[], uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_unread_for_conversations(uuid[], uuid)
  TO service_role;
