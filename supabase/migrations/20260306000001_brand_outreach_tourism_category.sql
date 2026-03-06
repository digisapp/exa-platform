-- Add 'tourism_board' category to brand_outreach_contacts for tourism board outreach

ALTER TABLE brand_outreach_contacts DROP CONSTRAINT IF EXISTS brand_outreach_contacts_category_check;
ALTER TABLE brand_outreach_contacts
  ADD CONSTRAINT brand_outreach_contacts_category_check
    CHECK (category IN (
      -- Designer outreach
      'swimwear', 'resort_wear', 'luxury', 'activewear', 'accessories', 'lingerie', 'fashion',
      -- Sponsor categories
      'sunscreen', 'skincare', 'haircare', 'beverage', 'spirits', 'wellness', 'beauty', 'medspa',
      -- Travel partners
      'travel',
      -- Tourism boards & DMOs
      'tourism_board'
    ));

-- Also allow 'tourism' as a contact_type
ALTER TABLE brand_outreach_contacts DROP CONSTRAINT IF EXISTS brand_outreach_contacts_contact_type_check;
ALTER TABLE brand_outreach_contacts
  ADD CONSTRAINT brand_outreach_contacts_contact_type_check
    CHECK (contact_type IN ('outreach', 'sponsor', 'tourism'));
