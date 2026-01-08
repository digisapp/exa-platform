-- Add RLS policies to allow conversation and participant creation

-- Allow authenticated users to create conversations
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to add participants to conversations
DROP POLICY IF EXISTS "Users can add participants" ON public.conversation_participants;
CREATE POLICY "Users can add participants" ON public.conversation_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to update their own participant record (for last_read_at)
DROP POLICY IF EXISTS "Users can update own participant record" ON public.conversation_participants;
CREATE POLICY "Users can update own participant record" ON public.conversation_participants
  FOR UPDATE USING (
    actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );
