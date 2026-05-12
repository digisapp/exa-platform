-- Per-workshop payment plan configuration
-- Replaces the previously hardcoded 3 × $125 plan with per-workshop settings.

ALTER TABLE public.workshops
  ADD COLUMN IF NOT EXISTS payment_plan_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_plan_installments int,
  ADD COLUMN IF NOT EXISTS payment_plan_amount_cents int,
  ADD COLUMN IF NOT EXISTS payment_plan_interval_days int NOT NULL DEFAULT 30;

ALTER TABLE public.workshops
  ADD CONSTRAINT workshops_payment_plan_valid
  CHECK (
    payment_plan_enabled = false
    OR (
      payment_plan_installments IS NOT NULL
      AND payment_plan_installments >= 2
      AND payment_plan_amount_cents IS NOT NULL
      AND payment_plan_amount_cents > 0
    )
  );
