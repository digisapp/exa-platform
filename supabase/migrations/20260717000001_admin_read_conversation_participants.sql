-- Admin read access for conversation_participants.
--
-- The only SELECT policy was is_conversation_participant(conversation_id),
-- so the admin model page's "Conversations" stat (counted with the browser
-- client) silently collapsed to conversations the VIEWING ADMIN happens to
-- share with the model — e.g. 1 shown vs 3 real. Same failure mode as the
-- Followers tab before PR #66. fans / coin_transactions / content_items all
-- already carry an equivalent "Admins can view all" policy; this brings
-- conversation_participants in line.

CREATE POLICY "Admins can view all conversation participants"
  ON public.conversation_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
        AND actors.type = 'admin'
    )
  );
