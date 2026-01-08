-- Add missing points_cached and level_cached columns to models table
-- These columns were in the initial schema but may be missing in production

-- Add points_cached column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'models' AND column_name = 'points_cached'
  ) THEN
    ALTER TABLE public.models ADD COLUMN points_cached int DEFAULT 0;
  END IF;
END $$;

-- Add level_cached column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'models' AND column_name = 'level_cached'
  ) THEN
    ALTER TABLE public.models ADD COLUMN level_cached text DEFAULT 'rising';
    ALTER TABLE public.models ADD CONSTRAINT models_level_cached_check
      CHECK (level_cached IN ('rising', 'verified', 'pro', 'elite'));
  END IF;
END $$;

-- Create index on points_cached if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_models_points ON public.models(points_cached DESC);
