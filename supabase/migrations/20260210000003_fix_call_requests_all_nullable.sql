-- Make all original video-call columns nullable so CRM inserts work
-- The call_requests table was originally for video calls with NOT NULL constraints.
-- CRM call requests don't need caller_id, call_type, etc.

ALTER TABLE call_requests ALTER COLUMN call_type DROP NOT NULL;

-- Also update the status CHECK constraint to include CRM statuses
-- (The constraint may already include them from a prior migration, so use DROP IF EXISTS + re-add)
ALTER TABLE call_requests DROP CONSTRAINT IF EXISTS call_requests_status_check;
ALTER TABLE call_requests ADD CONSTRAINT call_requests_status_check
  CHECK (status IN (
    'pending', 'scheduled', 'in_progress', 'completed',
    'no_answer', 'voicemail', 'cancelled', 'spam',
    'ringing', 'active', 'ended', 'missed', 'declined'
  ));
