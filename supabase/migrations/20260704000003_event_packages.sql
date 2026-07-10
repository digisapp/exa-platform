-- Event B2B packages (Phase 2 of generalizing shows).
-- ------------------------------------------------------------------
-- The designer/sponsor checkout (api/brands/msw-checkout) hardcoded a PACKAGES
-- dict of 13 runway/sponsor/retail packages with prices baked into code — so a
-- new show could not sell packages without a code deploy. This table holds
-- those packages as data. MSW 2026 is seeded cent-for-cent from the existing
-- hardcoded constants, so its checkout behavior is unchanged.

CREATE TABLE IF NOT EXISTS public.event_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  key text NOT NULL,                       -- stable identifier used by the checkout (e.g. 'opening-show')
  category text NOT NULL DEFAULT 'other',  -- grouping for the public pages: runway | showroom | retail | shoot | party
  name text NOT NULL,
  description text,
  full_price_cents int NOT NULL,
  installment_price_cents int NOT NULL,    -- per-month for a 3-month plan; equals full price when no plan is offered
  installments_available boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  features jsonb,                          -- optional bullet list for page display
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (event_id, key)
);

CREATE INDEX IF NOT EXISTS idx_event_packages_event
  ON public.event_packages(event_id, sort_order) WHERE is_active;

ALTER TABLE public.event_packages ENABLE ROW LEVEL SECURITY;

-- Packages are public marketing content (shown on the designer/sponsor pages).
CREATE POLICY "Anyone can read active event packages"
  ON public.event_packages FOR SELECT USING (is_active = true);

GRANT SELECT ON public.event_packages TO anon, authenticated;

-- Seed MSW 2026 packages — values copied exactly from the hardcoded PACKAGES in
-- api/brands/msw-checkout/route.ts so checkout pricing is identical.
INSERT INTO public.event_packages
  (event_id, key, category, name, description, full_price_cents, installment_price_cents, installments_available, sort_order)
SELECT e.id, v.key, v.category, v.name, v.description, v.full_price_cents, v.installment_price_cents, v.installments_available, v.sort_order
FROM public.events e
CROSS JOIN (VALUES
  ('opening-show','runway','Opening Show — Tuesday May 26, 2026','Premier opening night runway show at Miami Swim Week 2026',350000,116700,true,1),
  ('day-2','runway','Day 2 Show — Wednesday May 27, 2026','Runway show on Day 2 of Miami Swim Week 2026',250000,83400,true,2),
  ('day-4','runway','Day 4 Show — Friday May 29, 2026','Runway show on Day 4 of Miami Swim Week 2026',150000,50000,true,3),
  ('day-5','runway','Day 5 Show — Saturday May 30, 2026','Saturday runway show at Miami Swim Week 2026',150000,50000,true,4),
  ('day-6','runway','Day 6 Show — Sunday May 31, 2026','Grand finale closing show at Miami Swim Week 2026',150000,50000,true,5),
  ('full-production','runway','Solo Show — Full Production — Miami Swim Week 2026','Exclusive single-brand runway show with full production, all models, styling, show direction, and a dedicated live shopping space. Your brand owns the entire show.',2350000,783400,true,6),
  ('showroom-halfday','showroom','Private Showroom — Half Day (4 hrs)','4-hour private ballroom showroom at our Miami Swim Week hotel venue. Your brand, your space — invite buyers, press, and VIPs for an exclusive presentation.',120000,120000,false,7),
  ('showroom-fullday','showroom','Private Showroom — The Alexander Hotel, Miami Beach','Private ballroom showroom at The Alexander Hotel, Miami Beach during Swim Week. Your brand, your space — invite buyers, press, and VIPs for an exclusive presentation.',160000,160000,false,8),
  ('swim-shop','retail','EXA Swim Shop — May 26–31, 2026','Sell your swimwear collection in the EXA Swim Shop during Miami Swim Week 2026 (May 26–31). Prime retail pop-up location with show week foot traffic.',50000,50000,false,9),
  ('lobby-display','retail','Hotel Lobby Display — May 26–31, 2026','Branded display in the hotel lobby all week at Miami Swim Week 2026. Visible to every guest, model, designer, buyer, and attendee.',60000,60000,false,10),
  ('beach-shoot-halfday','shoot','Miami Beach Shoot Day — Half Day','Half-day professional photo & video shoot with EXA models in your swimwear at a Miami Beach location during Swim Week. All content is yours.',150000,150000,false,11),
  ('afterparty-standard','party','Closing Party Sponsorship — Standard','Standard sponsorship of the official EXA Closing Party on Sunday May 31, 2026. Logo on event materials, branded presence, product placement.',200000,200000,false,12),
  ('afterparty-premier','party','Closing Party Sponsorship — Premier','Premier sponsorship of the official EXA Closing Party on Sunday May 31, 2026. Featured logo placement, dedicated product moment, social features.',350000,350000,false,13),
  ('afterparty-presenting','party','Closing Party Sponsorship — Presenting Sponsor','Presenting sponsorship of the official EXA Closing Party on Sunday May 31, 2026. Top billing across all materials, exclusive branded activation, and VIP table.',500000,500000,false,14)
) AS v(key, category, name, description, full_price_cents, installment_price_cents, installments_available, sort_order)
WHERE e.slug = 'miami-swim-week-2026'
ON CONFLICT (event_id, key) DO NOTHING;
