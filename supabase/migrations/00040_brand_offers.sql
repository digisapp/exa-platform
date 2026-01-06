-- Brand Offers: Private opportunities sent to model lists
-- Unlike public gigs, offers are targeted to specific lists

-- Offers table
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES actors(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES brand_lists(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_name TEXT, -- "Mila Restaurant"
  location_city TEXT,
  location_state TEXT,
  event_date DATE,
  event_time TEXT, -- "8:00 PM"
  compensation_type TEXT NOT NULL DEFAULT 'perks', -- paid, perks, tfp, exposure
  compensation_amount INTEGER DEFAULT 0, -- in cents if paid
  compensation_description TEXT, -- "Free dinner + drinks"
  spots INTEGER NOT NULL DEFAULT 1,
  spots_filled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open', -- open, closed, completed, cancelled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offer responses from models
CREATE TABLE IF NOT EXISTS offer_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, declined, confirmed
  notes TEXT, -- optional message from model
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(offer_id, model_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_brand_id ON offers(brand_id);
CREATE INDEX IF NOT EXISTS idx_offers_list_id ON offers(list_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_event_date ON offers(event_date);
CREATE INDEX IF NOT EXISTS idx_offer_responses_offer_id ON offer_responses(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_responses_model_id ON offer_responses(model_id);
CREATE INDEX IF NOT EXISTS idx_offer_responses_status ON offer_responses(status);

-- RLS Policies
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_responses ENABLE ROW LEVEL SECURITY;

-- Brands can view and manage their own offers
CREATE POLICY "Brands can view own offers"
  ON offers FOR SELECT
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can insert own offers"
  ON offers FOR INSERT
  TO authenticated
  WITH CHECK (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can update own offers"
  ON offers FOR UPDATE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

CREATE POLICY "Brands can delete own offers"
  ON offers FOR DELETE
  TO authenticated
  USING (
    brand_id IN (
      SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
    )
  );

-- Models can view offers sent to lists they're in
CREATE POLICY "Models can view offers for their lists"
  ON offers FOR SELECT
  TO authenticated
  USING (
    list_id IN (
      SELECT list_id FROM brand_list_items
      WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

-- Admins can view all offers
CREATE POLICY "Admins can view all offers"
  ON offers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- Offer responses policies
-- Models can view their own responses
CREATE POLICY "Models can view own responses"
  ON offer_responses FOR SELECT
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own responses
CREATE POLICY "Models can insert own responses"
  ON offer_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Models can update their own responses
CREATE POLICY "Models can update own responses"
  ON offer_responses FOR UPDATE
  TO authenticated
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );

-- Brands can view responses to their offers
CREATE POLICY "Brands can view responses to own offers"
  ON offer_responses FOR SELECT
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE brand_id IN (
        SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
      )
    )
  );

-- Brands can update responses (to confirm models)
CREATE POLICY "Brands can update responses to own offers"
  ON offer_responses FOR UPDATE
  TO authenticated
  USING (
    offer_id IN (
      SELECT id FROM offers WHERE brand_id IN (
        SELECT id FROM actors WHERE user_id = auth.uid() AND type = 'brand'
      )
    )
  );

-- Admins can do everything
CREATE POLICY "Admins can manage all responses"
  ON offer_responses FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM actors WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- Function to increment spots filled
CREATE OR REPLACE FUNCTION increment_offer_spots_filled(p_offer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE offers
  SET spots_filled = spots_filled + 1
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement spots filled
CREATE OR REPLACE FUNCTION decrement_offer_spots_filled(p_offer_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE offers
  SET spots_filled = GREATEST(spots_filled - 1, 0)
  WHERE id = p_offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
