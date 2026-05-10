-- N+1 fix for /chats list
--
-- Problem: src/lib/chat-queries.ts fetched the last message per conversation
-- by issuing one .maybeSingle() per conversation_id inside Promise.all. A
-- model with 200 conversations meant 200 round-trips just to render their
-- inbox. Already-batched in JS, but every single hop pays network latency.
--
-- This RPC takes the conversation IDs the caller has (from their existing
-- conversation_participants query) and returns DISTINCT ON the most recent
-- message per conversation in a single query. SECURITY INVOKER keeps the
-- caller's RLS context, so the same access rules apply as the original
-- per-conversation reads.

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
  SELECT DISTINCT ON (m.conversation_id)
    m.conversation_id,
    m.content,
    m.created_at,
    m.sender_id,
    m.media_url,
    m.media_type,
    m.is_system
  FROM public.messages m
  WHERE m.conversation_id = ANY(p_conversation_ids)
  ORDER BY m.conversation_id, m.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_last_messages_for_conversations(uuid[])
  TO authenticated, service_role;
