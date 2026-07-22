-- Missed-call recovery notifications (sweep-stale-calls cron, section 4).
--
-- When a fan's call rings out, the model gets ONE email + ONE push. Dedup
-- reuses chat_nudges_sent (service-role-only RLS, UNIQUE(conversation_id,
-- recipient_id, nudge_type)): the notify pass checks the model actor's most
-- recent 'missed_call' row across ALL conversations and skips if it's inside
-- the 6h window, so five fans ringing one model still produce one email.
-- The CHECK constraint was last set in 20260715000001; this re-adds it with
-- the new type.

ALTER TABLE public.chat_nudges_sent
  DROP CONSTRAINT IF EXISTS chat_nudges_sent_nudge_type_check;

ALTER TABLE public.chat_nudges_sent
  ADD CONSTRAINT chat_nudges_sent_nudge_type_check
  CHECK (nudge_type IN ('first_message', 'unread_reminder', 'model_reply', 'missed_call'));

-- The dedup query is "latest missed_call row per recipient in the last 6h"
CREATE INDEX IF NOT EXISTS idx_chat_nudges_sent_recipient_type_created
  ON public.chat_nudges_sent (recipient_id, nudge_type, created_at DESC);
