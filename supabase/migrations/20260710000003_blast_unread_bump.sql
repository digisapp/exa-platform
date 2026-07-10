-- Blast messages weren't bumping recipients' unread counters
--
-- api/messages/blast inserts messages directly (model sending is free, so it
-- skips send_message_with_coins which is what normally increments unread). As
-- a result a broadcast landed in fans' inboxes with no unread badge — the
-- recipient often never noticed it, defeating the point of a blast.
--
-- RLS only lets an actor update their OWN participant row, so the counter has
-- to be bumped through a SECURITY DEFINER function. It's guarded: it only
-- increments participants of conversations the caller is actually in, and never
-- the caller's own row.

CREATE OR REPLACE FUNCTION public.increment_unread_for_conversations(
  p_conversation_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_actor uuid;
BEGIN
  SELECT id INTO v_caller_actor
  FROM public.actors
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF v_caller_actor IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.conversation_participants cp
  SET unread_count = COALESCE(cp.unread_count, 0) + 1
  WHERE cp.conversation_id = ANY(p_conversation_ids)
    AND cp.actor_id <> v_caller_actor
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants me
      WHERE me.conversation_id = cp.conversation_id
        AND me.actor_id = v_caller_actor
    );
END;
$$;

REVOKE ALL ON FUNCTION public.increment_unread_for_conversations(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_unread_for_conversations(uuid[])
  TO authenticated, service_role;
