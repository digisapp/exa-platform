-- Make all original video-call columns nullable for CRM call requests
-- CRM requests don't need model_id, caller_id, call_type, etc.
ALTER TABLE call_requests ALTER COLUMN model_id DROP NOT NULL;
ALTER TABLE call_requests ALTER COLUMN channel_name DROP NOT NULL;
ALTER TABLE call_requests ALTER COLUMN agora_token DROP NOT NULL;
ALTER TABLE call_requests ALTER COLUMN caller_name DROP NOT NULL;
ALTER TABLE call_requests ALTER COLUMN model_name DROP NOT NULL;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
