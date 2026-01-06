-- Fix: Models can't view offers because the RLS policy checks campaign_models
-- which models can't read. Change to check offer_responses instead.

-- Drop the old policy that relies on campaign_models
DROP POLICY IF EXISTS "Models can view offers for their campaigns" ON offers;
DROP POLICY IF EXISTS "Models can view offers for their lists" ON offers;

-- Create new policy that checks offer_responses (which models CAN read)
CREATE POLICY "Models can view offers they have responses for" ON offers
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT offer_id FROM offer_responses
      WHERE model_id IN (
        SELECT id FROM models WHERE user_id = auth.uid()
      )
    )
  );

-- Also add a policy so models can read their own campaign memberships
-- This is useful for other features
CREATE POLICY "Models can view own campaign memberships" ON campaign_models
  FOR SELECT TO authenticated
  USING (
    model_id IN (
      SELECT id FROM models WHERE user_id = auth.uid()
    )
  );
