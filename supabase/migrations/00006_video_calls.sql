-- Video Call Sessions Migration
-- Adds support for LiveKit video calls within conversations

-- Create video_call_sessions table
CREATE TABLE IF NOT EXISTS public.video_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  room_name text UNIQUE NOT NULL,
  initiated_by uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'missed', 'declined')),
  started_at timestamptz,
  ended_at timestamptz,
  duration_seconds int,
  coins_charged int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for quick lookups
CREATE INDEX IF NOT EXISTS idx_call_sessions_conversation ON public.video_call_sessions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON public.video_call_sessions(status) WHERE status IN ('pending', 'active');
CREATE INDEX IF NOT EXISTS idx_call_sessions_recipient ON public.video_call_sessions(recipient_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_call_sessions_initiated_by ON public.video_call_sessions(initiated_by);

-- Additional indexes for rate limiting and analytics
CREATE INDEX IF NOT EXISTS idx_call_sessions_initiated_created
  ON public.video_call_sessions(initiated_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_recipient_created
  ON public.video_call_sessions(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_sessions_ended_status
  ON public.video_call_sessions(status, ended_at DESC) WHERE status = 'ended';

-- Enable RLS
ALTER TABLE public.video_call_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view call sessions they're part of
CREATE POLICY "Users can view their call sessions"
  ON public.video_call_sessions
  FOR SELECT
  USING (
    initiated_by IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Users can create call sessions (will be done via API with proper validation)
CREATE POLICY "Users can create call sessions"
  ON public.video_call_sessions
  FOR INSERT
  WITH CHECK (
    initiated_by IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Users can update call sessions they're part of
CREATE POLICY "Users can update their call sessions"
  ON public.video_call_sessions
  FOR UPDATE
  USING (
    initiated_by IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
    OR recipient_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
  );

-- Grant permissions
GRANT ALL ON public.video_call_sessions TO authenticated;
GRANT SELECT ON public.video_call_sessions TO anon;
