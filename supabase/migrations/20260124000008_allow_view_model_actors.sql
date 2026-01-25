-- Allow viewing actors of type 'model' for messaging purposes
-- Fans need to look up model actors to create conversations with them

DROP POLICY IF EXISTS "Users can view actors in shared conversations" ON public.actors;

-- Recreate the policy with additional condition for model actors
CREATE POLICY "Users can view actors in shared conversations" ON public.actors
  FOR SELECT USING (
    -- Can view own actor
    user_id = auth.uid()
    OR
    -- Can view actors who are participants in conversations user is in
    id IN (
      SELECT cp2.actor_id
      FROM public.conversation_participants cp1
      JOIN public.conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
      WHERE cp1.actor_id = get_current_actor_id()
    )
    OR
    -- Can view model actors (needed to initiate conversations)
    type = 'model'
  );
