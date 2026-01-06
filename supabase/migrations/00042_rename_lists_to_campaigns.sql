-- Rename brand_lists to campaigns
-- Rename brand_list_items to campaign_models
-- Update offers.list_id to offers.campaign_id

-- Step 1: Rename tables
ALTER TABLE brand_lists RENAME TO campaigns;
ALTER TABLE brand_list_items RENAME TO campaign_models;

-- Step 2: Rename columns
ALTER TABLE campaign_models RENAME COLUMN list_id TO campaign_id;
ALTER TABLE offers RENAME COLUMN list_id TO campaign_id;

-- Step 3: Rename indexes
ALTER INDEX IF EXISTS idx_brand_lists_brand_id RENAME TO idx_campaigns_brand_id;
ALTER INDEX IF EXISTS idx_brand_list_items_list_id RENAME TO idx_campaign_models_campaign_id;
ALTER INDEX IF EXISTS idx_brand_list_items_model_id RENAME TO idx_campaign_models_model_id;
ALTER INDEX IF EXISTS idx_offers_list_id RENAME TO idx_offers_campaign_id;

-- Step 4: Drop old RLS policies on campaigns (formerly brand_lists)
DROP POLICY IF EXISTS "Brands can view own lists" ON campaigns;
DROP POLICY IF EXISTS "Brands can create own lists" ON campaigns;
DROP POLICY IF EXISTS "Brands can update own lists" ON campaigns;
DROP POLICY IF EXISTS "Brands can delete own lists" ON campaigns;
DROP POLICY IF EXISTS "Service role full access to brand_lists" ON campaigns;

-- Step 5: Create new RLS policies on campaigns
CREATE POLICY "Brands can view own campaigns" ON campaigns
  FOR SELECT USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can create own campaigns" ON campaigns
  FOR INSERT WITH CHECK (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own campaigns" ON campaigns
  FOR UPDATE USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can delete own campaigns" ON campaigns
  FOR DELETE USING (
    brand_id IN (
      SELECT b.id FROM brands b
      JOIN actors a ON b.id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to campaigns" ON campaigns
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 6: Drop old RLS policies on campaign_models (formerly brand_list_items)
DROP POLICY IF EXISTS "Brands can view own list items" ON campaign_models;
DROP POLICY IF EXISTS "Brands can add to own lists" ON campaign_models;
DROP POLICY IF EXISTS "Brands can update own list items" ON campaign_models;
DROP POLICY IF EXISTS "Brands can remove from own lists" ON campaign_models;
DROP POLICY IF EXISTS "Service role full access to brand_list_items" ON campaign_models;

-- Step 7: Create new RLS policies on campaign_models
CREATE POLICY "Brands can view own campaign models" ON campaign_models
  FOR SELECT USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN actors a ON c.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can add to own campaigns" ON campaign_models
  FOR INSERT WITH CHECK (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN actors a ON c.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can update own campaign models" ON campaign_models
  FOR UPDATE USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN actors a ON c.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Brands can remove from own campaigns" ON campaign_models
  FOR DELETE USING (
    campaign_id IN (
      SELECT c.id FROM campaigns c
      JOIN actors a ON c.brand_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role full access to campaign_models" ON campaign_models
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 8: Update offers policy for models viewing offers (references campaign_models now)
DROP POLICY IF EXISTS "Models can view offers for their lists" ON offers;

CREATE POLICY "Models can view offers for their campaigns" ON offers
  FOR SELECT TO authenticated
  USING (
    campaign_id IN (
      SELECT campaign_id FROM campaign_models
      WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );
