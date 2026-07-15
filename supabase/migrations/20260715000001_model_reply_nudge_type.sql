-- Fast "model replied" email notifications (reply-notifications cron).
--
-- When a model messages a fan mid-conversation, nothing notified the fan
-- until the 24h unread nudge. A new */10min cron emails fans whose model
-- message stays unread past ~12 minutes. It dedups via chat_nudges_sent,
-- which needs a third nudge_type. The UNIQUE(conversation_id, recipient_id,
-- nudge_type) row is upserted with a fresh created_at on each send, so the
-- cron's "one per conversation per 24h" check reads created_at.

ALTER TABLE public.chat_nudges_sent
  DROP CONSTRAINT IF EXISTS chat_nudges_sent_nudge_type_check;

ALTER TABLE public.chat_nudges_sent
  ADD CONSTRAINT chat_nudges_sent_nudge_type_check
  CHECK (nudge_type IN ('first_message', 'unread_reminder', 'model_reply'));
