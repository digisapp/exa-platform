-- Fix messages table schema to match app expectations
-- The messages table had incorrect column names and constraints

-- Rename thread_id to conversation_id (if not already done)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'thread_id'
  ) THEN
    ALTER TABLE public.messages RENAME COLUMN thread_id TO conversation_id;
  END IF;
END $$;

-- Make sender_type nullable (we get type from actors.type via sender_id)
ALTER TABLE public.messages ALTER COLUMN sender_type DROP NOT NULL;

-- Make recipient_instagram nullable (legacy column)
ALTER TABLE public.messages ALTER COLUMN recipient_instagram DROP NOT NULL;

-- Make content nullable (for media-only messages)
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

-- Add is_system column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN is_system boolean DEFAULT false;
  END IF;
END $$;

-- Fix sender_id foreign key to reference actors instead of users
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES public.actors(id);

-- Add foreign key for conversation_id if missing
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
