-- ============================================
-- EXA PLATFORM - MESSAGE MODERATION FLAGS
-- ============================================
-- Adds in-platform moderation columns to support the virtual-first policy:
--   - messages.is_flagged + flagged_reason: per-message auto-flag (e.g. in-person
--     meetup requests detected by the send-route keyword filter)
--   - fans.flagged_for_review: account-level flag set when a fan accrues
--     multiple flagged messages in a short window
-- The admin messages dashboard already reads these column names; this migration
-- backfills the schema to match.
-- ============================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_reason text;

CREATE INDEX IF NOT EXISTS idx_messages_flagged
  ON public.messages (created_at DESC)
  WHERE is_flagged = true;

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flagged_for_review_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged_for_review_reason text;

CREATE INDEX IF NOT EXISTS idx_fans_flagged_for_review
  ON public.fans (flagged_for_review_at DESC)
  WHERE flagged_for_review = true;
