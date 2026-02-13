-- Content Deliveries System
-- Models can upload content deliverables tied to bookings or offers
-- Brands receive and manage deliverables in their dashboard

-- ============================================================
-- Table: content_deliveries
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who is delivering
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,

  -- What it's tied to (at least one must be set)
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,

  -- The brand/client receiving the delivery
  recipient_actor_id UUID NOT NULL REFERENCES public.actors(id) ON DELETE CASCADE,

  -- Delivery metadata
  title TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN (
    'delivered',
    'approved',
    'revision_requested'
  )),
  revision_notes TEXT,

  -- Timestamps
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  revision_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- At least one source must be set
  CONSTRAINT delivery_must_have_source CHECK (
    booking_id IS NOT NULL OR offer_id IS NOT NULL
  )
);

-- ============================================================
-- Table: delivery_files
-- ============================================================
CREATE TABLE IF NOT EXISTS public.delivery_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.content_deliveries(id) ON DELETE CASCADE,

  -- File info
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),

  -- Optional metadata
  width INTEGER,
  height INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_deliveries_model_id ON public.content_deliveries(model_id);
CREATE INDEX idx_deliveries_booking_id ON public.content_deliveries(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX idx_deliveries_offer_id ON public.content_deliveries(offer_id) WHERE offer_id IS NOT NULL;
CREATE INDEX idx_deliveries_recipient ON public.content_deliveries(recipient_actor_id);
CREATE INDEX idx_deliveries_status ON public.content_deliveries(status);
CREATE INDEX idx_deliveries_created_at ON public.content_deliveries(created_at DESC);
CREATE INDEX idx_delivery_files_delivery_id ON public.delivery_files(delivery_id);

-- ============================================================
-- Auto-update trigger for updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_delivery_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_updated_at
  BEFORE UPDATE ON public.content_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_timestamp();

-- ============================================================
-- RLS Policies: content_deliveries
-- ============================================================
ALTER TABLE public.content_deliveries ENABLE ROW LEVEL SECURITY;

-- Models can view their own deliveries
CREATE POLICY "Models can view own deliveries" ON public.content_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = content_deliveries.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Recipients can view deliveries sent to them
CREATE POLICY "Recipients can view their deliveries" ON public.content_deliveries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = content_deliveries.recipient_actor_id
      AND actors.user_id = auth.uid()
    )
  );

-- Models can create deliveries
CREATE POLICY "Models can create deliveries" ON public.content_deliveries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = content_deliveries.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Models can update their own deliveries
CREATE POLICY "Models can update own deliveries" ON public.content_deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.models
      WHERE models.id = content_deliveries.model_id
      AND models.user_id = auth.uid()
    )
  );

-- Recipients can update deliveries (approve / request revision)
CREATE POLICY "Recipients can update deliveries" ON public.content_deliveries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.id = content_deliveries.recipient_actor_id
      AND actors.user_id = auth.uid()
    )
  );

-- Admins can manage all deliveries
CREATE POLICY "Admins can manage all deliveries" ON public.content_deliveries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors
      WHERE actors.user_id = auth.uid()
      AND actors.type = 'admin'
    )
  );

-- ============================================================
-- RLS Policies: delivery_files
-- ============================================================
ALTER TABLE public.delivery_files ENABLE ROW LEVEL SECURITY;

-- Files viewable by delivery participants
CREATE POLICY "Delivery files viewable by participants" ON public.delivery_files
  FOR SELECT USING (
    delivery_id IN (
      SELECT cd.id FROM public.content_deliveries cd
      WHERE EXISTS (
        SELECT 1 FROM public.models WHERE models.id = cd.model_id AND models.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.actors WHERE actors.id = cd.recipient_actor_id AND actors.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.actors WHERE actors.user_id = auth.uid() AND actors.type = 'admin'
      )
    )
  );

-- Models can insert files into their deliveries
CREATE POLICY "Models can insert delivery files" ON public.delivery_files
  FOR INSERT WITH CHECK (
    delivery_id IN (
      SELECT cd.id FROM public.content_deliveries cd
      WHERE EXISTS (
        SELECT 1 FROM public.models WHERE models.id = cd.model_id AND models.user_id = auth.uid()
      )
    )
  );

-- Models can delete their delivery files
CREATE POLICY "Models can delete own delivery files" ON public.delivery_files
  FOR DELETE USING (
    delivery_id IN (
      SELECT cd.id FROM public.content_deliveries cd
      WHERE EXISTS (
        SELECT 1 FROM public.models WHERE models.id = cd.model_id AND models.user_id = auth.uid()
      )
    )
  );

-- Admins can manage all files
CREATE POLICY "Admins can manage all delivery files" ON public.delivery_files
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.actors WHERE actors.user_id = auth.uid() AND actors.type = 'admin'
    )
  );
