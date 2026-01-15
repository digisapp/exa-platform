-- ============================================
-- TICKET SALES SYSTEM
-- Adds ticket tiers and purchases for events
-- ============================================

-- First, verify the events table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    RAISE EXCEPTION 'ERROR: events table does not exist. Please run migration 00050_events_badges_complete.sql first.';
  END IF;
END $$;

-- Add tickets_enabled flag to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS tickets_enabled boolean DEFAULT false;

-- ============================================
-- TICKET TIERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.ticket_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  price_cents int NOT NULL,
  quantity_available int,
  quantity_sold int DEFAULT 0,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_id, slug)
);

ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Ticket tiers viewable by everyone" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admins can insert ticket tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admins can update ticket tiers" ON public.ticket_tiers;
DROP POLICY IF EXISTS "Admins can delete ticket tiers" ON public.ticket_tiers;

-- Everyone can view active ticket tiers
CREATE POLICY "Ticket tiers viewable by everyone" ON public.ticket_tiers
  FOR SELECT USING (true);

-- Admins can manage ticket tiers
CREATE POLICY "Admins can insert ticket tiers" ON public.ticket_tiers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Admins can update ticket tiers" ON public.ticket_tiers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Admins can delete ticket tiers" ON public.ticket_tiers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_ticket_tiers_event ON public.ticket_tiers(event_id);

-- ============================================
-- TICKET PURCHASES TABLE
-- ============================================

-- Drop the table if it exists (to handle partial creation from previous attempts)
DROP TABLE IF EXISTS public.ticket_purchases CASCADE;

CREATE TABLE public.ticket_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_tier_id uuid NOT NULL REFERENCES public.ticket_tiers(id) ON DELETE RESTRICT,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE RESTRICT,

  -- Buyer info
  buyer_email text NOT NULL,
  buyer_name text,
  buyer_phone text,

  -- Stripe info
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,

  -- Affiliate tracking (nullable, FKs added conditionally below)
  affiliate_model_id uuid,
  affiliate_click_id uuid,
  affiliate_commission_id uuid,

  -- Pricing
  quantity int NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL,
  total_price_cents int NOT NULL,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),

  -- Timestamps
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign keys only if referenced tables exist
DO $$
BEGIN
  -- Add FK to models if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'models') THEN
    ALTER TABLE public.ticket_purchases
      ADD CONSTRAINT ticket_purchases_affiliate_model_id_fkey
      FOREIGN KEY (affiliate_model_id) REFERENCES public.models(id) ON DELETE SET NULL;
  END IF;

  -- Add FK to affiliate_clicks if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_clicks') THEN
    ALTER TABLE public.ticket_purchases
      ADD CONSTRAINT ticket_purchases_affiliate_click_id_fkey
      FOREIGN KEY (affiliate_click_id) REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL;
  END IF;

  -- Add FK to affiliate_commissions if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'affiliate_commissions') THEN
    ALTER TABLE public.ticket_purchases
      ADD CONSTRAINT ticket_purchases_affiliate_commission_id_fkey
      FOREIGN KEY (affiliate_commission_id) REFERENCES public.affiliate_commissions(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.ticket_purchases ENABLE ROW LEVEL SECURITY;

-- Admins can manage ticket purchases
CREATE POLICY "Admins can view all ticket purchases" ON public.ticket_purchases
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Admins can insert ticket purchases" ON public.ticket_purchases
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update ticket purchases" ON public.ticket_purchases
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE INDEX IF NOT EXISTS idx_ticket_purchases_event ON public.ticket_purchases(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_tier ON public.ticket_purchases(ticket_tier_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_stripe ON public.ticket_purchases(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_affiliate ON public.ticket_purchases(affiliate_model_id);
CREATE INDEX IF NOT EXISTS idx_ticket_purchases_status ON public.ticket_purchases(status);

-- ============================================
-- UPDATE QUANTITY SOLD TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_ticket_quantity_sold()
RETURNS trigger AS $$
BEGIN
  -- When purchase status changes to completed, increment quantity_sold
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.ticket_tiers
    SET quantity_sold = quantity_sold + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.ticket_tier_id;
  END IF;

  -- When purchase is refunded/cancelled after being completed, decrement quantity_sold
  IF OLD IS NOT NULL AND OLD.status = 'completed' AND NEW.status IN ('refunded', 'cancelled') THEN
    UPDATE public.ticket_tiers
    SET quantity_sold = greatest(0, quantity_sold - NEW.quantity),
        updated_at = now()
    WHERE id = NEW.ticket_tier_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_ticket_quantity ON public.ticket_purchases;
CREATE TRIGGER trigger_update_ticket_quantity
AFTER INSERT OR UPDATE ON public.ticket_purchases
FOR EACH ROW EXECUTE FUNCTION public.update_ticket_quantity_sold();

-- ============================================
-- HELPER FUNCTION: Get available quantity
-- ============================================

CREATE OR REPLACE FUNCTION public.get_ticket_availability(tier_id uuid)
RETURNS int AS $$
DECLARE
  tier_record record;
BEGIN
  SELECT quantity_available, quantity_sold INTO tier_record
  FROM public.ticket_tiers
  WHERE id = tier_id;

  IF tier_record.quantity_available IS NULL THEN
    RETURN 999999;  -- Unlimited
  END IF;

  RETURN greatest(0, tier_record.quantity_available - tier_record.quantity_sold);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
