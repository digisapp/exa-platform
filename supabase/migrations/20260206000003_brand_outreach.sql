-- Brand Outreach System for Swim Week
-- Stores swimwear/resort wear brand contacts and tracks outreach emails

-- Brand outreach contacts table
CREATE TABLE IF NOT EXISTS brand_outreach_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT NOT NULL,
  email_type TEXT DEFAULT 'pr' CHECK (email_type IN ('pr', 'press', 'general', 'wholesale', 'partnerships')),
  phone TEXT,
  website_url TEXT,
  instagram_handle TEXT,
  category TEXT DEFAULT 'swimwear' CHECK (category IN ('swimwear', 'resort_wear', 'luxury', 'activewear', 'accessories')),
  location_city TEXT,
  location_country TEXT,
  notes TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'interested', 'not_interested', 'converted', 'do_not_contact')),
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brand outreach emails tracking
CREATE TABLE IF NOT EXISTS brand_outreach_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES brand_outreach_contacts(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_type TEXT DEFAULT 'outreach' CHECK (email_type IN ('outreach', 'follow_up', 'proposal', 'contract')),
  resend_message_id TEXT,
  status TEXT DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_outreach_contacts_status ON brand_outreach_contacts(status);
CREATE INDEX IF NOT EXISTS idx_brand_outreach_contacts_category ON brand_outreach_contacts(category);
CREATE INDEX IF NOT EXISTS idx_brand_outreach_emails_contact_id ON brand_outreach_emails(contact_id);
CREATE INDEX IF NOT EXISTS idx_brand_outreach_emails_sent_at ON brand_outreach_emails(sent_at);

-- RLS policies (admin only)
ALTER TABLE brand_outreach_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_outreach_emails ENABLE ROW LEVEL SECURITY;

-- Admin-only access for contacts
DO $$ BEGIN
  CREATE POLICY "Admins can manage brand outreach contacts"
    ON brand_outreach_contacts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM actors
        WHERE actors.user_id = auth.uid()
        AND actors.type = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Admin-only access for emails
DO $$ BEGIN
  CREATE POLICY "Admins can manage brand outreach emails"
    ON brand_outreach_emails FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM actors
        WHERE actors.user_id = auth.uid()
        AND actors.type = 'admin'
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Insert initial swimwear brand contacts from research (skip if already inserted)
INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT * FROM (VALUES
-- Brands with dedicated PR emails
('Luli Fama', 'Christy', 'christy@lulifama.com', 'pr', 'https://www.lulifama.com', 'lulifamaswimwear', 'swimwear', 'Miami', 'USA', 'Major Miami swimwear brand, regular at Swim Week'),
('Maaji', 'Paulina Madrid', 'paulinam@maaji.co', 'pr', 'https://www.maaji.co', 'maaji', 'swimwear', 'Colombia', 'Colombia', 'B Corp certified, available at Nordstrom, Revolve'),
('Beach Bunny Swimwear', 'Angela Chittenden', 'press@beachbunnyswimwear.com', 'press', 'https://www.beachbunnyswimwear.com', 'beachbunnyswimwear', 'swimwear', 'California', 'USA', 'Luxury swimwear, featured at Miami Swim Week 2023'),
('Kulani Kinis', 'Jadon Medina (POSSE PR)', 'press@possepr.com', 'pr', 'https://www.kulanikinis.com', 'kulanikinis', 'swimwear', 'Australia', 'Australia', 'Australian brand, Love Island collaboration'),
('Vitamin A', NULL, 'vitaminapr@swimusa.com', 'pr', 'https://www.vitaminaswim.com', 'vitaminaswim', 'swimwear', 'California', 'USA', 'Sustainable luxury swimwear'),
('PQ Swim', NULL, 'press@pqswim.com', 'press', 'https://pqswim.com', 'pqswim', 'swimwear', 'California', 'USA', 'Designer swimwear and resortwear'),
('MIKOH', NULL, 'mikoh@bollare.com', 'pr', 'https://mikoh.com', 'mikohswim', 'swimwear', 'California', 'USA', 'Hawaii-inspired luxury swimwear, Bollare PR'),
('Rove Swimwear', NULL, 'pr@roveswimwear.com', 'pr', 'https://www.roveswimwear.com', 'roveswimwear', 'swimwear', NULL, NULL, 'Emerging swimwear brand'),
('FLOWHER Swimwear', NULL, 'press@flowherswimwear.com', 'press', 'https://flowherswimwear.com', 'flowherswimwear', 'swimwear', NULL, NULL, 'Women-focused swimwear'),
('GIGI C Bikinis', NULL, 'pr@gigicbikinis.com', 'pr', 'https://www.gigicbikinis.com', 'gigicbikinis', 'swimwear', 'Los Angeles', 'USA', 'Celebrity favorite bikini brand'),
('Jonathan Simkhai', NULL, 'press@jonathansimkhai.com', 'press', 'https://simkhai.com', 'jonathansimkhai', 'resort_wear', 'Los Angeles', 'USA', 'Luxury ready-to-wear and swimwear'),
('Tropic of C', NULL, 'press@tropicofc.com', 'press', 'https://tropicofc.com', 'tropicofc', 'swimwear', NULL, NULL, 'Candice Swanepoel''s swimwear brand'),

-- Brands with general contact emails (no dedicated PR found)
('Acacia', NULL, 'info@acacia.co', 'general', 'https://www.acacia.co', 'acaciaswimwear', 'swimwear', 'Hawaii', 'USA', 'Hawaiian luxury swimwear'),
('Triangl', NULL, 'customercare@triangl.com', 'general', 'https://triangl.com', 'triangl', 'swimwear', 'Australia', 'Australia', 'Popular neoprene bikini brand'),
('Frankies Bikinis', NULL, 'affiliates@frankiesbikinis.com', 'partnerships', 'https://frankiesbikinis.com', 'frankiesbikinis', 'swimwear', 'Los Angeles', 'USA', 'LA lifestyle swimwear'),
('Monday Swimwear', NULL, 'support@mondayswimwear.com', 'general', 'https://mondayswimwear.com', 'mondayswimwear', 'swimwear', 'Los Angeles', 'USA', 'Size-inclusive swimwear by Tash Oakley'),
('Seafolly', NULL, 'customerservice@seafolly.com', 'general', 'https://seafolly.com', 'seafolly', 'swimwear', 'Australia', 'Australia', 'Australia''s most recognized swimwear brand'),
('L*Space', NULL, 'info@lspace.com', 'general', 'https://lspace.com', 'likispace', 'swimwear', 'California', 'USA', 'California lifestyle swimwear'),
('Zimmermann', NULL, 'customercare@zimmermann.com', 'general', 'https://www.zimmermann.com', 'zimmermann', 'resort_wear', 'Australia', 'Australia', 'Luxury Australian designer, swim and resort'),
('Oh Polly', NULL, 'info@ohpolly.com', 'general', 'https://www.ohpolly.com', 'ohpolly', 'swimwear', 'London', 'UK', 'Fast fashion, Sports Illustrated collaboration'),

-- Miami Swim Week specific contacts
('Miami Swim Week The Shows', 'Claudia Safavi', 'claudia@miamiswimweektheshows.com', 'press', 'https://miamiswimweek.net', 'miamiswimweektheshows', 'swimwear', 'Miami', 'USA', 'Event organizer - media contact'),

-- Additional luxury/resort brands
('Agua Bendita', NULL, 'servicioalcliente@aguabendita.com', 'general', 'https://www.aguabendita.com', 'aguabenditasw', 'swimwear', 'Colombia', 'Colombia', 'Colombian luxury handcrafted swimwear'),
('Onia', NULL, 'info@onia.com', 'general', 'https://onia.com', 'onia', 'swimwear', 'New York', 'USA', 'Premium menswear + swimwear'),
('Solid & Striped', NULL, 'customerservice@solidandstriped.com', 'general', 'https://solidandstriped.com', 'solidandstriped', 'swimwear', 'New York', 'USA', 'Classic American swimwear'),
('Eberjey', NULL, 'customerservice@eberjey.com', 'general', 'https://www.eberjey.com', 'eberjey', 'resort_wear', 'Miami', 'USA', 'Luxury loungewear and swim'),
('Hunza G', NULL, 'info@hunzag.com', 'general', 'https://hunzag.com', 'hunzag', 'swimwear', 'London', 'UK', 'Retro-inspired crinkle swimwear'),
('Oséree', NULL, 'info@oseree.com', 'general', 'https://oseree.com', 'osereeswimwear', 'swimwear', 'Italy', 'Italy', 'Made in Italy luxury swimwear'),
('Norma Kamali', NULL, 'customerservice@normakamali.com', 'general', 'https://www.normakamali.com', 'normakamali', 'swimwear', 'New York', 'USA', 'Iconic designer, famous for swimwear'),
('Marysia', NULL, 'info@marysia.com', 'general', 'https://marysia.com', 'marysiaswim', 'swimwear', 'Los Angeles', 'USA', 'Scalloped edge signature swimwear')
) AS v(brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts LIMIT 1);
