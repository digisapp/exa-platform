-- ============================================
-- WORKSHOPS SYSTEM
-- For training workshops, runway classes, etc.
-- ============================================

-- ============================================
-- WORKSHOPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  subtitle text,
  description text,
  cover_image_url text,

  -- Location
  location_name text,
  location_city text,
  location_state text,
  location_address text,

  -- Date/Time
  date date NOT NULL,
  start_time time,
  end_time time,

  -- Pricing
  price_cents int NOT NULL,
  original_price_cents int, -- For showing "was $X, now $Y"

  -- Capacity
  spots_available int,
  spots_sold int DEFAULT 0,

  -- Content
  highlights text[], -- Array of bullet points
  what_to_bring text[],
  instructors text[],

  -- Related event (optional)
  event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,

  -- Status
  status text DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'cancelled')),
  is_featured boolean DEFAULT false,

  -- SEO
  meta_title text,
  meta_description text,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

-- Everyone can view active workshops
CREATE POLICY "Workshops viewable by everyone" ON public.workshops
  FOR SELECT USING (status IN ('upcoming', 'active', 'completed'));

-- Admins can manage workshops
CREATE POLICY "Admins can manage workshops" ON public.workshops
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE INDEX idx_workshops_slug ON public.workshops(slug);
CREATE INDEX idx_workshops_date ON public.workshops(date);
CREATE INDEX idx_workshops_status ON public.workshops(status);

-- ============================================
-- WORKSHOP REGISTRATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.workshop_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE RESTRICT,

  -- Buyer info
  buyer_email text NOT NULL,
  buyer_name text,
  buyer_phone text,

  -- Stripe info
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,

  -- Pricing
  quantity int NOT NULL DEFAULT 1,
  unit_price_cents int NOT NULL,
  total_price_cents int NOT NULL,

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),

  -- Timestamps
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;

-- Admins can manage registrations
CREATE POLICY "Admins can view all registrations" ON public.workshop_registrations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE POLICY "Anyone can insert registrations" ON public.workshop_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update registrations" ON public.workshop_registrations
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.actors WHERE user_id = auth.uid() AND type = 'admin')
  );

CREATE INDEX idx_workshop_registrations_workshop ON public.workshop_registrations(workshop_id);
CREATE INDEX idx_workshop_registrations_stripe ON public.workshop_registrations(stripe_checkout_session_id);
CREATE INDEX idx_workshop_registrations_status ON public.workshop_registrations(status);
CREATE INDEX idx_workshop_registrations_email ON public.workshop_registrations(buyer_email);

-- ============================================
-- UPDATE SPOTS SOLD TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION public.update_workshop_spots_sold()
RETURNS trigger AS $$
BEGIN
  -- When registration status changes to completed, increment spots_sold
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.workshops
    SET spots_sold = spots_sold + NEW.quantity,
        updated_at = now()
    WHERE id = NEW.workshop_id;
  END IF;

  -- When registration is refunded/cancelled after being completed, decrement spots_sold
  IF OLD IS NOT NULL AND OLD.status = 'completed' AND NEW.status IN ('refunded', 'cancelled') THEN
    UPDATE public.workshops
    SET spots_sold = greatest(0, spots_sold - NEW.quantity),
        updated_at = now()
    WHERE id = NEW.workshop_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_workshop_spots ON public.workshop_registrations;
CREATE TRIGGER trigger_update_workshop_spots
AFTER INSERT OR UPDATE ON public.workshop_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_workshop_spots_sold();

-- ============================================
-- SEED MIAMI SWIM WEEK RUNWAY WORKSHOP
-- ============================================

INSERT INTO public.workshops (
  slug,
  title,
  subtitle,
  description,
  location_city,
  location_state,
  date,
  start_time,
  end_time,
  price_cents,
  spots_available,
  highlights,
  what_to_bring,
  status,
  is_featured,
  meta_title,
  meta_description
) VALUES (
  'runway-workshop',
  'Miami Swim Week Runway Workshop',
  'Perfect your Catwalk & Camera Ready Skills',
  'Join us for an exclusive runway workshop designed to prepare you for Miami Swim Week and beyond. Learn from industry professionals who have coached models for top fashion events worldwide. This intensive workshop will cover runway techniques, posture, posing, and the confidence you need to shine on any catwalk.

Whether you''re a beginner looking to break into the industry or an experienced model wanting to refine your skills, this workshop is your gateway to the runway.',
  'Miami Beach',
  'FL',
  '2026-05-24',
  '10:00:00',
  '16:00:00',
  35000, -- $350.00
  30,
  ARRAY[
    'Learn professional runway walking techniques from industry experts',
    'Master swimwear and resort wear presentation',
    'Get camera-ready with posing and expression coaching',
    'Networking opportunities with designers and industry professionals',
    'Certificate of completion'
  ],
  ARRAY[
    'Comfortable practice heels (ladies)',
    'Form-fitting workout attire',
    'Water bottle',
    'Positive attitude!'
  ],
  'upcoming',
  true,
  'Miami Swim Week Runway Workshop | EXA Models',
  'Perfect your catwalk and camera-ready skills at our Miami Swim Week Runway Workshop. Workshop attendees get priority casting for our Miami Swim Week Shows.'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  location_city = EXCLUDED.location_city,
  location_state = EXCLUDED.location_state,
  date = EXCLUDED.date,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  price_cents = EXCLUDED.price_cents,
  spots_available = EXCLUDED.spots_available,
  highlights = EXCLUDED.highlights,
  what_to_bring = EXCLUDED.what_to_bring,
  status = EXCLUDED.status,
  is_featured = EXCLUDED.is_featured,
  meta_title = EXCLUDED.meta_title,
  meta_description = EXCLUDED.meta_description,
  updated_at = now();
