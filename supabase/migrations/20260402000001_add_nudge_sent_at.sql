-- Add nudge_sent_at column to conversation_participants
-- Used by the message-nudges cron job to avoid sending duplicate nudge emails
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS nudge_sent_at TIMESTAMPTZ;
