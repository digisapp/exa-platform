-- Index drift fix: notifications was originally indexed on (actor_id, read,
-- created_at) per 00001_initial_schema.sql. The schema since migrated to
-- (user_id, read_at) but the index was never updated, so every unread-count
-- query (e.g. /api/notifications/feed, navbar badges) sequential-scans.
--
-- A partial index on unread rows is much smaller and matches the most frequent
-- access pattern: "give me my unread notifications, newest first".

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

-- Also useful for "all my notifications, newest first" — listing screens.
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
