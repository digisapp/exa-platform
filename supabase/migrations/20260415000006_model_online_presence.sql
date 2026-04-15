-- Add real-time presence columns to models table
-- video_is_online is toggled by the activity endpoint (true) and a cron job (false)
-- Supabase Realtime broadcasts UPDATE events so fans get instant notifications

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS video_is_online BOOLEAN NOT NULL DEFAULT false;

-- Index for the cron cleanup query (find stale online models)
CREATE INDEX IF NOT EXISTS idx_models_online_presence
  ON public.models (video_is_online, last_active_at)
  WHERE video_is_online = true;
