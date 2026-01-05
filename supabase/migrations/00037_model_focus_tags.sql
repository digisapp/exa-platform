-- Add focus_tags column to models table
-- Models can select up to 3 focus areas that describe their work type

ALTER TABLE models ADD COLUMN IF NOT EXISTS focus_tags text[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN models.focus_tags IS 'Array of focus areas (max 3): fashion, commercial, fitness, swimwear, beauty, editorial, ecommerce, promo, luxury, lifestyle';
