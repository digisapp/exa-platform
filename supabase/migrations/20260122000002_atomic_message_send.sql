-- ============================================
-- ATOMIC MESSAGE SENDING WITH COIN TRANSFER
-- ============================================
-- This function ensures message sending and coin transfer happen atomically
-- If any step fails, the entire transaction is rolled back

CREATE OR REPLACE FUNCTION public.send_message_with_coins(
  p_conversation_id uuid,
  p_sender_id uuid,
  p_recipient_id uuid,
  p_content text,
  p_media_url text DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_coin_amount int DEFAULT 0
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

    -- Deduct from sender
    IF sender_type = 'fan' THEN
      UPDATE public.fans
      SET coin_balance = coin_balance - p_coin_amount,
          updated_at = now()
      WHERE id = p_sender_id;
    ELSE
      UPDATE public.models
      SET coin_balance = coin_balance - p_coin_amount
      WHERE id = p_sender_id;
    END IF;

    -- Credit to recipient (model)
    UPDATE public.models
    SET coin_balance = coin_balance + p_coin_amount
    WHERE id = p_recipient_id;

    -- Record sender transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_sender_id, -p_coin_amount, 'message_sent',
            jsonb_build_object('conversation_id', p_conversation_id, 'recipient_id', p_recipient_id));

    -- Record recipient transaction
    INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
    VALUES (p_recipient_id, p_coin_amount, 'message_received',
            jsonb_build_object('conversation_id', p_conversation_id, 'sender_id', p_sender_id));
  END IF;

  -- Insert message
  INSERT INTO public.messages (conversation_id, sender_id, content, media_url, media_type, is_system)
  VALUES (p_conversation_id, p_sender_id, p_content, p_media_url, p_media_type, false)
  RETURNING id INTO new_message_id;

  -- Update conversation timestamp
  UPDATE public.conversations
  SET updated_at = now()
  WHERE id = p_conversation_id;

  -- Update sender's last_read_at
  UPDATE public.conversation_participants
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id AND actor_id = p_sender_id;

  -- Return success with message details
  RETURN jsonb_build_object(
    'success', true,
    'message_id', new_message_id,
    'coins_deducted', p_coin_amount,
    'sender_new_balance', CASE WHEN p_coin_amount > 0 THEN sender_balance - p_coin_amount ELSE NULL END
  );

EXCEPTION WHEN OTHERS THEN
  -- Any error rolls back the entire transaction
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ATOMIC BOOKING ESCROW FUNCTIONS
-- ============================================

-- Create escrow table for booking holds
CREATE TABLE IF NOT EXISTS public.coin_escrows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount int NOT NULL,
  status text NOT NULL DEFAULT 'held', -- 'held', 'released', 'refunded'
  created_at timestamptz DEFAULT now(),
  released_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.coin_escrows ENABLE ROW LEVEL SECURITY;

-- Users can view their own escrows
CREATE POLICY "Users can view own escrows" ON public.coin_escrows
  FOR SELECT USING (actor_id = (SELECT id FROM public.actors WHERE user_id = auth.uid()));

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_coin_escrows_actor ON public.coin_escrows(actor_id);
CREATE INDEX IF NOT EXISTS idx_coin_escrows_booking ON public.coin_escrows(booking_id);
CREATE INDEX IF NOT EXISTS idx_coin_escrows_status ON public.coin_escrows(status);

-- Function to hold coins in escrow for a booking
CREATE OR REPLACE FUNCTION public.hold_coins_for_booking(
  p_actor_id uuid,
  p_booking_id uuid,
  p_amount int
)
RETURNS jsonb AS $$
DECLARE
  actor_type text;
  current_balance int;
  escrow_id uuid;
BEGIN
  -- Validate amount
  IF p_amount < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Amount must be at least 1');
  END IF;

  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = p_actor_id;

  IF actor_type IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Actor not found');
  END IF;

  -- Get balance with lock
  IF actor_type = 'fan' THEN
    SELECT coin_balance INTO current_balance
    FROM public.fans WHERE id = p_actor_id FOR UPDATE;
  ELSE
    SELECT coin_balance INTO current_balance
    FROM public.models WHERE id = p_actor_id FOR UPDATE;
  END IF;

  -- Check balance
  IF current_balance IS NULL OR current_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient coins',
      'balance', COALESCE(current_balance, 0),
      'required', p_amount
    );
  END IF;

  -- Deduct from balance
  IF actor_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance - p_amount, updated_at = now()
    WHERE id = p_actor_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance - p_amount
    WHERE id = p_actor_id;
  END IF;

  -- Create escrow record
  INSERT INTO public.coin_escrows (actor_id, booking_id, amount, status, metadata)
  VALUES (p_actor_id, p_booking_id, p_amount, 'held',
          jsonb_build_object('held_at', now()))
  RETURNING id INTO escrow_id;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_actor_id, -p_amount, 'booking_escrow_held',
          jsonb_build_object('booking_id', p_booking_id, 'escrow_id', escrow_id));

  RETURN jsonb_build_object(
    'success', true,
    'escrow_id', escrow_id,
    'amount', p_amount,
    'new_balance', current_balance - p_amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release escrow to model (booking completed)
CREATE OR REPLACE FUNCTION public.release_escrow_to_model(
  p_escrow_id uuid,
  p_model_id uuid
)
RETURNS jsonb AS $$
DECLARE
  escrow_record record;
BEGIN
  -- Get and lock escrow
  SELECT * INTO escrow_record
  FROM public.coin_escrows
  WHERE id = p_escrow_id AND status = 'held'
  FOR UPDATE;

  IF escrow_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow not found or already processed');
  END IF;

  -- Update escrow status
  UPDATE public.coin_escrows
  SET status = 'released', released_at = now()
  WHERE id = p_escrow_id;

  -- Credit model
  UPDATE public.models
  SET coin_balance = coin_balance + escrow_record.amount
  WHERE id = p_model_id;

  -- Record transactions
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (p_model_id, escrow_record.amount, 'booking_payment_received',
          jsonb_build_object('booking_id', escrow_record.booking_id, 'escrow_id', p_escrow_id));

  RETURN jsonb_build_object(
    'success', true,
    'amount', escrow_record.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to refund escrow (booking cancelled)
CREATE OR REPLACE FUNCTION public.refund_escrow(
  p_escrow_id uuid
)
RETURNS jsonb AS $$
DECLARE
  escrow_record record;
  actor_type text;
BEGIN
  -- Get and lock escrow
  SELECT * INTO escrow_record
  FROM public.coin_escrows
  WHERE id = p_escrow_id AND status = 'held'
  FOR UPDATE;

  IF escrow_record IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Escrow not found or already processed');
  END IF;

  -- Get actor type
  SELECT type INTO actor_type FROM public.actors WHERE id = escrow_record.actor_id;

  -- Update escrow status
  UPDATE public.coin_escrows
  SET status = 'refunded', released_at = now()
  WHERE id = p_escrow_id;

  -- Refund to original actor
  IF actor_type = 'fan' THEN
    UPDATE public.fans
    SET coin_balance = coin_balance + escrow_record.amount, updated_at = now()
    WHERE id = escrow_record.actor_id;
  ELSE
    UPDATE public.models
    SET coin_balance = coin_balance + escrow_record.amount
    WHERE id = escrow_record.actor_id;
  END IF;

  -- Record transaction
  INSERT INTO public.coin_transactions (actor_id, amount, action, metadata)
  VALUES (escrow_record.actor_id, escrow_record.amount, 'booking_escrow_refunded',
          jsonb_build_object('booking_id', escrow_record.booking_id, 'escrow_id', p_escrow_id));

  RETURN jsonb_build_object(
    'success', true,
    'amount', escrow_record.amount
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADMIN AUDIT LOGGING
-- ============================================

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text NOT NULL, -- 'model', 'fan', 'brand', 'booking', etc.
  target_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS (only admins can view)
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target ON public.admin_audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created ON public.admin_audit_logs(created_at DESC);

-- Function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_user_id uuid,
  p_action text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_old_values jsonb DEFAULT NULL,
  p_new_values jsonb DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_user_id, action, target_type, target_id,
    old_values, new_values, ip_address, user_agent
  )
  VALUES (
    p_admin_user_id, p_action, p_target_type, p_target_id,
    p_old_values, p_new_values, p_ip_address, p_user_agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
