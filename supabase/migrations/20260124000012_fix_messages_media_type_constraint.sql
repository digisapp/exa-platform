-- Fix messages media_type constraint to allow MIME types
-- The constraint may have been added requiring only 'image' or 'video',
-- but the frontend sends full MIME types like 'image/jpeg', 'video/mp4', etc.

-- Drop the existing constraint if it exists
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_media_type_check;

-- Add a more permissive constraint that allows MIME types
-- (or we can leave it unconstrained since media_type can be any valid MIME type)
-- For safety, we'll just ensure it starts with 'image/', 'video/', or 'audio/' if not null
ALTER TABLE public.messages ADD CONSTRAINT messages_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type ILIKE 'image/%'
    OR media_type ILIKE 'video/%'
    OR media_type ILIKE 'audio/%'
  );
