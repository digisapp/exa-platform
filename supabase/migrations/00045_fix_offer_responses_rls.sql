-- Fix: offer_responses RLS policy uses subquery to models table
-- which can cause RLS recursion issues. Use SECURITY DEFINER function instead.

-- Create a function to get model_id for current user (bypasses RLS)
CREATE OR REPLACE FUNCTION get_current_user_model_id()
RETURNS UUID AS $$
  SELECT id FROM models WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop existing offer_responses policies for models
DROP POLICY IF EXISTS "Models can view own responses" ON offer_responses;
DROP POLICY IF EXISTS "Models can insert own responses" ON offer_responses;
DROP POLICY IF EXISTS "Models can update own responses" ON offer_responses;

-- Recreate with SECURITY DEFINER function
CREATE POLICY "Models can view own responses" ON offer_responses
  FOR SELECT TO authenticated
  USING (model_id = get_current_user_model_id());

CREATE POLICY "Models can insert own responses" ON offer_responses
  FOR INSERT TO authenticated
  WITH CHECK (model_id = get_current_user_model_id());

CREATE POLICY "Models can update own responses" ON offer_responses
  FOR UPDATE TO authenticated
  USING (model_id = get_current_user_model_id());

-- Also fix the offers policy to use the function
DROP POLICY IF EXISTS "Models can view offers they have responses for" ON offers;

CREATE POLICY "Models can view offers they have responses for" ON offers
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT offer_id FROM offer_responses
      WHERE model_id = get_current_user_model_id()
    )
  );

-- Fix campaign_models policy too
DROP POLICY IF EXISTS "Models can view own campaign memberships" ON campaign_models;

CREATE POLICY "Models can view own campaign memberships" ON campaign_models
  FOR SELECT TO authenticated
  USING (model_id = get_current_user_model_id());
