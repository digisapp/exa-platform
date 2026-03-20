-- Add preferred_language to models and fans tables for i18n support
ALTER TABLE models ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
ALTER TABLE fans ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';

-- Add comment for documentation
COMMENT ON COLUMN models.preferred_language IS 'ISO 639-1 language code (en, es, pt, fr, etc.) — auto-detected from browser or set by user';
COMMENT ON COLUMN fans.preferred_language IS 'ISO 639-1 language code (en, es, pt, fr, etc.) — auto-detected from browser or set by user';
