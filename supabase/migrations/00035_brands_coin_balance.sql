-- Add coin_balance to brands table for booking payments
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS coin_balance integer DEFAULT 0;
