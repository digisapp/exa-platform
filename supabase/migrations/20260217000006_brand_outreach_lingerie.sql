-- Add 'lingerie' and 'fashion' to brand_outreach_contacts category constraint
-- This extends the outreach system to support lingerie brand partnerships

-- Drop and recreate the category check constraint to include 'lingerie' and 'fashion'
ALTER TABLE brand_outreach_contacts
  DROP CONSTRAINT IF EXISTS brand_outreach_contacts_category_check;

ALTER TABLE brand_outreach_contacts
  ADD CONSTRAINT brand_outreach_contacts_category_check
  CHECK (category IN ('swimwear', 'resort_wear', 'luxury', 'activewear', 'accessories', 'lingerie', 'fashion', 'beauty'));

-- Insert lingerie brand contacts from research
INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
VALUES
-- Brands with dedicated press/PR emails
('Victoria''s Secret', NULL, 'pr@victoria.com', 'press', 'https://www.victoriassecret.com', 'victoriassecret', 'lingerie', 'Reynoldsburg', 'USA', 'Iconic global lingerie brand, annual fashion show, massive model campaigns'),
('Bluebella', NULL, 'marketing@bluebella.com', 'pr', 'https://www.bluebella.us', 'bluebella', 'lingerie', 'London', 'UK', 'Fashion-forward lingerie, sold at Victoria''s Secret, uses diverse models'),
('Fleur du Mal', NULL, 'press@fleurdumal.com', 'press', 'https://fleurdumal.com', 'fleurdumalnyc', 'lingerie', 'New York', 'USA', 'Modern sensual luxury lingerie, fashion-forward, doubles as outerwear'),
('Commando', NULL, 'press@wearcommando.com', 'press', 'https://www.wearcommando.com', 'wearcommando', 'lingerie', 'South Burlington', 'USA', 'Luxury seamless intimates, celebrity favorite'),
('Dora Larsen', 'Nabila (Le Grey PR)', 'nabila@le-grey.com', 'pr', 'https://doralarsen.com', 'doralarsenlingerie', 'lingerie', 'London', 'UK', 'Colorful modern lingerie, family-run, 83% responsibly sourced materials'),
('Love Stories Intimates', NULL, 'press@lovestoriesintimates.com', 'press', 'https://lovestoriesintimates.com', 'lovestoriesintimates', 'lingerie', 'Amsterdam', 'Netherlands', 'Dutch lingerie brand, flagship in Amsterdam, bohemian aesthetic'),
('LIVELY', NULL, 'press@wearlively.com', 'press', 'https://www.wearlively.com', 'wearlively', 'lingerie', 'New York', 'USA', 'DTC lingerie brand acquired by Wacoal for $85M, strong community model'),
('ThirdLove', NULL, 'press@thirdlove.com', 'press', 'https://www.thirdlove.com', 'thirdlove', 'lingerie', 'San Francisco', 'USA', 'Inclusive sizing with half-cup sizes, data-driven fit technology'),
('Knix', NULL, 'press@knix.com', 'press', 'https://knix.com', 'knix', 'lingerie', 'Toronto', 'Canada', 'Innovative intimates, leak-proof technology, strong community campaigns'),
('Pepper', NULL, 'pr@wearpepper.com', 'pr', 'https://www.wearpepper.com', 'wearpepper', 'lingerie', 'New York', 'USA', 'Small-cup focused bra brand, inclusive sizing AA-B'),
('Wacoal', NULL, 'press@wacoal-europe.com', 'press', 'https://www.wacoallingerie.com', 'wacoal', 'lingerie', 'Tokyo', 'Japan', 'Japanese heritage lingerie company, global presence, owns LIVELY'),
('CUUP', NULL, 'cuuppress@fbbrands.com', 'press', 'https://www.shopcuup.com', 'cuup', 'lingerie', 'New York', 'USA', 'Minimalist modern lingerie, innovative sizing approach'),
('Wolford', 'Ingola Metz', 'ingola.metz@wolford.com', 'press', 'https://www.wolford.com', 'wolford', 'lingerie', 'Bregenz', 'Austria', 'Austrian luxury hosiery and lingerie, premium quality'),
('SKIN', 'Susan Beischel', 'press@skinworldwide.com', 'press', 'https://skinworldwide.com', 'skinworldwide', 'lingerie', 'New York', 'USA', 'Luxury loungewear and intimates, natural fabrics'),
('Anine Bing', NULL, 'press@aninebing.com', 'press', 'https://www.aninebing.com', 'aninebing', 'lingerie', 'Los Angeles', 'USA', 'LA-based fashion brand with lingerie line, Scandinavian-inspired'),
('Aerie', NULL, 'AeriePress@ae.com', 'press', 'https://www.ae.com/aerie', 'aaborevich', 'lingerie', 'Pittsburgh', 'USA', 'American Eagle intimates brand, real-body campaigns, no retouching policy'),
('Stella McCartney Lingerie', NULL, 'press@stellamccartney.com', 'press', 'https://www.stellamccartney.com', 'stellamccartney', 'lingerie', 'London', 'UK', 'Luxury designer lingerie, sustainable fashion pioneer'),

-- Brands with general/marketing/info emails
('Agent Provocateur', NULL, 'customercare@agentprovocateur.com', 'general', 'https://www.agentprovocateur.com', 'agentprovocateur', 'lingerie', 'London', 'UK', 'Iconic luxury lingerie brand, dramatic seductive designs, in-house PR team'),
('La Perla', NULL, 'customercare@laperla.com', 'general', 'https://www.laperla.com', 'laperlalingerie', 'lingerie', 'London', 'UK', 'Heritage luxury lingerie since 1954, haute couture intimates'),
('Honey Birdette', NULL, 'honey@honeybirdette.com', 'general', 'https://www.honeybirdette.com', 'honeybirdette', 'lingerie', 'Sydney', 'Australia', 'Australian luxury lingerie acquired by Playboy Group for $235M'),
('SKIMS', NULL, 'influencers@skims.com', 'partnerships', 'https://skims.com', 'skims', 'lingerie', 'Los Angeles', 'USA', 'Kim Kardashian''s shapewear and intimates brand, massive model campaigns'),
('Savage X Fenty', NULL, 'influencers@savagex.com', 'partnerships', 'https://www.savagex.com', 'savagexfenty', 'lingerie', 'El Segundo', 'USA', 'Rihanna''s inclusive lingerie brand, major fashion show productions'),
('Gooseberry Intimates', NULL, 'support@gooseberryintimates.com', 'general', 'https://gooseberryintimates.com', 'gooseberryintimates', 'lingerie', 'Bali', 'Indonesia', 'Chic lingerie and swimwear, strong Instagram presence'),
('Intimissimi', NULL, 'hello@intimissimi.com', 'general', 'https://www.intimissimi.com', 'intimissimi', 'lingerie', 'Verona', 'Italy', 'Italian mass-market luxury lingerie, major global campaigns with top models'),
('Cosabella', 'Lisa Lauri (Lauri Communications)', 'lisa@lauricommunications.com', 'pr', 'https://www.cosabella.com', 'shopcosabella', 'lingerie', 'Miami', 'USA', 'Premium Italian-American lingerie, acquired by CALIDA Group'),
('Simone Perele', NULL, 'contact@simone-perele.fr', 'general', 'https://us.simone-perele.com', 'simoneperele', 'lingerie', 'Paris', 'France', 'French luxury lingerie since 1948, heritage brand'),
('Eberjey', NULL, 'partnerships@eberjey.com', 'partnerships', 'https://www.eberjey.com', 'eberjey', 'lingerie', 'Coral Gables', 'USA', 'Luxury loungewear and intimates, Designer of the Year at Salon de la Lingerie'),
('Thistle and Spire', NULL, 'hello@thistleandspire.com', 'general', 'https://www.thistleandspire.com', 'thistleandspire', 'lingerie', 'Brooklyn', 'USA', 'Brooklyn-based lingerie, sizes XS-3X, celebrity worn'),
('LEAU', NULL, 'pr@leauclothing.com', 'pr', 'https://leauclothing.com', 'leauclothing', 'lingerie', NULL, NULL, 'Emerging intimates brand with dedicated PR contact'),
('Bordelle', NULL, 'customerservice@bordelle.co.uk', 'general', 'https://www.bordelle.co.uk', 'atelierbordelle', 'lingerie', 'London', 'UK', 'Luxury harness-style lingerie, appointed MGC London for PR'),
('I.D. Sarrieri', NULL, 'customer.service@sarrieri.com', 'general', 'https://sarrieri.com', 'idsarrieri', 'lingerie', 'Sofia', 'Bulgaria', 'Ultra-luxury lingerie with silk and lace, among most expensive brands'),
('Kiki de Montparnasse', NULL, 'info@kikidm.com', 'general', 'https://www.kikidm.com', 'kikidemontparnasse', 'lingerie', 'New York', 'USA', 'Luxury sensual lingerie and accessories, sold at Net-a-Porter'),
('For Love and Lemons', NULL, 'info@forloveandlemons.com', 'general', 'https://forloveandlemons.com', 'forloveandlemons', 'lingerie', 'Los Angeles', 'USA', 'Romantic lingerie and fashion, celeb favorite, Victoria''s Secret collaboration'),
('Maison Close', NULL, 'b2b@maison-close.com', 'wholesale', 'https://maison-close.com', 'maisonclose', 'lingerie', 'Paris', 'France', 'French seductive lingerie, fashion-forward designs'),
('LIVY', NULL, 'lisa.chavy@li-vy.com', 'general', 'https://www.li-vy.com', 'livystudio', 'lingerie', 'Paris', 'France', 'French lingerie by Lisa Chavy, Victoria''s Secret partnership'),
('Only Hearts', 'Amanda', 'amanda@onlyhearts.com', 'pr', 'https://onlyhearts.com', 'onlyhearts1978', 'lingerie', 'New York', 'USA', 'NYC-based lingerie since 1978, Nolita and Upper West Side shops'),
('ELSE Lingerie', NULL, 'info@elselingerie.com', 'general', 'https://elselingerie.com', 'elselingerie', 'lingerie', 'Santa Monica', 'USA', 'Turkish-American minimalist luxury lingerie'),
('Adore Me', 'Ranjan Roy', 'rroy@adoreme.com', 'pr', 'https://www.adoreme.com', 'adoreme', 'lingerie', 'New York', 'USA', 'DTC lingerie disruptor, size-inclusive, major retail expansion'),
('Negative Underwear', NULL, 'hi@negativeunderwear.com', 'general', 'https://negativeunderwear.com', 'negativeunderwear', 'lingerie', 'New York', 'USA', 'Minimalist NYC lingerie brand, no frills approach'),
('Carine Gilson', NULL, 'customerservice@carinegilson.com', 'general', 'https://carinegilson.com', 'carinegilsonofficial', 'lingerie', 'Brussels', 'Belgium', 'Belgian haute couture lingerie, silk and lace specialist'),
('Fleur of England', NULL, 'info@fleurofengland.com', 'general', 'https://www.fleurofengland.com', 'fleurofengland', 'lingerie', 'London', 'UK', 'British luxury lingerie, handcrafted in England'),
('Marlies Dekkers', NULL, 'webshop@marliesdekkers.com', 'general', 'https://www.marliesdekkers.com', 'marliesdekkers', 'lingerie', 'Rotterdam', 'Netherlands', 'Dutch designer lingerie, iconic cage-style designs'),
('Maison Lejaby', 'Mrs. Paillet', 'mpaillet@maisonlejaby.com', 'pr', 'https://www.maisonlejaby.com', 'maisonlejaby', 'lingerie', 'Lyon', 'France', 'French luxury lingerie house, heritage brand since 1930'),
('Hanky Panky', NULL, 'info@hankypanky.com', 'general', 'https://www.hankypanky.com', 'hankypanky', 'lingerie', 'New York', 'USA', 'Iconic lace thong brand, Alison Brod PR as agency of record')
ON CONFLICT DO NOTHING;
