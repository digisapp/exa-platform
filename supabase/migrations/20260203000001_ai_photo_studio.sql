-- AI Photo Studio - Generate model photos in different scenarios
-- Uses Replicate API with InstantID/Flux for face preservation

-- AI generation requests table
CREATE TABLE ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,

  -- Input
  source_image_url TEXT NOT NULL,  -- The face photo uploaded
  scenario_id TEXT NOT NULL,        -- Preset scenario key
  scenario_name TEXT NOT NULL,      -- Human readable name
  prompt TEXT NOT NULL,             -- Full prompt sent to AI

  -- Output
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  replicate_prediction_id TEXT,     -- Replicate API prediction ID
  result_urls TEXT[] DEFAULT '{}',  -- Array of generated image URLs
  error_message TEXT,

  -- Cost tracking
  coins_spent INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  processing_time_ms INTEGER
);

-- Saved AI photos (ones the model chose to keep)
CREATE TABLE ai_saved_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  generation_id UUID NOT NULL REFERENCES ai_generations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  scenario_name TEXT NOT NULL,
  added_to_portfolio BOOLEAN DEFAULT false,
  portfolio_media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ai_generations_model ON ai_generations(model_id, created_at DESC);
CREATE INDEX idx_ai_generations_status ON ai_generations(status) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_ai_saved_photos_model ON ai_saved_photos(model_id, created_at DESC);

-- RLS
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_saved_photos ENABLE ROW LEVEL SECURITY;

-- Models can view their own generations
CREATE POLICY "Models can view own generations" ON ai_generations FOR SELECT
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Models can insert their own generations
CREATE POLICY "Models can create generations" ON ai_generations FOR INSERT
  WITH CHECK (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Models can view their own saved photos
CREATE POLICY "Models can view own saved photos" ON ai_saved_photos FOR SELECT
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Models can manage their own saved photos
CREATE POLICY "Models can manage own saved photos" ON ai_saved_photos FOR ALL
  USING (model_id IN (SELECT id FROM models WHERE user_id = auth.uid()));

-- Service role can update generations (for webhook/polling updates)
CREATE POLICY "Service can update generations" ON ai_generations FOR UPDATE
  USING (true)
  WITH CHECK (true);
