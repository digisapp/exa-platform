-- Fan presence
--
-- /api/activity already tries to write fans.last_active_at on every activity
-- ping, but the column never existed — so the update silently no-op'd and fans
-- always appeared offline to the models they chat with. This makes model↔fan
-- chat feel dead even when a fan is actively on the site.
--
-- Add the column so the existing activity tracker starts recording it; the
-- chat header's 5-minute "Online" heuristic then works for fans too.

ALTER TABLE public.fans
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;
