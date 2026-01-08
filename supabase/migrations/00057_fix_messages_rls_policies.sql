-- Fix messages RLS policies
-- The old policies referenced non-existent tables and used wrong column comparisons

-- Drop the broken policies
DROP POLICY IF EXISTS "Users can view messages in their threads" ON public.messages;
DROP POLICY IF EXISTS "read_own_messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
DROP POLICY IF EXISTS "mark_read" ON public.messages;

-- Create correct policy: Users can view messages in conversations they participate in
CREATE POLICY "Users can view messages in their conversations" ON public.messages
FOR SELECT USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE actor_id = (SELECT id FROM actors WHERE user_id = auth.uid())
  )
);

-- Users can update messages they sent (using actor_id lookup, not direct user_id)
CREATE POLICY "Users can update own messages" ON public.messages
FOR UPDATE USING (
  sender_id = (SELECT id FROM actors WHERE user_id = auth.uid())
);
