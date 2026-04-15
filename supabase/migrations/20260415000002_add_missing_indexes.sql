-- Add missing indexes identified during platform audit
-- These indexes improve query performance on high-traffic tables

-- Messages: sender_id is used in many queries but has no index
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- Messages: conversation_id is the primary lookup pattern
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages (conversation_id, created_at DESC);

-- Conversation participants: composite index for actor lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_actor_conversation
  ON public.conversation_participants (actor_id, conversation_id);

-- Coin transactions: idempotency_key lookups for duplicate prevention
CREATE INDEX IF NOT EXISTS idx_coin_transactions_idempotency_key
  ON public.coin_transactions (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Coin transactions: actor_id + action for refund/purchase lookups
CREATE INDEX IF NOT EXISTS idx_coin_transactions_actor_action
  ON public.coin_transactions (actor_id, action);
