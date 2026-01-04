-- Add call_type column to video_call_sessions
-- Supports 'video' and 'voice' call types

ALTER TABLE public.video_call_sessions
ADD COLUMN IF NOT EXISTS call_type text DEFAULT 'video' CHECK (call_type IN ('video', 'voice'));

-- Add index for call_type
CREATE INDEX IF NOT EXISTS idx_call_sessions_call_type ON public.video_call_sessions(call_type);
