-- Brand lists for organizing models into campaigns/projects
CREATE TABLE IF NOT EXISTS brand_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#ec4899', -- hex color for list badge
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(brand_id, name)
);

-- List items (models in lists)
CREATE TABLE IF NOT EXISTS brand_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES brand_lists(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  notes TEXT, -- optional notes about this model for this list
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, model_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_brand_lists_brand_id ON brand_lists(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_list_items_list_id ON brand_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_brand_list_items_model_id ON brand_list_items(model_id);

-- RLS policies
ALTER TABLE brand_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_list_items ENABLE ROW LEVEL SECURITY;

-- Brands can only see their own lists (brands.id = actors.id, actors.user_id = auth.uid())
CREATE POLICY "Brands can view own lists" ON brand_lists
  FOR SELECT USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can create own lists" ON brand_lists
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own lists" ON brand_lists
  FOR UPDATE USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can delete own lists" ON brand_lists
  FOR DELETE USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- List items policies
CREATE POLICY "Brands can view own list items" ON brand_list_items
  FOR SELECT USING (
    list_id IN (
      SELECT bl.id FROM brand_lists bl
      JOIN actors a ON bl.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can add to own lists" ON brand_list_items
  FOR INSERT WITH CHECK (
    list_id IN (
      SELECT bl.id FROM brand_lists bl
      JOIN actors a ON bl.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own list items" ON brand_list_items
  FOR UPDATE USING (
    list_id IN (
      SELECT bl.id FROM brand_lists bl
      JOIN actors a ON bl.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can remove from own lists" ON brand_list_items
  FOR DELETE USING (
    list_id IN (
      SELECT bl.id FROM brand_lists bl
      JOIN actors a ON bl.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Service role bypass for admin operations
CREATE POLICY "Service role full access to brand_lists" ON brand_lists
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access to brand_list_items" ON brand_list_items
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
