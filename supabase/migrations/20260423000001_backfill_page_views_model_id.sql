-- Backfill model_id on page_views where model_username was set but model_id was NULL.
-- The PageViewTracker client only sent modelUsername; the API now resolves it to model_id,
-- but existing rows need patching so the analytics RPC functions return correct data.

UPDATE public.page_views pv
SET model_id = m.id
FROM public.models m
WHERE pv.model_id IS NULL
  AND pv.model_username IS NOT NULL
  AND LOWER(m.username) = LOWER(pv.model_username);
