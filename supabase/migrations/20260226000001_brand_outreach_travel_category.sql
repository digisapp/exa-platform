-- Add 'travel' category to brand_outreach_contacts for hotel/travel partner outreach

ALTER TABLE brand_outreach_contacts DROP CONSTRAINT IF EXISTS brand_outreach_contacts_category_check;
ALTER TABLE brand_outreach_contacts
  ADD CONSTRAINT brand_outreach_contacts_category_check
    CHECK (category IN (
      -- Designer outreach
      'swimwear', 'resort_wear', 'luxury', 'activewear', 'accessories', 'lingerie', 'fashion',
      -- Sponsor categories
      'sunscreen', 'skincare', 'haircare', 'beverage', 'spirits', 'wellness', 'beauty', 'medspa',
      -- Travel partners
      'travel'
    ));
