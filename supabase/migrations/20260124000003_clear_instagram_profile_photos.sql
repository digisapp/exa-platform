-- Clear Instagram CDN profile photos from models
-- These are low quality and expire over time
-- Models will be prompted to upload their own high-quality profile photo

UPDATE models
SET profile_photo_url = NULL
WHERE profile_photo_url ILIKE '%cdninstagram.com%'
   OR profile_photo_url ILIKE '%instagram%';

-- Log how many were cleared (visible in migration output)
DO $$
DECLARE
  cleared_count INTEGER;
BEGIN
  GET DIAGNOSTICS cleared_count = ROW_COUNT;
  RAISE NOTICE 'Cleared % Instagram profile photos', cleared_count;
END $$;
