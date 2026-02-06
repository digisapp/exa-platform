-- =============================================
-- AI VIDEO GENERATIONS TABLE
-- Tracks Kling and other AI video generations
-- =============================================

CREATE TABLE IF NOT EXISTS ai_video_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User who created
  user_id UUID REFERENCES auth.users(id),

  -- Provider info
  provider TEXT NOT NULL, -- 'kling', 'runway', 'pika', etc.
  model TEXT NOT NULL, -- 'kling-v3', 'kling-v3-pro', etc.
  mode TEXT NOT NULL, -- 'text-to-video', 'image-to-video'

  -- Input
  prompt TEXT NOT NULL,
  input_image_url TEXT,

  -- Task tracking
  task_id TEXT NOT NULL,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),

  -- Output
  output_url TEXT,
  thumbnail_url TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_user ON ai_video_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_status ON ai_video_generations(status);
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_task ON ai_video_generations(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_video_generations_created ON ai_video_generations(created_at DESC);

-- RLS
ALTER TABLE ai_video_generations ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins full access ai_video_generations"
  ON ai_video_generations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Users can view their own generations
CREATE POLICY "Users view own ai_video_generations"
  ON ai_video_generations FOR SELECT
  USING (user_id = auth.uid());
