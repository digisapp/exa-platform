-- Add contact_type to brand_outreach_contacts to separate designer outreach from event sponsors
-- Also expand category CHECK to include sponsor-specific categories

ALTER TABLE brand_outreach_contacts
  ADD COLUMN IF NOT EXISTS contact_type TEXT NOT NULL DEFAULT 'outreach'
    CHECK (contact_type IN ('outreach', 'sponsor'));

-- Expand the category constraint to include sponsor categories
ALTER TABLE brand_outreach_contacts DROP CONSTRAINT IF EXISTS brand_outreach_contacts_category_check;
ALTER TABLE brand_outreach_contacts
  ADD CONSTRAINT brand_outreach_contacts_category_check
    CHECK (category IN (
      -- Designer outreach
      'swimwear', 'resort_wear', 'luxury', 'activewear', 'accessories', 'lingerie', 'fashion',
      -- Sponsor categories
      'sunscreen', 'skincare', 'haircare', 'beverage', 'spirits', 'wellness', 'beauty', 'medspa'
    ));

-- Index for fast filtering by type
CREATE INDEX IF NOT EXISTS idx_brand_outreach_contacts_type
  ON brand_outreach_contacts (contact_type);
