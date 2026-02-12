-- Add payment plan columns to workshop_registrations
ALTER TABLE public.workshop_registrations
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'full',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS installments_total int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS installments_paid int DEFAULT 0;

-- Create installments tracking table
CREATE TABLE public.workshop_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES public.workshop_registrations(id) ON DELETE CASCADE,
  installment_number int NOT NULL,
  amount_cents int NOT NULL,
  status text DEFAULT 'pending',  -- pending | completed | failed | cancelled
  due_date date NOT NULL,
  stripe_payment_intent_id text,
  retry_count int DEFAULT 0,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_workshop_installments_due ON workshop_installments(due_date, status);
CREATE INDEX idx_workshop_installments_reg ON workshop_installments(registration_id);
