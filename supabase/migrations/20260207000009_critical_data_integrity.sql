-- =============================================
-- CRITICAL DATA INTEGRITY FIXES
-- Migration: 20260207000009_critical_data_integrity.sql
--
-- 1. Coin balance CHECK constraints (ensure all three tables are covered)
-- 2. Improved atomic stock increment function with NOT FOUND guard
-- 3. PPV message unlock: SKIPPED (already exists in 20260207000004_ppv_messages.sql)
-- 4. Payoneer webhook event tracking table for idempotent processing
-- =============================================


-- =============================================
-- 1. COIN BALANCE NON-NEGATIVE CHECK CONSTRAINTS
-- Ensures coin_balance can never go negative at the database level.
-- The fans table already has this from 00003_add_fans.sql (inline CHECK),
-- and models/brands were added in 20260122000007_atomic_tips_and_constraints.sql.
-- We re-apply all three here idempotently for defense-in-depth.
-- =============================================

-- Fans: inline CHECK exists as unnamed constraint; add named one if missing
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fans_coin_balance_non_negative'
  ) THEN
    ALTER TABLE public.fans
      ADD CONSTRAINT fans_coin_balance_non_negative CHECK (coin_balance >= 0);
  END IF;
END $$;

-- Models
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'models_coin_balance_non_negative'
  ) THEN
    ALTER TABLE public.models
      ADD CONSTRAINT models_coin_balance_non_negative CHECK (coin_balance >= 0);
  END IF;
END $$;

-- Brands
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brands_coin_balance_non_negative'
  ) THEN
    ALTER TABLE public.brands
      ADD CONSTRAINT brands_coin_balance_non_negative CHECK (coin_balance >= 0);
  END IF;
END $$;


-- =============================================
-- 2. IMPROVED ATOMIC STOCK INCREMENT FUNCTION
-- The existing increment_total_sold (from 20260207000007) does not:
--   a) Validate that the product exists (no NOT FOUND guard)
--   b) Update the updated_at timestamp
-- This replaces it with a safer version and also creates an
-- aliased increment_product_total_sold for clarity.
-- =============================================

-- Replace the existing function with a safer version
CREATE OR REPLACE FUNCTION public.increment_total_sold(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.shop_products
  SET total_sold = COALESCE(total_sold, 0) + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
END;
$$;

-- Create a clearly-named alias that calls the same logic
CREATE OR REPLACE FUNCTION public.increment_product_total_sold(
  p_product_id UUID,
  p_quantity INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.shop_products
  SET total_sold = COALESCE(total_sold, 0) + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id;
  END IF;
END;
$$;


-- =============================================
-- 3. PPV MESSAGE UNLOCK — SKIPPED
-- An atomic unlock_message_media function already exists in
-- migration 20260207000004_ppv_messages.sql. It:
--   - Locks the buyer's balance row (FOR UPDATE)
--   - Checks sufficient balance
--   - Deducts coins from buyer (fan/brand/model)
--   - Credits coins to seller (model)
--   - Creates coin_transaction records for both parties
--   - Marks the message as unlocked (media_viewed_by array)
-- No additional work is needed here.
-- =============================================


-- =============================================
-- 4. PAYONEER WEBHOOK EVENT TRACKING TABLE
-- Stores processed Payoneer webhook events to enable
-- idempotent webhook handling and prevent duplicate processing.
-- Only accessible via service role (RLS blocks all authenticated users).
-- =============================================

CREATE TABLE IF NOT EXISTS public.payoneer_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB
);

-- Index for fast lookups by event_id (UNIQUE already creates one, but
-- an explicit index on event_type aids filtering queries)
CREATE INDEX IF NOT EXISTS idx_payoneer_webhook_events_type
  ON public.payoneer_webhook_events (event_type);

CREATE INDEX IF NOT EXISTS idx_payoneer_webhook_events_processed
  ON public.payoneer_webhook_events (processed_at);

-- Enable RLS
ALTER TABLE public.payoneer_webhook_events ENABLE ROW LEVEL SECURITY;

-- Block all access via RLS — only service role (which bypasses RLS) can read/write
CREATE POLICY "Service role only" ON public.payoneer_webhook_events
  FOR ALL USING (false);

-- Grant table permissions to service role implicitly (service role bypasses RLS)
-- Revoke from authenticated to be explicit
REVOKE ALL ON public.payoneer_webhook_events FROM authenticated;
REVOKE ALL ON public.payoneer_webhook_events FROM anon;
