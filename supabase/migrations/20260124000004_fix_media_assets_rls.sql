-- Fix RLS policy for media_assets to ensure public can view portfolio content
-- The original policy "Media viewable by everyone" should work but may need recreation

-- Drop existing select policy if it exists and recreate
DROP POLICY IF EXISTS "Media viewable by everyone" ON public.media_assets;

-- Create a clear public read policy
CREATE POLICY "Media viewable by everyone" ON public.media_assets
  FOR SELECT USING (true);

-- Also ensure there's no issue with authenticated vs anon access
-- Add explicit policy for anonymous users
DROP POLICY IF EXISTS "Anon can view public media" ON public.media_assets;

CREATE POLICY "Anon can view public media" ON public.media_assets
  FOR SELECT TO anon USING (true);

-- Ensure authenticated users can also view
DROP POLICY IF EXISTS "Authenticated can view all media" ON public.media_assets;

CREATE POLICY "Authenticated can view all media" ON public.media_assets
  FOR SELECT TO authenticated USING (true);
