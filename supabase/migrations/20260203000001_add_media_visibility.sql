-- Add visibility toggle to media_assets for controlling what appears on public profile
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- Add source field for AI-generated content if it doesn't exist
-- (existing column may have different values, this just ensures it exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'media_assets' AND column_name = 'source'
  ) THEN
    ALTER TABLE media_assets ADD COLUMN source TEXT;
  END IF;
END $$;

-- Index for efficient filtering on profile pages
CREATE INDEX IF NOT EXISTS idx_media_assets_visibility ON media_assets(model_id, is_visible) WHERE is_visible = true;

-- Comment for documentation
COMMENT ON COLUMN media_assets.is_visible IS 'Controls whether this asset appears on the public profile page';
