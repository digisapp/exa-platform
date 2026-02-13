-- Admin Content Library System
-- Admins upload content to a central library and assign it to brands
-- Brands can view and download assigned content

-- ============================================================
-- Table: content_library
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: content_library_files
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_library_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES public.content_library(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Table: content_assignments
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  library_item_id UUID NOT NULL REFERENCES public.content_library(id) ON DELETE CASCADE,
  recipient_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_assignment UNIQUE (library_item_id, recipient_actor_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_cl_uploaded_by ON public.content_library(uploaded_by);
CREATE INDEX idx_cl_created_at ON public.content_library(created_at DESC);
CREATE INDEX idx_clf_library_item_id ON public.content_library_files(library_item_id);
CREATE INDEX idx_ca_library_item_id ON public.content_assignments(library_item_id);
CREATE INDEX idx_ca_recipient ON public.content_assignments(recipient_actor_id);

-- ============================================================
-- Auto-update trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_content_library_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_library_updated_at
  BEFORE UPDATE ON public.content_library
  FOR EACH ROW
  EXECUTE FUNCTION update_content_library_timestamp();

-- ============================================================
-- RLS Policies: content_library
-- ============================================================
ALTER TABLE public.content_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content library" ON public.content_library
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- ============================================================
-- RLS Policies: content_library_files
-- ============================================================
ALTER TABLE public.content_library_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content library files" ON public.content_library_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Brands can view assigned content files" ON public.content_library_files
  FOR SELECT USING (
    library_item_id IN (
      SELECT ca.library_item_id FROM public.content_assignments ca
      WHERE EXISTS (
        SELECT 1 FROM public.actors
        WHERE actors.id = ca.recipient_actor_id
        AND actors.user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- RLS Policies: content_assignments
-- ============================================================
ALTER TABLE public.content_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage content assignments" ON public.content_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

CREATE POLICY "Brands can view own assignments" ON public.content_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = content_assignments.recipient_actor_id
      AND actors.user_id = auth.uid()
    )
  );
