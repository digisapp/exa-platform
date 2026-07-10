-- PPV leak fix for /chats inbox preview
--
-- Problem: get_last_messages_for_conversations returned the raw media_url of
-- the most recent message in every conversation. The thread view
-- (api/messages/list) and realtime both strip media_url for locked PPV media,
-- but the inbox list bypassed that stripping — so a model's most recent locked
-- PPV photo could be pulled straight out of the conversation-list payload
-- without paying. This directly costs models money.
--
-- Fix: strip media_url in the RPC itself, mirroring the list route's rule
-- (media_price > 0 AND viewer is not the sender AND viewer has not unlocked).
-- The viewer is derived from auth.uid() under the caller's SECURITY INVOKER
-- context; an empty viewer (no matching actor / no session) is treated as
-- "not unlocked", so it fails closed.
--
-- Return shape is unchanged, so no client changes are required. media_price is
-- NOT added to the output to avoid churn; the list UI only needs media_url
-- absent to render its existing "locked" affordance.

CREATE OR REPLACE FUNCTION public.get_last_messages_for_conversations(
  p_conversation_ids uuid[]
)
RETURNS TABLE(
  conversation_id uuid,
  content text,
  created_at timestamptz,
  sender_id uuid,
  media_url text,
  media_type text,
  is_system boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH viewer AS (
    SELECT ARRAY(
      SELECT a.id FROM public.actors a WHERE a.user_id = auth.uid()
    ) AS actor_ids
  ),
  last AS (
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      m.created_at,
      m.sender_id,
      m.media_url,
      m.media_type,
      m.is_system,
      COALESCE(m.media_price, 0) AS media_price,
      COALESCE(m.media_viewed_by, '{}'::uuid[]) AS media_viewed_by
    FROM public.messages m
    WHERE m.conversation_id = ANY(p_conversation_ids)
    ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT
    l.conversation_id,
    l.content,
    l.created_at,
    l.sender_id,
    CASE
      WHEN l.media_price > 0
        AND l.sender_id <> ALL(v.actor_ids)
        AND NOT (l.media_viewed_by && v.actor_ids)
      THEN NULL
      ELSE l.media_url
    END AS media_url,
    l.media_type,
    l.is_system
  FROM last l CROSS JOIN viewer v;
$$;

GRANT EXECUTE ON FUNCTION public.get_last_messages_for_conversations(uuid[])
  TO authenticated, service_role;
