-- Add model_id, asset_type, and photo_url columns to media_assets
-- These columns are needed for the Photos/Videos tabs on model profiles

-- Add model_id column (references models table)
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE CASCADE;

-- Add asset_type column (portfolio, video, etc.)
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS asset_type text;

-- Add photo_url column (for backward compatibility)
ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS photo_url text;

-- Create index for faster lookups by model_id and asset_type
CREATE INDEX IF NOT EXISTS idx_media_assets_model_type
ON public.media_assets(model_id, asset_type);
