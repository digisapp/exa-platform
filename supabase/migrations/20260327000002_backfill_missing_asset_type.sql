-- Backfill media_assets records that are missing asset_type
-- These were uploaded via the fallback /api/upload route which didn't set asset_type
UPDATE public.media_assets
SET asset_type = 'portfolio',
    photo_url = COALESCE(photo_url, url)
WHERE asset_type IS NULL
  AND source = 'portfolio';

UPDATE public.media_assets
SET asset_type = 'avatar'
WHERE asset_type IS NULL
  AND source = 'avatar';
