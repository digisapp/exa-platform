-- Media contacts table for managing press/media relationships
CREATE TABLE IF NOT EXISTS public.media_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,                  -- e.g. Editor, Photographer, Writer, Blogger
  media_company TEXT,
  email TEXT,
  phone TEXT,
  instagram_handle TEXT,
  website_url TEXT,
  category TEXT CHECK (category IN (
    'fashion', 'lifestyle', 'entertainment', 'sports',
    'photography', 'videography', 'blog', 'podcast',
    'news', 'tv', 'swimwear', 'beauty', 'other'
  )),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new', 'contacted', 'responded', 'interested',
    'not_interested', 'do_not_contact'
  )),
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for search and filter performance
CREATE INDEX IF NOT EXISTS idx_media_contacts_status ON public.media_contacts (status);
CREATE INDEX IF NOT EXISTS idx_media_contacts_category ON public.media_contacts (category);
CREATE INDEX IF NOT EXISTS idx_media_contacts_name ON public.media_contacts (name);
CREATE INDEX IF NOT EXISTS idx_media_contacts_created_at ON public.media_contacts (created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_media_contacts_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER media_contacts_updated_at
  BEFORE UPDATE ON public.media_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_media_contacts_updated_at();

-- RLS: admin-only access
ALTER TABLE public.media_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage media_contacts"
  ON public.media_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE user_id = auth.uid() AND type = 'admin'
    )
  );
