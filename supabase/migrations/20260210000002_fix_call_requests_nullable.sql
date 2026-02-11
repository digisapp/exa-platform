-- Make caller_id nullable for CRM call requests (not video calls)
ALTER TABLE call_requests ALTER COLUMN caller_id DROP NOT NULL;
