-- Brand Model Notes & Tags
-- Allows brands to add private notes and tags to models

CREATE TABLE brand_model_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, model_id)
);

-- Indexes
CREATE INDEX idx_brand_model_notes_brand_id ON brand_model_notes(brand_id);
CREATE INDEX idx_brand_model_notes_model_id ON brand_model_notes(model_id);
CREATE INDEX idx_brand_model_notes_tags ON brand_model_notes USING GIN(tags);

-- RLS
ALTER TABLE brand_model_notes ENABLE ROW LEVEL SECURITY;

-- Brands can only see their own notes
CREATE POLICY "Brands can view own model notes" ON brand_model_notes
  FOR SELECT USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can create own model notes" ON brand_model_notes
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can update own model notes" ON brand_model_notes
  FOR UPDATE USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can delete own model notes" ON brand_model_notes
  FOR DELETE USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Service role full access to brand_model_notes" ON brand_model_notes
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
