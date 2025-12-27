-- Model Applications table
-- Stores applications from fans who want to become verified models

CREATE TABLE IF NOT EXISTS public.model_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fan_id uuid REFERENCES public.fans(id) ON DELETE SET NULL,

  -- Application info
  display_name text NOT NULL,
  email text NOT NULL,
  instagram_username text,
  tiktok_username text,

  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.actors(id),
  rejection_reason text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_model_applications_user_id ON public.model_applications(user_id);
CREATE INDEX idx_model_applications_status ON public.model_applications(status);
CREATE INDEX idx_model_applications_created_at ON public.model_applications(created_at DESC);

-- Unique constraint - one pending application per user
CREATE UNIQUE INDEX idx_model_applications_unique_pending
  ON public.model_applications(user_id)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.model_applications ENABLE ROW LEVEL SECURITY;

-- Users can view their own applications
CREATE POLICY "Users can view own applications"
  ON public.model_applications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can submit applications"
  ON public.model_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.model_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update applications"
  ON public.model_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );
