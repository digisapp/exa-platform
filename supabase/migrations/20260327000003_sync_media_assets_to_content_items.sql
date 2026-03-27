-- Sync any remaining media_assets portfolio photos into content_items
-- that were uploaded after the initial content_system migration.
-- This ensures content_items is the single source of truth.
INSERT INTO content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.storage_path, ma.url, ma.photo_url),
  'image',
  'portfolio',
  ma.created_at
FROM media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'portfolio'
  AND NOT EXISTS (
    SELECT 1 FROM content_items ci
    WHERE ci.model_id = ma.model_id
      AND ci.media_url IN (ma.storage_path, ma.url, ma.photo_url)
  );

-- Sync any remaining videos
INSERT INTO content_items (model_id, title, media_url, media_type, status, created_at)
SELECT
  ma.model_id,
  ma.title,
  COALESCE(ma.storage_path, ma.url),
  'video',
  'portfolio',
  ma.created_at
FROM media_assets ma
WHERE ma.model_id IS NOT NULL
  AND ma.asset_type = 'video'
  AND NOT EXISTS (
    SELECT 1 FROM content_items ci
    WHERE ci.model_id = ma.model_id
      AND ci.media_url IN (ma.storage_path, ma.url)
  );
