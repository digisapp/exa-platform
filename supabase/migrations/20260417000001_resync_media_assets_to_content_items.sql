-- Re-sync portfolio photos from media_assets into content_items.
-- The upload route had a bug where media_type was set to 'photo' instead of 'image',
-- causing the content_items INSERT to silently fail (CHECK constraint violation).
-- This migration backfills any missing portfolio photos and videos.

INSERT INTO content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.url, ma.photo_url, ma.storage_path),
  'image',
  'portfolio',
  ma.created_at
FROM media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'portfolio'
  AND COALESCE(ma.url, ma.photo_url, ma.storage_path) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM content_items ci
    WHERE ci.model_id = ma.model_id
      AND ci.media_url IN (ma.url, ma.photo_url, ma.storage_path)
  );

-- Also sync any missing videos
INSERT INTO content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.url, ma.storage_path),
  'video',
  'portfolio',
  ma.created_at
FROM media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'video'
  AND COALESCE(ma.url, ma.storage_path) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM content_items ci
    WHERE ci.model_id = ma.model_id
      AND ci.media_url IN (ma.url, ma.storage_path)
  );
