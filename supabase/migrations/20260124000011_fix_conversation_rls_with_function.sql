-- FIX: The conversation_participants RLS policy is self-referential, causing issues.
-- This migration creates a SECURITY DEFINER function to check participation,
-- bypassing the RLS recursion issue.

-- Create a function to check if current user is a participant in a conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(conv_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp
    JOIN actors a ON a.id = cp.actor_id
    WHERE cp.conversation_id = conv_id
    AND a.user_id = auth.uid()
  );
$$;

-- Drop and recreate the conversations SELECT policy using the function
DROP POLICY IF EXISTS "Users can view conversations they are in" ON public.conversations;
CREATE POLICY "Users can view conversations they are in" ON public.conversations
  FOR SELECT USING (public.is_conversation_participant(id));

-- Drop and recreate the conversation_participants SELECT policy using the function
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (public.is_conversation_participant(conversation_id));

-- Also fix messages policy to use the function for consistency
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (public.is_conversation_participant(conversation_id));
