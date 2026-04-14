-- EXA Live Wall: real-time public chat feed on the homepage
-- Anyone can read; posting requires an authenticated account

-- ============================================
-- Table
-- ============================================
CREATE TABLE public.live_wall_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL DEFAULT 'system', -- 'model', 'fan', 'brand', 'admin', 'system'
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 280),
  message_type TEXT NOT NULL DEFAULT 'chat' CHECK (message_type IN ('chat', 'system')),
  reactions JSONB NOT NULL DEFAULT '{}',
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_live_wall_created_at ON public.live_wall_messages(created_at DESC);

-- ============================================
-- Enable Realtime
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_wall_messages;

-- ============================================
-- RLS
-- ============================================
ALTER TABLE public.live_wall_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-deleted messages (including anonymous)
CREATE POLICY "Anyone can read live wall"
  ON public.live_wall_messages FOR SELECT
  USING (is_deleted = false);

-- Authenticated users can insert their own messages
CREATE POLICY "Authenticated users can post"
  ON public.live_wall_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_id IS NOT NULL
    AND actor_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Authenticated users can update reactions on non-deleted messages
CREATE POLICY "Authenticated users can update reactions"
  ON public.live_wall_messages FOR UPDATE
  TO authenticated
  USING (is_deleted = false)
  WITH CHECK (is_deleted = false);

-- ============================================
-- Atomic reaction toggle (avoids lost-update on concurrent reactions)
-- ============================================
CREATE OR REPLACE FUNCTION public.toggle_live_wall_reaction(
  p_message_id UUID,
  p_actor_id UUID,
  p_emoji TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactions JSONB;
  v_actors JSONB;
  v_idx INT;
BEGIN
  SELECT reactions INTO v_reactions
  FROM live_wall_messages
  WHERE id = p_message_id AND is_deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN '{"error": "Message not found"}'::JSONB;
  END IF;

  -- Get current array for this emoji, or empty array
  v_actors := COALESCE(v_reactions -> p_emoji, '[]'::JSONB);

  -- Check if actor already reacted
  SELECT i INTO v_idx
  FROM jsonb_array_elements_text(v_actors) WITH ORDINALITY AS t(val, i)
  WHERE val = p_actor_id::TEXT
  LIMIT 1;

  IF v_idx IS NOT NULL THEN
    -- Remove actor (toggle off)
    v_actors := v_actors - (v_idx - 1);
  ELSE
    -- Add actor (toggle on)
    v_actors := v_actors || to_jsonb(p_actor_id::TEXT);
  END IF;

  -- Update or remove the emoji key
  IF jsonb_array_length(v_actors) = 0 THEN
    v_reactions := v_reactions - p_emoji;
  ELSE
    v_reactions := jsonb_set(v_reactions, ARRAY[p_emoji], v_actors);
  END IF;

  UPDATE live_wall_messages SET reactions = v_reactions WHERE id = p_message_id;

  RETURN v_reactions;
END;
$$;

-- ============================================
-- System event triggers (auto-post on signups)
-- ============================================
CREATE OR REPLACE FUNCTION public.live_wall_on_model_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', NEW.first_name || ' just joined EXA as a model!', 'system');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.live_wall_on_fan_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    INSERT INTO live_wall_messages (actor_type, display_name, content, message_type)
    VALUES ('system', 'EXA', NEW.username || ' just joined the community!', 'system');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER live_wall_model_signup
  AFTER INSERT ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.live_wall_on_model_signup();

CREATE TRIGGER live_wall_fan_signup
  AFTER INSERT ON public.fans
  FOR EACH ROW EXECUTE FUNCTION public.live_wall_on_fan_signup();
