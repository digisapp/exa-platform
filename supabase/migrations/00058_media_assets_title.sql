-- Add title column to media_assets table for portfolio items
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS title TEXT;

-- Add comment
COMMENT ON COLUMN media_assets.title IS 'Optional title for the media asset, displayed on hover';
