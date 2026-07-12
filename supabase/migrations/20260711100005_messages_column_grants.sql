-- Lock messages.media_url away from client roles (PPV leak fix, PR A)
--
-- Problem: locked PPV chat media leaked its real media_url to fans two ways
-- despite route-level stripping:
--   1. Supabase Realtime postgres_changes on public.messages delivered the
--      FULL row over the websocket; clients stripped media_url only after
--      arrival (visible in devtools).
--   2. Any authenticated user could .from("messages").select("media_url")
--      directly via PostgREST — the RLS SELECT policy (00057) is row-filtering
--      only, and the default table-level SELECT grant exposes every column.
--      A column-level REVOKE alone is a no-op while the table-level grant
--      exists (see the note in 20260207000006 for premium_content).
--
-- Fix: revoke the table-level SELECT grant from client roles, then grant
-- column-level SELECT back on every column EXCEPT media_url. Grants and RLS
-- compose (both must pass), so the existing row policies are untouched.
-- Legitimate media_url reads move to server-controlled paths (service role +
-- per-viewer stripping) in the same PR.
--
-- FAIL-CLOSED FOR FUTURE COLUMNS: a column added to public.messages later is
-- INVISIBLE to clients (PostgREST select errors / realtime omits it) until it
-- is explicitly granted. To expose a new column, add to the migration that
-- creates it:
--   GRANT SELECT (new_column) ON public.messages TO authenticated;
--
-- anon is left fully revoked: chat requires auth everywhere (all /chats
-- pages and /api/messages/* routes reject unauthenticated users), and no
-- anon flow reads messages.
--
-- INSERT/UPDATE/DELETE grants are deliberately untouched: writes are already
-- gated by RLS (senders only), and no client-side write on messages uses a
-- RETURNING list containing media_url (WHERE/RETURNING columns only need
-- SELECT privilege on the referenced columns, which are all granted below).

-- messages.deleted_at was referenced by the PR #83 soft-delete code
-- (api/messages/delete, and the list route filters .is("deleted_at", null))
-- but its ADD COLUMN never shipped in any migration — in prod the column
-- doesn't exist, so message deletion and list-route pagination/resync have
-- been erroring. Add it here so the code (and the grant below) is valid.
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

REVOKE SELECT ON public.messages FROM anon, authenticated;

-- Every current column except media_url. Column list verified against the
-- live schema (information_schema via service role, 2026-07-12) plus the
-- deleted_at column added above.
GRANT SELECT (
  id,
  conversation_id,
  sender_id,
  sender_type,
  recipient_id,
  recipient_instagram,
  content,
  media_type,
  media_price,
  media_viewed_by,
  media_thumbnail_url,
  media_duration,
  media_expires_at,
  media_file_size,
  media_view_mode,
  is_system,
  is_flagged,
  flagged_reason,
  flagged_at,
  flagged_by,
  read_at,
  reply_to_id,
  transaction_id,
  edited_at,
  edit_count,
  deleted_at,
  created_at
) ON public.messages TO authenticated;

-- ============================================================
-- get_last_messages_for_conversations: SECURITY INVOKER -> DEFINER
-- ============================================================
-- This RPC (inbox previews, 20260710000001) legitimately reads m.media_url
-- and runs as the caller, so the column revoke above would break it. It
-- becomes SECURITY DEFINER (bypassing both RLS and the column grants), which
-- means it can no longer lean on the messages RLS policy for scoping —
-- membership is now enforced EXPLICITLY: only conversations where an actor
-- of auth.uid() is a participant are returned. The per-viewer locked-media
-- stripping is preserved exactly (media_price > 0 AND viewer is not the
-- sender AND viewer has not unlocked => media_url NULL). No caller / no
-- matching actor => no rows: fails closed.

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
SECURITY DEFINER
SET search_path = public
AS $$
  WITH viewer AS (
    SELECT ARRAY(
      SELECT a.id FROM public.actors a WHERE a.user_id = auth.uid()
    ) AS actor_ids
  ),
  allowed AS (
    -- Explicit membership check (replaces the RLS the INVOKER version relied on)
    SELECT DISTINCT cp.conversation_id
    FROM public.conversation_participants cp
    CROSS JOIN viewer v
    WHERE cp.conversation_id = ANY(p_conversation_ids)
      AND cp.actor_id = ANY(v.actor_ids)
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
    WHERE m.conversation_id IN (SELECT a.conversation_id FROM allowed a)
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

REVOKE ALL ON FUNCTION public.get_last_messages_for_conversations(uuid[])
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_last_messages_for_conversations(uuid[])
  TO authenticated, service_role;

-- Sweep notes (verified before this migration):
--   * message_reactions RLS policies (20260122000001) subquery messages but
--     only reference m.id / m.conversation_id — both granted above, so they
--     keep working under column-level privileges.
--   * No views select from public.messages.
--   * All other functions touching messages (send_message_with_coins and its
--     redefinitions, unlock_message_media, increment_unread_for_conversations,
--     admin_list_conversations_with_messages) are already SECURITY DEFINER.
