-- Add Exa Dolls columns to models table
-- Stores the AI-generated doll-style digital twin image and prompt used

ALTER TABLE models ADD COLUMN IF NOT EXISTS exa_doll_image_url TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS exa_doll_prompt TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS exa_doll_generated_at TIMESTAMPTZ;
ALTER TABLE models ADD COLUMN IF NOT EXISTS skin_tone TEXT;

-- Index for admin queries (find models without dolls)
CREATE INDEX IF NOT EXISTS idx_models_exa_doll ON models (exa_doll_image_url) WHERE exa_doll_image_url IS NULL;

COMMENT ON COLUMN models.exa_doll_image_url IS 'URL of AI-generated Exa Doll style digital twin image';
COMMENT ON COLUMN models.exa_doll_prompt IS 'Exact prompt used to generate the Exa Doll image (for reproducibility)';
COMMENT ON COLUMN models.exa_doll_generated_at IS 'When the Exa Doll image was generated';
COMMENT ON COLUMN models.skin_tone IS 'Model skin tone for AI prompt generation (e.g. fair, light, medium, olive, tan, brown, deep brown, dark, ebony)';
