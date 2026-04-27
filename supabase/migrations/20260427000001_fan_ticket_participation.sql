-- Add fan_id to ticket_purchases for account linking and participation tracking
ALTER TABLE ticket_purchases
ADD COLUMN IF NOT EXISTS fan_id UUID REFERENCES fans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_fan_id ON ticket_purchases(fan_id);

-- Backfill fan_id for existing completed purchases where email matches
UPDATE ticket_purchases tp
SET fan_id = f.id
FROM fans f
WHERE tp.buyer_email = f.email
  AND tp.fan_id IS NULL
  AND tp.status = 'completed';

-- Allow fans to view their own ticket purchases (by fan_id linkage or matching email)
CREATE POLICY "Fans can view own ticket purchases" ON public.ticket_purchases
  FOR SELECT USING (
    fan_id = (SELECT id FROM public.fans WHERE user_id = auth.uid())
    OR buyer_email = (SELECT email FROM public.fans WHERE user_id = auth.uid())
  );
