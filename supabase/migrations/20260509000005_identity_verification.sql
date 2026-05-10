-- Identity verification (phase 1 — manual admin review)
--
-- Adds a structured verification flow so admins have a defensible record of
-- who verified each model's identity before approving payouts. This phase
-- does NOT block the withdrawal_requests RPC — admins surface the badge in
-- the payouts UI and decide per-payout. A future migration can flip the
-- enforcement once all paying models are verified.
--
-- Storage: a private bucket `identity-documents` holds the uploaded ID
-- photo + selfie. Only the owning model can upload, and only admins can
-- read.

-- ============================================
-- 1. Columns on models
-- ============================================

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS identity_verified_by uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_legal_name text,
  ADD COLUMN IF NOT EXISTS verified_dob date,
  ADD COLUMN IF NOT EXISTS verified_country text;

CREATE INDEX IF NOT EXISTS idx_models_identity_verified
  ON public.models (identity_verified_at)
  WHERE identity_verified_at IS NOT NULL;

COMMENT ON COLUMN public.models.identity_verified_at IS
  'Timestamp when an admin (or future Stripe Identity webhook) confirmed this model''s real-world identity. NULL = not yet verified.';
COMMENT ON COLUMN public.models.verified_dob IS
  'DOB read from a verified ID document. Distinct from models.dob (user-typed).';

-- ============================================
-- 2. model_verifications table — request lifecycle
-- ============================================

CREATE TABLE IF NOT EXISTS public.model_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'rejected')),
  id_document_path text NOT NULL,
  selfie_path text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.actors(id) ON DELETE SET NULL,
  rejection_reason text,
  -- Captured by admin from the document at review time. Distinct from
  -- models.verified_* in case the model resubmits later.
  legal_name text,
  date_of_birth date,
  country text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_verifications_model
  ON public.model_verifications (model_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_model_verifications_pending
  ON public.model_verifications (submitted_at DESC)
  WHERE status = 'pending_review';

ALTER TABLE public.model_verifications ENABLE ROW LEVEL SECURITY;

-- Models can read their own verification rows.
CREATE POLICY "model_verifications_self_select" ON public.model_verifications
  FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM public.models WHERE user_id = auth.uid()
    )
  );

-- Models can insert their own verification rows.
CREATE POLICY "model_verifications_self_insert" ON public.model_verifications
  FOR INSERT
  WITH CHECK (
    model_id IN (
      SELECT id FROM public.models WHERE user_id = auth.uid()
    )
  );

-- Admins can read everything.
CREATE POLICY "model_verifications_admin_select" ON public.model_verifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- Admins can update (approve / reject).
CREATE POLICY "model_verifications_admin_update" ON public.model_verifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- ============================================
-- 3. Storage bucket — private
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: model can upload to a folder named after their model_id;
-- admins can read everything; no one else has any access.

-- Path convention: <model_id>/<verification_id>/<id_document|selfie>.<ext>

CREATE POLICY "identity_docs_model_upload" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'identity-documents'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.models WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "identity_docs_admin_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'identity-documents'
    AND EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );

-- ============================================
-- 4. Helper RPC: approve_model_verification
--    Atomically marks the verification approved AND stamps the
--    model row's identity_verified_* columns.
-- ============================================

CREATE OR REPLACE FUNCTION public.approve_model_verification(
  p_verification_id uuid,
  p_legal_name text,
  p_date_of_birth date,
  p_country text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification record;
  v_admin_actor_id uuid;
BEGIN
  -- Confirm caller is an admin and capture their actor_id for audit.
  SELECT id INTO v_admin_actor_id
    FROM public.actors
   WHERE user_id = auth.uid() AND type = 'admin';

  IF v_admin_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_verification
    FROM public.model_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_verification.status <> 'pending_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  UPDATE public.model_verifications
     SET status = 'approved',
         reviewed_at = now(),
         reviewed_by = v_admin_actor_id,
         legal_name = p_legal_name,
         date_of_birth = p_date_of_birth,
         country = p_country
   WHERE id = p_verification_id;

  UPDATE public.models
     SET identity_verified_at = now(),
         identity_verified_by = v_admin_actor_id,
         verified_legal_name = p_legal_name,
         verified_dob = p_date_of_birth,
         verified_country = p_country
   WHERE id = v_verification.model_id;

  RETURN jsonb_build_object('success', true, 'model_id', v_verification.model_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_model_verification(uuid, text, date, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_model_verification(
  p_verification_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification record;
  v_admin_actor_id uuid;
BEGIN
  SELECT id INTO v_admin_actor_id
    FROM public.actors
   WHERE user_id = auth.uid() AND type = 'admin';

  IF v_admin_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_verification
    FROM public.model_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF v_verification IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_verification.status <> 'pending_review' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  UPDATE public.model_verifications
     SET status = 'rejected',
         reviewed_at = now(),
         reviewed_by = v_admin_actor_id,
         rejection_reason = p_reason
   WHERE id = p_verification_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_model_verification(uuid, text)
  TO authenticated;
