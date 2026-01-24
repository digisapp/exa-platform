-- Add unique constraint on url to prevent duplicate media_assets records
-- This ensures idempotency - if the same file is uploaded twice, we don't create duplicate rows
-- Using url instead of storage_path because url is fully qualified and includes the bucket name,
-- making it globally unique even when multiple buckets (portfolio, avatars) are used

-- First, check if there are any duplicates and keep the newest one
WITH duplicates AS (
  SELECT id, url,
    ROW_NUMBER() OVER (PARTITION BY url ORDER BY created_at DESC) as rn
  FROM public.media_assets
  WHERE url IS NOT NULL
)
DELETE FROM public.media_assets
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Now add the unique index on url (includes bucket in the path, so globally unique)
CREATE UNIQUE INDEX IF NOT EXISTS media_assets_unique_url
ON public.media_assets (url)
WHERE url IS NOT NULL;
