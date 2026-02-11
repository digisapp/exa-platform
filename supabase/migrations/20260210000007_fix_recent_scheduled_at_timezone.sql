-- Fix timezone for records submitted after the first migration
-- but before the code fix deployed. These still have UTC instead of ET.
-- Valid ET times (9 AM - 7 PM) = 14:00 - 00:00 UTC.
-- Bugged records have times in 09:00-19:00 UTC range that display as
-- early morning ET (before 9 AM), which is impossible from the form.
UPDATE call_requests
SET scheduled_at = scheduled_at + INTERVAL '5 hours'
WHERE source = 'gig-email'
AND scheduled_at IS NOT NULL
AND EXTRACT(HOUR FROM scheduled_at) < 14;

NOTIFY pgrst, 'reload schema';
