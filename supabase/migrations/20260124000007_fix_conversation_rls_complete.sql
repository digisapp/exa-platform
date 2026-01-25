-- Complete fix for conversation RLS policies
-- Previous migration may have partially applied

-- Create helper function (idempotent)
CREATE OR REPLACE FUNCTION get_current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.actors WHERE user_id = auth.uid()
$$;

-- Ensure conversation_participants policy exists (idempotent)
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT cp.conversation_id
      FROM public.conversation_participants cp
      WHERE cp.actor_id = get_current_actor_id()
    )
  );

-- Update actor policies to allow viewing chat participants (idempotent)
DROP POLICY IF EXISTS "Users can view own actor" ON public.actors;
DROP POLICY IF EXISTS "Users can view actors in shared conversations" ON public.actors;

CREATE POLICY "Users can view actors in shared conversations" ON public.actors
  FOR SELECT USING (
    user_id = auth.uid()
    OR
    id IN (
      SELECT cp2.actor_id
      FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.actor_id = get_current_actor_id()
    )
  );
