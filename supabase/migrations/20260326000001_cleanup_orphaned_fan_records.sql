-- Clean up orphaned fan records: fans whose actor type is no longer 'fan'
-- This happens when a fan is approved as a model but the fan record deletion
-- failed or was skipped during the approval flow.

DELETE FROM public.fans
WHERE user_id IN (
  SELECT f.user_id
  FROM public.fans f
  JOIN public.actors a ON a.user_id = f.user_id
  WHERE a.type != 'fan'
);

