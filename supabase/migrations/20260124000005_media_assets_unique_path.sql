-- Add unique constraint on storage_path to prevent duplicate media_assets records
-- This ensures idempotency - if the same file is uploaded twice, we don't create duplicate rows

-- First, check if there are any duplicates and keep the newest one
WITH duplicates AS (
  SELECT id, storage_path,
    ROW_NUMBER() OVER (PARTITION BY storage_path ORDER BY created_at DESC) as rn
  FROM public.media_assets
  WHERE storage_path IS NOT NULL
)
DELETE FROM public.media_assets
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the unique index
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_unique_storage_path
ON public.media_assets (storage_path)
WHERE storage_path IS NOT NULL;
