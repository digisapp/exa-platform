-- Add RLS policies for Supabase Storage to allow authenticated users to upload/manage files
-- Previously, storage operations relied solely on service role client in API routes.
-- These policies provide defense-in-depth and enable direct storage access where needed.

-- Portfolio bucket policies
CREATE POLICY "Authenticated users can upload to portfolio"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'portfolio');

CREATE POLICY "Authenticated users can update own portfolio files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.actors WHERE user_id = auth.uid()
    UNION
    SELECT m.id::text FROM public.models m
    WHERE m.id IN (SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'model')
  ));

CREATE POLICY "Authenticated users can delete own portfolio files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'portfolio' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.actors WHERE user_id = auth.uid()
    UNION
    SELECT m.id::text FROM public.models m
    WHERE m.id IN (SELECT id FROM public.actors WHERE user_id = auth.uid() AND type = 'model')
  ));

CREATE POLICY "Anyone can view portfolio files"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'portfolio');

-- Avatars bucket policies
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update own avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.actors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can delete own avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.actors WHERE user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'avatars');
