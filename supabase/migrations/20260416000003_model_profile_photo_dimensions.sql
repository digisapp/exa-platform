-- ============================================
-- Add profile photo dimensions to models table
--
-- Stores width/height of each model's profile_photo_url so the profile page
-- hero layout can gate on resolution without fetching the image at render time.
--
-- New uploads already capture dimensions via processImage(); this migration
-- adds the columns so the upload route can persist them on avatar uploads too.
-- A companion backfill script populates existing rows.
-- ============================================

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS profile_photo_width  int,
  ADD COLUMN IF NOT EXISTS profile_photo_height int;

-- Partial index for fast "has hero-quality profile photo?" lookups
CREATE INDEX IF NOT EXISTS idx_models_profile_photo_hero
  ON public.models (id)
  WHERE profile_photo_width IS NOT NULL
    AND profile_photo_width >= 800;
