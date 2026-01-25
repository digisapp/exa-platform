-- FIX: The actors policy was causing recursion because get_current_actor_id()
-- queries actors, which then evaluates the policy, which calls get_current_actor_id()...
-- This fix removes the recursive call and uses a simpler policy.

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view actors in shared conversations" ON public.actors;

-- Create a simple, non-recursive policy for actors
-- Users can see: their own actor OR any model actor (models are public profiles)
CREATE POLICY "Users can view own and model actors" ON public.actors
  FOR SELECT USING (
    -- Can view own actor
    user_id = auth.uid()
    OR
    -- Can view model actors (needed for chat, profiles, etc.)
    type = 'model'
  );

-- Also need to ensure conversation_participants policy doesn't use get_current_actor_id
-- if it causes similar issues
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Use a direct subquery instead of the function to avoid potential issues
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT cp.conversation_id
      FROM public.conversation_participants cp
      JOIN public.actors a ON a.id = cp.actor_id
      WHERE a.user_id = auth.uid()
    )
  );
