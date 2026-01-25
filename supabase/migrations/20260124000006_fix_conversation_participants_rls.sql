-- Fix conversation_participants RLS policy to allow viewing other participants
-- Current policy only allows users to see their own participation, not other participants
-- in conversations they're part of.

-- First create a helper function to get current user's actor_id
-- This bypasses RLS (SECURITY DEFINER) to avoid circular dependency
CREATE OR REPLACE FUNCTION get_current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.actors WHERE user_id = auth.uid()
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their participations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;

-- Create new policy: Users can view all participants in conversations they're part of
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    conversation_id IN (
      SELECT cp.conversation_id
      FROM public.conversation_participants cp
      WHERE cp.actor_id = get_current_actor_id()
    )
  );

-- Also need to allow viewing actors of conversation participants
-- Users can only see their own actor by default, but need to see other actors in their conversations
DROP POLICY IF EXISTS "Users can view own actor" ON public.actors;
DROP POLICY IF EXISTS "Users can view actors in shared conversations" ON public.actors;
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
  );
