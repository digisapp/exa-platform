-- Message search performance
--
-- api/messages/search filters with ILIKE '%q%' on messages.content. The
-- existing to_tsvector GIN index (idx_messages_content_search) cannot serve a
-- substring ILIKE, so search fell back to a sequential scan over every message
-- in the user's conversations — slow on large mailboxes.
--
-- A trigram GIN index makes case-insensitive substring matches indexable.
-- pg_trgm is already enabled (00001_initial_schema.sql). We keep the route on
-- ILIKE (simpler + matches partial words the way users expect) rather than
-- switching to tsquery, so this index is the correct one to add.

CREATE INDEX IF NOT EXISTS idx_messages_content_trgm
  ON public.messages
  USING GIN (content gin_trgm_ops);

-- The search route also filters by sender_id in the auto-flag / moderation
-- paths and has no index on it today; add one so those lookups don't scan.
CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON public.messages (sender_id, created_at DESC);
