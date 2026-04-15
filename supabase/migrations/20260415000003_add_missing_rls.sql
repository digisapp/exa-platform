-- =============================================
-- Add missing RLS policies for tables identified
-- as lacking sufficient row-level security.
-- =============================================

-- =============================================
-- 1. swimcrown_competitions
-- No ownership column; admin-only write, public read
-- =============================================
ALTER TABLE public.swimcrown_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view competitions"
  ON public.swimcrown_competitions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage competitions"
  ON public.swimcrown_competitions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 2. swimcrown_contestants
-- Ownership via model_id -> models.user_id
-- =============================================
ALTER TABLE public.swimcrown_contestants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view contestants"
  ON public.swimcrown_contestants
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own contestant entries"
  ON public.swimcrown_contestants
  FOR ALL TO authenticated
  USING (
    model_id IN (SELECT id FROM public.models WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 3. content_program_applications
-- Ownership via user_id
-- =============================================
ALTER TABLE public.content_program_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view applications"
  ON public.content_program_applications
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own applications"
  ON public.content_program_applications
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 4. content_program_enrollments
-- No direct user ownership; admin-only write, public read
-- =============================================
ALTER TABLE public.content_program_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view enrollments"
  ON public.content_program_enrollments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage enrollments"
  ON public.content_program_enrollments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 5. content_program_payments
-- No direct user ownership; admin-only write, public read
-- =============================================
ALTER TABLE public.content_program_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view payments"
  ON public.content_program_payments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage payments"
  ON public.content_program_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 6. content_program_deliverables
-- No direct user ownership; admin-only write, public read
-- =============================================
ALTER TABLE public.content_program_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view deliverables"
  ON public.content_program_deliverables
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage deliverables"
  ON public.content_program_deliverables
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

-- =============================================
-- 7. brand_model_notes
-- Ownership via brand_id -> actors.user_id
-- =============================================
ALTER TABLE public.brand_model_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view brand model notes"
  ON public.brand_model_notes
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own brand model notes"
  ON public.brand_model_notes
  FOR ALL TO authenticated
  USING (
    brand_id IN (SELECT id FROM public.actors WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );
