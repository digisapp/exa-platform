-- ============================================
-- USER BLOCKING SYSTEM
-- ============================================
-- Allows users to block other users from messaging them or viewing their profile

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  reason text, -- Optional reason for the block
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id) -- Can't block yourself
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks (both who they blocked and who blocked them)
CREATE POLICY "Users can view own blocks" ON public.user_blocks
  FOR SELECT USING (
    blocker_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON public.user_blocks
  FOR INSERT WITH CHECK (
    blocker_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Users can delete their own blocks (unblock)
CREATE POLICY "Users can delete own blocks" ON public.user_blocks
  FOR DELETE USING (
    blocker_id = (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_pair ON public.user_blocks(blocker_id, blocked_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Check if user A has blocked user B or vice versa
CREATE OR REPLACE FUNCTION public.is_blocked(
  p_actor_id_1 uuid,
  p_actor_id_2 uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_actor_id_1 AND blocked_id = p_actor_id_2)
       OR (blocker_id = p_actor_id_2 AND blocked_id = p_actor_id_1)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Check if user A has blocked user B (one direction only)
CREATE OR REPLACE FUNCTION public.has_blocked(
  p_blocker_id uuid,
  p_blocked_id uuid
)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Block a user
CREATE OR REPLACE FUNCTION public.block_user(
  p_blocker_id uuid,
  p_blocked_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  block_id uuid;
BEGIN
  -- Validate not blocking self
  IF p_blocker_id = p_blocked_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot block yourself');
  END IF;

  -- Check if already blocked
  IF public.has_blocked(p_blocker_id, p_blocked_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already blocked');
  END IF;

  -- Create block
  INSERT INTO public.user_blocks (blocker_id, blocked_id, reason)
  VALUES (p_blocker_id, p_blocked_id, p_reason)
  RETURNING id INTO block_id;

  RETURN jsonb_build_object('success', true, 'block_id', block_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(
  p_blocker_id uuid,
  p_blocked_id uuid
)
RETURNS jsonb AS $$
BEGIN
  DELETE FROM public.user_blocks
  WHERE blocker_id = p_blocker_id AND blocked_id = p_blocked_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Block not found');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get list of blocked users for an actor
CREATE OR REPLACE FUNCTION public.get_blocked_users(
  p_actor_id uuid
)
RETURNS TABLE (
  block_id uuid,
  blocked_actor_id uuid,
  blocked_at timestamptz,
  reason text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ub.id as block_id,
    ub.blocked_id as blocked_actor_id,
    ub.created_at as blocked_at,
    ub.reason
  FROM public.user_blocks ub
  WHERE ub.blocker_id = p_actor_id
  ORDER BY ub.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
