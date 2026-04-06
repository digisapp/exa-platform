-- ============================================
-- CHAT ENHANCEMENTS
-- Adds: pinning, archiving, unread counts,
--        reply threads, full-text search, nudge dedup
-- ============================================

-- 1. Conversation participants: pinning, archiving, unread counts
ALTER TABLE public.conversation_participants
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unread_count INT NOT NULL DEFAULT 0;

-- Index for quick "unread across all conversations" query
CREATE INDEX IF NOT EXISTS idx_cp_unread
  ON public.conversation_participants (actor_id, unread_count)
  WHERE unread_count > 0;

-- Index for pinned conversations
CREATE INDEX IF NOT EXISTS idx_cp_pinned
  ON public.conversation_participants (actor_id)
  WHERE is_pinned = true;

-- 2. Messages: reply threads
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;

-- Index for fetching replies to a specific message
CREATE INDEX IF NOT EXISTS idx_messages_reply_to
  ON public.messages (reply_to_id)
  WHERE reply_to_id IS NOT NULL;

-- 3. Full-text search index on message content
-- Use GIN index with english text search configuration
CREATE INDEX IF NOT EXISTS idx_messages_content_search
  ON public.messages
  USING GIN (to_tsvector('english', COALESCE(content, '')));

-- 4. Chat nudge dedup table (prevents duplicate email notifications)
CREATE TABLE IF NOT EXISTS public.chat_nudges_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('first_message', 'unread_reminder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One nudge of each type per conversation per recipient
  UNIQUE (conversation_id, recipient_id, nudge_type)
);

ALTER TABLE public.chat_nudges_sent ENABLE ROW LEVEL SECURITY;

-- 5. Update send_message_with_coins to increment recipient unread_count
CREATE OR REPLACE FUNCTION public.send_message_with_coins(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid DEFAULT NULL,
  p_content text DEFAULT '',
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_coin_amount int DEFAULT 0,
  p_media_price int DEFAULT NULL,
  p_reply_to_id uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  sender_type text;
  sender_balance int;
  new_message_id uuid;
BEGIN
  -- Get sender type
  SELECT type INTO sender_type FROM public.actors WHERE id = p_sender_id;

  IF sender_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sender not found');
  END IF;

  -- Handle coin transfer if required
  IF p_coin_amount > 0 THEN
    -- Get sender balance based on type (with row lock)
    IF sender_type = 'fan' THEN
      SELECT coin_balance INTO sender_balance
      FROM public.fans
      WHERE id = p_sender_id
      FOR UPDATE;
    ELSIF sender_type = 'brand' THEN
      SELECT coin_balance INTO sender_balance
      FROM public.brands
      WHERE id = p_sender_id
      FOR UPDATE;
    ELSE
      SELECT coin_balance INTO sender_balance
      FROM public.models
      WHERE id = p_sender_id
      FOR UPDATE;
    END IF;

    -- Check balance
    IF sender_balance IS NULL OR sender_balance < p_coin_amount THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Insufficient coins',
        'balance', COALESCE(sender_balance, 0),
        'required', p_coin_amount
      );
    END IF;

    -- Deduct from sender based on type
    IF sender_type = 'fan' THEN
      UPDATE public.fans
      SET coin_balance = coin_balance - p_coin_amount,
          updated_at = now()
      WHERE id = p_sender_id;
    ELSIF sender_type = 'brand' THEN
      UPDATE public.brands
      SET coin_balance = coin_balance - p_coin_amount,
          updated_at = now()
      WHERE id = p_sender_id;
    ELSE
      UPDATE public.models
      SET coin_balance = coin_balance - p_coin_amount
      WHERE id = p_sender_id;
    END IF;

    -- Credit to recipient (model) - only if recipient exists
    IF p_recipient_id IS NOT NULL THEN
      UPDATE public.models
      SET coin_balance = coin_balance + p_coin_amount
      WHERE id = p_recipient_id;
    END IF;

    -- Record sender transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_sender_id, -p_coin_amount, 'message_sent',
            jsonb_build_object('conversation_id', p_conversation_id, 'recipient_id', p_recipient_id));

    -- Record recipient transaction only if recipient is known
    IF p_recipient_id IS NOT NULL THEN
      INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
      VALUES (p_recipient_id, p_coin_amount, 'message_received',
              jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', p_sender_id));
    END IF;
  END IF;

  -- Insert message (include media_price and reply_to_id if set)
  INSERT INTO public.messages (conversation_id, sender_id, content, media_url, media_type, is_system, media_price, reply_to_id)
  VALUES (p_conversation_id, p_sender_id, p_content, p_media_url, p_media_type, false, p_media_price, p_reply_to_id)
  RETURNING id INTO new_message_id;

  -- Update conversation timestamp
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  -- Update sender's last_read_at and reset their unread count
  UPDATE public.conversation_participants
  SET last_read_at = now(), unread_count = 0
  WHERE conversation_id = p_conversation_id AND actor_id = p_sender_id;

  -- Increment unread_count for all OTHER participants
  UPDATE public.conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = p_conversation_id AND actor_id != p_sender_id;

  -- Return success with message details
  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'coins_deducted', p_coin_amount,
    'sender_new_balance', CASE WHEN p_coin_amount > 0 THEN sender_balance - p_coin_amount ELSE NULL END
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS policies for chat_nudges_sent (admin only)
CREATE POLICY "Service role only" ON public.chat_nudges_sent
  FOR ALL USING (false);
