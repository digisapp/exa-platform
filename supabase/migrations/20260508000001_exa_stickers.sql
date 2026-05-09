-- EXA Stickers: admin-curated GIF/sticker library for the Live Wall
-- Replaces reliance on third-party GIF providers (GIPHY/Tenor) and lets us
-- ship a brand-native asset library that can include model-derived stickers.

CREATE TABLE IF NOT EXISTS public.exa_stickers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  storage_path  TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  width         INT,
  height        INT,
  size_bytes    BIGINT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  category      TEXT,
  model_id      UUID REFERENCES public.models(id) ON DELETE SET NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured   BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order    INT NOT NULL DEFAULT 0,
  use_count     INT NOT NULL DEFAULT 0,
  created_by    UUID REFERENCES public.actors(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_exa_stickers_active_sort
  ON public.exa_stickers (is_active, sort_order DESC, created_at DESC);
CREATE INDEX idx_exa_stickers_category
  ON public.exa_stickers (category) WHERE is_active = TRUE;
CREATE INDEX idx_exa_stickers_model
  ON public.exa_stickers (model_id) WHERE is_active = TRUE;
CREATE INDEX idx_exa_stickers_featured
  ON public.exa_stickers (is_featured) WHERE is_active = TRUE AND is_featured = TRUE;
CREATE INDEX idx_exa_stickers_tags
  ON public.exa_stickers USING GIN (tags);

ALTER TABLE public.exa_stickers ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read active stickers (used by the picker)
CREATE POLICY "Anyone can read active stickers"
  ON public.exa_stickers
  FOR SELECT
  USING (is_active = TRUE);

-- Admins can read everything (incl. inactive) and manage
CREATE POLICY "Admins manage stickers"
  ON public.exa_stickers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
        AND actors.type = 'admin'
    )
  );

-- Bump updated_at on update
CREATE OR REPLACE FUNCTION public.exa_stickers_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exa_stickers_updated_at ON public.exa_stickers;
CREATE TRIGGER exa_stickers_updated_at
  BEFORE UPDATE ON public.exa_stickers
  FOR EACH ROW
  EXECUTE FUNCTION public.exa_stickers_set_updated_at();

-- Atomic increment for sticker usage analytics
CREATE OR REPLACE FUNCTION public.increment_exa_sticker_use(p_sticker_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.exa_stickers
  SET use_count = use_count + 1
  WHERE id = p_sticker_id AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_exa_sticker_use(UUID) TO authenticated, service_role;

-- Storage bucket for sticker assets (public read, admin-only writes via service role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('stickers', 'stickers', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read; writes happen via service role API only
CREATE POLICY "Anyone can view stickers bucket"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'stickers');
