-- Fix /admin/messages 500 caused by URL-too-long.
--
-- Problem: src/app/api/admin/messages/route.ts pre-filtered the conversations
-- list by fetching every conversation_id that had a message (~655 today),
-- then passed all of them into a Supabase .in("id", [...]) query. PostgREST
-- encodes that as ?id=in.(uuid1,uuid2,...) and the resulting URL crossed
-- the upstream gateway limit (~8-16KB), so the request 500'd and the admin
-- messages page rendered as if there were no conversations at all.
--
-- This RPC pushes the EXISTS check into Postgres so the route never has to
-- ship a giant ID list over the wire. Returns the paged window plus the
-- total count so the API can keep its existing pagination contract.

CREATE OR REPLACE FUNCTION public.admin_list_conversations_with_messages(
  p_offset int,
  p_limit  int
)
RETURNS TABLE(
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH convs AS (
    SELECT c.id, c.created_at, c.updated_at
    FROM conversations c
    WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)
  ),
  total AS (SELECT COUNT(*) AS cnt FROM convs)
  SELECT convs.id, convs.created_at, convs.updated_at, total.cnt
  FROM convs, total
  ORDER BY convs.updated_at DESC
  OFFSET p_offset
  LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION public.admin_list_conversations_with_messages(int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_conversations_with_messages(int, int) TO service_role;
