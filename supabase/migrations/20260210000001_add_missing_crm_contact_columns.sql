-- Add missing CRM contact columns to call_requests
-- The original table was for video calls (caller_name, channel_name, agora_token).
-- The CRM migration's CREATE TABLE IF NOT EXISTS was silently skipped.
-- These columns are needed for the CRM call scheduling feature.

ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE call_requests ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
