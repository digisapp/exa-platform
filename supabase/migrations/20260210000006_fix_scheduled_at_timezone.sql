-- Fix timezone offset for schedule-call entries
-- These were parsed as UTC instead of ET (EST = UTC-5)
-- Adding 5 hours corrects the stored times
UPDATE call_requests
SET scheduled_at = scheduled_at + INTERVAL '5 hours'
WHERE source = 'gig-email'
AND scheduled_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
