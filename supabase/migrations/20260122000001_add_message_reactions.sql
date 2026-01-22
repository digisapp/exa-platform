-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, actor_id, emoji)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_actor_id ON message_reactions(actor_id);

-- Enable RLS
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
-- Users can view reactions on messages in conversations they're part of
CREATE POLICY "Users can view reactions in their conversations"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      JOIN actors a ON a.id = cp.actor_id
      WHERE m.id = message_reactions.message_id
        AND a.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions in their conversations"
  ON message_reactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      JOIN actors a ON a.id = cp.actor_id
      WHERE m.id = message_id
        AND a.user_id = auth.uid()
        AND a.id = actor_id
    )
  );

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON message_reactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM actors a
      WHERE a.id = message_reactions.actor_id
        AND a.user_id = auth.uid()
    )
  );
