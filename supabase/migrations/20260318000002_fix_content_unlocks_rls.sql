-- Fix content_unlocks RLS policy: buyer_id is an actor_id, not a user_id,
-- so comparing buyer_id = auth.uid() would never match.
-- Replace with the correct actor lookup.

DROP POLICY IF EXISTS "Users can view own unlocks" ON public.content_unlocks;

CREATE POLICY "Users can view own unlocks"
  ON public.content_unlocks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND id = buyer_id
  ));
