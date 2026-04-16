-- ============================================
-- MESSAGE EDITING
-- Adds edited_at + edit_count to messages so users can edit text content
-- after sending. Only editable for ~15 minutes after send to prevent
-- abuse (history rewriting, scams). Original content is not preserved
-- (intentional simplicity — a user can always delete + resend).
-- ============================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0;

-- Index for fetching recently-edited messages (used for analytics/moderation)
CREATE INDEX IF NOT EXISTS idx_messages_edited_at
  ON public.messages (edited_at)
  WHERE edited_at IS NOT NULL;
