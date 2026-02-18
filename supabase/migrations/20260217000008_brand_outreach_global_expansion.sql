-- Global Brand Outreach Expansion - Round 2
-- 237 brands across swimwear, resort wear, activewear, loungewear, and lingerie
-- Sourced from global internet research across Europe, South America, Asia, Middle East, Africa

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Reina Olga', 'Michele', 'michele@reinaolga.com', 'press', 'https://reinaolga.com', 'reinaolga_beachwear', 'swimwear', NULL, 'Italy', 'Luxury Italian-made swimwear. Wholesale: wholesale@reinaolga.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Reina Olga'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kampos', NULL, 'customercare@kampos.com', 'general', 'https://kampos.com', 'kampos', 'swimwear', NULL, 'Italy', 'B-Corp certified sustainable luxury swimwear. Made from recycled materials. Made in Italy.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kampos'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oseree', 'Giulia Ambrosetti', 'customercare@osereeswimwear.com', 'general', 'https://oseree.com', 'osereeswimwear', 'swimwear', 'Milano', 'Italy', 'Founded 2015 by Jannine Vinci & Isabella Cavallin. Made in Riccione. Press contact: Giulia Ambrosetti (Press & Communication Coordinator).'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oseree'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gottex', NULL, 'info@gottexbrand.com', 'general', 'https://www.gottex-swimwear.com', 'gottexswimwear', 'swimwear', 'Tel Aviv', 'Israel', 'Iconic luxury swimwear brand. CS email: cs@gottexbrand.com. International: service-gottex@gottexmodels.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gottex'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Eres', 'Thibaut Herjean', 'thibaut.herjean@eres-group.com', 'press', 'https://www.eresparis.com', 'eres', 'swimwear', 'Paris', 'France', 'Iconic French luxury swimwear/lingerie house, 50+ years. Alt press: Christine Singer at christine.singer@huit55.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Eres'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Pain de Sucre', 'Marie-Laure Desnoulez', 'ml@paindesucre.com', 'pr', 'https://paindesucre.uk', 'paindesucre_officiel', 'swimwear', 'South of France / Miami', 'France', 'Established 1985 on the French Riviera. Haute couture approach to swimwear. Miami showroom at StartHub.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Pain de Sucre'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Madamme BK', 'Vanessa Lourenco', 'info@madammebk.com', 'general', 'https://www.madammebk.com', 'madammebk', 'swimwear', 'Paris', 'France', 'Modest swimwear/burkini brand founded 2011. Made in France with Italian fabric. Haute couture coverage.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Madamme BK'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Dolores Cortes', NULL, 'dcortes@dolores-cortes.com', 'general', 'https://www.dolores-cortes.com', 'dolorescortes_official', 'swimwear', 'Vila-real, Castellon', 'Spain', '60+ years in swimwear. One of Spain''s first fashion swimwear companies. Shows at MBFW Madrid.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Dolores Cortes'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Stefania Frangista', 'Kristen Abel (PR, K&H Comms)', 'wholesale@stefaniafrangista.com', 'wholesale', 'https://www.stefaniafrangista.com', 'stefaniafrangista', 'swimwear', 'Athens', 'Greece', 'Luxury Greek swimwear since 2009. PR: kristen.abel@kandhcomms.com. Greece/Cyprus sales: sales@stefaniafrangista.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Stefania Frangista'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mitos Swimwear', NULL, 'sales@mitoswimwear.com', 'wholesale', 'https://www.mitoswimwear.com', 'mitoswimwear', 'swimwear', 'Athens', 'Greece', 'Greek luxury swimwear brand with international distribution.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mitos Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sophie Deloudi', 'Sophie Deloudi', 'info@sophiedeloudi.gr', 'general', 'https://www.sophiedeloudi.gr', 'sophiedeloudi', 'swimwear', 'Athens', 'Greece', 'Minimalist Greek swimwear designer. Known for architectural cuts and timeless designs.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sophie Deloudi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Zeus+Dione', 'Marios Schwab (Creative Director)', 'info@zeusndione.com', 'general', 'https://zeusndione.com', 'zeusndione', 'swimwear', 'Athens', 'Greece', 'Premium Greek RTW label with swimwear. Uses Econyl recycled nylon. PR via Rainbow Wave PR, Athens.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Zeus+Dione'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Antidot Swimwear', NULL, 'info@antidotswimwear.com', 'general', 'https://antidotswimwear.com', 'antidotswimwear', 'swimwear', 'Antiparos Island', 'Greece', 'Luxury swimwear for men and women. Born in Antiparos, Cyclades.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Antidot Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cante Lisboa', NULL, 'shoponline@cantelisboa.com', 'general', 'https://cantelisboa.com', 'cantelisboa', 'swimwear', 'Lisbon', 'Portugal', 'Founded 2011 by architects Mariana Delgado & Rita Soares. Multiple Lisbon locations.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cante Lisboa'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'LATITID', NULL, 'shop@latitid.com', 'general', 'https://latitid.com', 'latitid', 'swimwear', 'Porto / Lisbon', 'Portugal', 'Portuguese swimwear brand. Stores in Porto, Lisbon, and Comporta. Name from ''Latitude'' + ''Attitude''.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('LATITID'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'AUMAR Swimwear', 'Mariana Silva', 'info@aumarswimwear.com', 'general', 'https://en.aumarswimwear.com', 'aumarswimwear', 'swimwear', 'Lisbon', 'Portugal', 'Founded 2014. Inspired by Portuguese fauna, flora, and geography. Store on Rua Passos Manuel, Lisbon.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('AUMAR Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Flutua Swimwear', NULL, 'info@flutua.pt', 'general', 'https://www.flutua.pt', 'flutua.swimwear', 'swimwear', 'Porto', 'Portugal', 'Slow fashion northern Portuguese beachwear brand. Created 2014.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Flutua Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'More Beachwear', 'Diana Baketic / Matea Draganic', 'info@morebeachwear.com', 'general', 'https://morebeachwear.com', 'morebeachwear', 'swimwear', 'Zagreb / Hvar', 'Croatia', 'Founded 2015. Mediterranean label using Italian fabrics. Stores in Hvar and Rovinj.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('More Beachwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Adriana Degreas', NULL, 'customer@adrianadegreas.com', 'general', 'https://adrianadegreas.com', 'adrianadegreas', 'swimwear', 'Sao Paulo', 'Brazil', 'Luxury Brazilian beachwear est. 2001. Celeb favorite. All produced in Brazil. Phone: +1 305 363 8686'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Adriana Degreas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Frescobol Carioca', NULL, 'pr@frescobolcarioca.com', 'pr', 'https://www.frescobolcarioca.com', 'frescobolcarioca', 'swimwear', 'Rio de Janeiro', 'Brazil', 'Brazilian luxury menswear/swimwear brand. Also CS: customerservice@frescobolcarioca.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Frescobol Carioca'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rio de Sol', 'Alyssa', 'contact@riodesol.com', 'general', 'https://riodesol.com', 'riodesol', 'swimwear', 'Pasadena, CA / Brazil', 'Brazil', 'Brazilian-inspired bikinis since 2005. Wholesale: export@riodesol.com. Global offices US/UK/EU/Japan.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rio de Sol'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Isolda', NULL, 'info@isolda.online', 'general', 'https://www.isolda.online', 'isoldabrasil', 'swimwear', 'London / Brazil', 'Brazil', 'Contemporary Brazilian fashion label founded in London 2011. Swimwear, dresses, resort.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Isolda'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bahia Maria', NULL, 'info@bahiamaria.com', 'general', 'https://int.bahiamaria.com', 'bahiamariasw', 'swimwear', 'Bogota', 'Colombia', 'Colombian swimwear & resort wear. Sales/wholesale: sales@bahiamaria.com. WhatsApp: +57 323 287 2045'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bahia Maria'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Isa Boulder', 'David Siwicki (PR)', 'david@davidsiwicki.com', 'pr', 'https://isaboulder.com', 'isaboulder', 'swimwear', 'Bali', 'Indonesia', 'High-end knitwear & swimwear made in Bali. Stocked at SSENSE, Farfetch. General: info@isaboulder.com. Wholesale: denis@dearprogress.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Isa Boulder'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Thaikila', 'Marie Laure Becquelin (CEO)', 'customercare@thaikila.com', 'general', 'https://thaikila.com', 'thaikila', 'swimwear', 'Bali', 'Indonesia', 'Born in Paris 1989, relocated to Bali 2002. Sustainable swimwear combining local Balinese craftsmanship.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Thaikila'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Peony', NULL, 'info@peonyswimwear.com', 'general', 'https://www.peonyswimwear.com', 'peony', 'swimwear', 'Burleigh Heads, Queensland', 'Australia', 'Luxury swimwear & resortwear est. 2012. Consciously created. Live chat available 8:30am-5pm AEST.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Peony'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Koraru', NULL, 'press@koraru.co', 'press', 'https://www.koraru.co', 'koraru.co', 'swimwear', NULL, 'Australia', 'Most Sustainable Swimwear Brand 2024 (Marie Claire). Circular swimwear. General: theteam@koraru.co'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Koraru'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Aprilpoolday', NULL, 'order@aprilpoolday.com', 'general', 'https://aprilpoolday.com', 'aprilpoolday', 'swimwear', 'Bangkok', 'Thailand', 'Thai swimwear brand founded 2013. Known for vintage 80s-inspired practical swimwear. Multiple Thailand locations.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Aprilpoolday'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'GANA Swim', 'Jeong Jiseon (CEO)', 'jjs@swim.co.kr', 'general', 'https://ganaswim.com', 'ganaswim_official', 'swimwear', 'Busan', 'South Korea', 'Leading Korean swimwear brand. Located in Centum IS Tower, Haeundae-gu, Busan.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('GANA Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Blackbough Swim', NULL, 'aloha@blackboughswim.com', 'general', 'https://blackboughswim.com', 'blackboughswim', 'swimwear', 'Manila', 'Philippines', '1M+ followers, 24K+ 5-star reviews. Featured in WWD, Vogue, Elle. Designed for the tropical soul.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Blackbough Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Coral Manila', 'Patricia Gonzalez / Margaux Alampay', 'hello@coralmanila.com', 'general', 'https://coralmanila.com', 'coralmanila_', 'swimwear', 'Manila', 'Philippines', 'Designed and produced in the Philippines since 2015. Retail: retail.coralmanila@gmail.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Coral Manila'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hadia Ghaleb', 'Hadia Ghaleb', 'info@ghalebph.com', 'press', 'https://hadiaghaleb.com', 'hadiaghaleb', 'swimwear', 'Dubai', 'UAE', 'Modest swimwear/burkini. Based at DMCC JLT Dubai. Support: support@hadiaghaleb.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hadia Ghaleb'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'LANUUK', NULL, 'contact@lanuuk.com', 'general', 'https://www.lanuuk.com', 'lanuuk', 'swimwear', NULL, 'UAE', 'Full coverage modest swimwear, resortwear & activewear. Responds within 48 hours.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('LANUUK'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Marina Modest', NULL, 'int@marinamayo.com', 'general', 'https://marinamodest.com', 'marinaswim', 'swimwear', 'Istanbul', 'Turkey', 'Burkini & modest swimwear. Participated in Riyadh Fashion Show. Stores across Turkey and Middle East.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Marina Modest'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gabrielle Swimwear', NULL, 'info@gabrielleswimwear.com', 'general', 'https://gabrielleswimwear.com', 'gabrielle_swimwear', 'swimwear', 'Cape Town', 'South Africa', 'Luxury designer swimwear. Also: gabrielleswimwear@gmail.com. WhatsApp: +27 764935995'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gabrielle Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lily Label', NULL, 'hello@lily-label.com', 'general', 'https://lily-label.com', 'lily.label', 'swimwear', 'Cape Town', 'South Africa', 'Ethically made swimwear, hand and machine crafted. Support: support@lily-label.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lily Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Diarrablu', 'Diarra Bousso (Founder)', 'pr@diarrablu.com', 'pr', 'https://diarrablu.com', 'diarrablu', 'swimwear', 'Dakar', 'Senegal', 'Designed in California, handcrafted by artisan communities in Senegal. Size-inclusive. General: hello@diarrablu.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Diarrablu'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'AUDE Swim', NULL, 'info@audeswim.com', 'general', 'https://audeswim.com', 'audeswim', 'swimwear', NULL, 'West Africa / USA', 'Black-owned, West African-inspired swimwear. Bold prints and vibrant designs. Orders: orders@audeswim.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('AUDE Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ochie Swim', 'Hana Lloyd (Founder)', 'info@ochieswim.com', 'general', 'https://www.ochieswim.com', 'ochieswim', 'swimwear', 'Miami / Trinidad', 'Trinidad & Tobago', 'Caribbean-rooted brand. Sleek contemporary designs. Wholesale: sales@ochieswim.com. CS: customercare@ochieswim.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ochie Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cushnie', 'Carly Cushnie (CEO)', 'contact@carlycushnie.com', 'general', 'https://www.cushnie.com', 'carlycushnie', 'swimwear', 'New York', 'Jamaica / USA', 'Jamaican-British designer. Press: Madelynn@networkusainc.com. Wholesale: sales@cushnie.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cushnie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'OYE Swimwear', NULL, 'press@oyeswimwear.com', 'press', 'https://www.oyeswimwear.com', 'oyeswimwear', 'swimwear', 'Istanbul', 'Turkey', 'Luxury architectural swimwear designed in Istanbul. General: info@oyeswimwear.com. Turkish inquiries: tr@oyeswimwear.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('OYE Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Johanna Ortiz', NULL, 'pr@johannaortiz.com', 'pr', 'https://www.johannaortiz.com', 'johannaortiz', 'swimwear', 'Cali / Coral Gables, FL', 'Colombia', 'Founded 2003 in Cali. Luxury Colombian RTW & swimwear. CS: customerservice@johannaortiz.com. Coral Gables HQ.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Johanna Ortiz'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Silvia Tcherassi', NULL, 'onlinestore@silviatcherassi.com', 'general', 'https://silviatcherassi.com', 'silviatcherassi', 'swimwear', 'Coral Gables, FL / Colombia', 'Colombia', 'Colombian luxury fashion house. All production in Colombia. HQ: 440 University Drive, Coral Gables.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Silvia Tcherassi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gooseberry Seaside', NULL, 'hello@wearegooseberry.com', 'general', 'https://gooseberryintimates.com', 'gooseberry.seaside', 'swimwear', 'Seminyak, Bali', 'Indonesia', 'Handcrafted by artisans in Bali. Stores in Uluwatu and Seminyak. Worn by J.Lo, Kendall Jenner. Also: connect@gooseberryintimates.com, flagship@gooseberryintimates.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gooseberry Seaside'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Fella Swim', 'Sammy', 'sammy@fellaswim.com', 'pr', 'https://www.fellaswim.com', 'fellaswim', 'swimwear', 'Paddington, Sydney', 'Australia', 'Australian luxury swimwear. Flagship: 37 William St Paddington NSW. Partnerships: christine@fellaswim.com. CS: customercare@fellaswim.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Fella Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Nagnata', NULL, 'press@nagnata.com', 'press', 'https://nagnata.com', 'nagnata', 'swimwear', 'Byron Bay', 'Australia', 'Premium fashion & lifestyle brand. Studio-to-street & swim. Wholesale: wholesale@nagnata.com. Byron Bay flagship.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Nagnata'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Medina Swimwear', 'Lou Medina', 'info@medinaswimwear.com', 'general', 'https://medinaswimwear.com', 'medinaswimwear', 'swimwear', NULL, 'Europe (made in Portugal)', 'Sustainable luxury swimwear est. 2017. Uses ECONYL regenerated nylon. Handmade in Portugal. At SSENSE. Donates to Save Posidonia Project.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Medina Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Matteau', NULL, 'info@matteau-swim.com', 'general', 'https://matteau-store.com', 'matteau_swim', 'swimwear', 'Noosa Heads, Queensland', 'Australia', 'Premium Australian swimwear & fashion. Stocked at David Jones, NET-A-PORTER. Phone: +61 7 5447 4486.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Matteau'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mara Hoffman', NULL, 'pr@marahoffman.com', 'pr', 'https://marahoffman.com', 'maaborsa', 'swimwear', 'New York', 'USA', 'Sustainable fashion & swimwear designer. Major retailer presence (Nordstrom, NET-A-PORTER). Known for bold prints and responsible practices.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mara Hoffman'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lululemon', NULL, 'media@lululemon.com', 'press', 'https://www.lululemon.com', 'lululemon', 'activewear', 'Vancouver', 'Canada', 'Global leader in premium activewear. $9B+ revenue. Major model campaigns for seasonal collections.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lululemon'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gymshark', NULL, 'press@gymshark.com', 'press', 'https://www.gymshark.com', 'gymshark', 'activewear', 'Solihull', 'United Kingdom', 'Massive DTC fitness brand. Uses models and athletes heavily for campaigns. $500M+ revenue.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gymshark'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Fabletics', NULL, 'press@fabletics.com', 'press', 'https://www.fabletics.com', 'fabletics', 'activewear', 'El Segundo', 'United States', 'Celebrity-backed (Kate Hudson) subscription activewear. Active creator collaborations. Also operates Yitty shapewear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Fabletics'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Outdoor Voices', NULL, 'hello@outdoorvoices.com', 'general', 'https://www.outdoorvoices.com', 'outdoorvoices', 'activewear', 'Austin', 'United States', 'Lifestyle-focused activewear brand. Known for colorful lookbook campaigns. Recreational exercise positioning.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Outdoor Voices'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sweaty Betty', NULL, 'press@sweatybetty.com', 'press', 'https://www.sweatybetty.com', 'sweatybetty', 'activewear', 'London', 'United Kingdom', 'British premium women''s activewear. Owned by Wolverine World Wide. Strong model-driven campaigns. UK PR handled by Gung Ho agency.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sweaty Betty'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Varley', NULL, 'press@varley.com', 'press', 'https://www.varley.com', 'varley', 'activewear', 'Los Angeles', 'United States', 'Luxury women''s sportswear and activewear. Sold at Mytheresa, Shopbop, Nordstrom. Elevated lifestyle campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Varley'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'SET Active', NULL, 'hello@setactive.co', 'general', 'https://setactive.co', 'setactive', 'activewear', 'Los Angeles', 'United States', 'Fast-growing DTC activewear brand popular with Gen Z. Known for viral color drops and model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('SET Active'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'P.E Nation', NULL, 'info@pe-nation.com', 'general', 'https://www.pe-nation.com', 'p.e', 'activewear', 'Sydney', 'Australia', 'Australian active streetwear. Founded by Pip Edwards and Claire Tregoning. Strong editorial and campaign work.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('P.E Nation'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Athleta', NULL, 'press@gap.com', 'press', 'https://athleta.gap.com', 'athleta', 'activewear', 'San Francisco', 'United States', 'Gap Inc. women''s performance brand. B Corp certified. Major seasonal campaigns with diverse models.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Athleta'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'PANGAIA', NULL, 'press@thepangaia.com', 'press', 'https://pangaia.com', 'thepangaia', 'activewear', 'London', 'United Kingdom', 'Materials science brand with sustainable activewear line. Plant-based activewear collection. High-fashion campaign aesthetic.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('PANGAIA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Splits59', NULL, 'press@splits59.com', 'press', 'https://www.splits59.com', 'splits59', 'activewear', 'Los Angeles', 'United States', 'Premium women''s activewear. Stocked at Nordstrom, Saks, Shopbop. Known for sleek, minimalist campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Splits59'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Carbon38', NULL, 'carbon38@accentprojects.co', 'pr', 'https://carbon38.com', 'carbon38', 'activewear', 'Culver City', 'United States', 'Multi-brand luxury activewear retailer and own label. PR handled by Accent Projects agency.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Carbon38'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'On Running', NULL, 'press@on-running.com', 'press', 'https://www.on-running.com', 'on', 'activewear', 'Zurich', 'Switzerland', 'Swiss performance brand. Publicly traded. Major global campaigns with athletes and lifestyle models. Roger Federer investor.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('On Running'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'New Balance', NULL, 'media.relations@newbalance.com', 'press', 'https://www.newbalance.com', 'newbalance', 'activewear', 'Boston', 'United States', 'Major athletic brand. Extensive lifestyle and running campaigns. Growing fashion crossover.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('New Balance'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Puma', 'Kseniia Iliushina', 'kseniia.iliushina@puma.com', 'pr', 'https://about.puma.com', 'puma', 'activewear', 'Herzogenaurach', 'Germany', 'Global sportswear brand. Manager Global Brand PR. Also: corporate.press@adidas.com for corporate. Major model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Puma'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Adidas', NULL, 'corporate.press@adidas.com', 'press', 'https://www.adidas.com', 'adidas', 'activewear', 'Herzogenaurach', 'Germany', 'Global sportswear giant. Corporate communications department. Extensive model and celebrity campaigns worldwide.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Adidas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Girlfriend Collective', NULL, 'hello@girlfriend.com', 'general', 'https://girlfriend.com', 'girlfriendcollective', 'activewear', 'Seattle', 'United States', 'Sustainable activewear from recycled materials. Highly inclusive sizing and model campaigns. B Corp certified.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Girlfriend Collective'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rhone', NULL, 'press@rhone.com', 'press', 'https://www.rhone.com', 'rhone', 'activewear', 'Stamford', 'United States', 'Premium men''s activewear and performance lifestyle. Strong male model campaigns. Growing retail footprint.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rhone'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Castore', NULL, 'press@castore.co.uk', 'press', 'https://castore.com', 'caaboresportswear', 'activewear', 'Manchester', 'United Kingdom', 'British premium sportswear. Official kit partners for multiple Premier League clubs. Model-driven campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Castore'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oysho (Inditex)', NULL, 'press@inditex.com', 'press', 'https://www.oysho.com', 'oysho', 'activewear', 'Tordera', 'Spain', 'Inditex group activewear/lingerie brand. Major campaign production with models globally. Press handled through Inditex.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oysho (Inditex)'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Halara', NULL, 'press@halara.com', 'press', 'https://www.halara.com', 'halara_official', 'activewear', NULL, 'Hong Kong', 'Fast-growing DTC athleisure brand. Massive social media presence. Also: collaboration@halara.com for partnerships.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Halara'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ultracor', NULL, 'info@ultracor.com', 'general', 'https://www.ultracor.com', 'ultracor', 'activewear', 'Los Angeles', 'United States', 'Eco-luxury activewear. Premium price point. Fashion-forward editorial campaigns. Also: sales@ultracor.com for wholesale.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ultracor'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tracksmith', NULL, 'press@tracksmith.com', 'press', 'https://www.tracksmith.com', 'tracksmith', 'activewear', 'Wellesley', 'United States', 'Premium running apparel. Strong editorial heritage. High-quality campaign photography with runners/models.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tracksmith'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Satisfy Running', 'Brice Partouche', 'contact@satisfyrunning.com', 'general', 'https://satisfyrunning.com', 'satisfyrunning', 'activewear', 'Paris', 'France', 'Luxury running brand designed in Paris. High-end editorial campaigns. CEO: Brice Partouche.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Satisfy Running'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'HOKA', NULL, 'PR@hokaoneone.com', 'pr', 'https://www.hoka.com', 'haborka', 'activewear', 'Goleta', 'United States', 'Billion-dollar performance brand (Deckers). Major global campaigns. Growing lifestyle/athleisure presence.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('HOKA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Allbirds', NULL, 'press@allbirds.com', 'press', 'https://www.allbirds.com', 'allbirds', 'activewear', 'San Francisco', 'United States', 'Sustainable footwear and activewear. Growing apparel line. Campaign work with lifestyle models.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Allbirds'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Under Armour', NULL, 'mediarelations@underarmour.com', 'press', 'https://www.underarmour.com', 'underarmour', 'activewear', 'Baltimore', 'United States', 'Major global athletic brand. Extensive campaign work. Global Communications team handles media.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Under Armour'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cotopaxi', NULL, 'pr@cotopaxi.com', 'pr', 'https://www.cotopaxi.com', 'cotopaxi', 'activewear', 'Salt Lake City', 'United States', 'B Corp outdoor/activewear brand. Colorful adventure aesthetic. Growing activewear collection.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cotopaxi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Beach Riot', NULL, 'press@beachriot.com', 'press', 'https://beachriot.com', 'beachriot', 'activewear', 'Los Angeles', 'United States', 'Swim meets activewear brand. Bold prints and patterns. Stocked at Nordstrom, Revolve. Active model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Beach Riot'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Onia', NULL, 'press@onia.com', 'press', 'https://onia.com', 'onia', 'activewear', 'New York', 'United States', 'Luxury swim/resort brand expanding into activewear. Featured in WWD. Also: sales@onia.com for wholesale.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Onia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cotton On Body', NULL, 'pr@cottonon.com.au', 'pr', 'https://cottonon.com/AU/cottononbody/', 'cottonon', 'activewear', 'Geelong', 'Australia', 'Part of Cotton On Group. Affordable activewear with model campaigns. 50+ countries. Major Australian retailer.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cotton On Body'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Nimble Activewear', NULL, 'hello@nimbleactivewear.com', 'general', 'https://nimbleactivewear.com', 'nimbleactivewear', 'activewear', 'Sydney', 'Australia', 'Australian sustainable activewear. 10+ years established. Biodegradable packaging. Model-driven campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Nimble Activewear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'FP Movement (Free People)', NULL, 'pr@urbn.com', 'pr', 'https://www.freepeople.com/fpmovement/', 'fpmovement', 'activewear', 'Philadelphia', 'United States', 'Free People''s activewear line (URBN Inc). Boho-chic aesthetic. Major lookbook and model campaigns. PR through parent company.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('FP Movement (Free People)'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Spanx', 'Lauren Hauther', 'lhauther@spanx.com', 'pr', 'https://www.spanx.com', 'spanx', 'activewear', 'Atlanta', 'United States', 'Iconic shapewear brand expanding into activewear (OnForm collection). Blackstone-backed. Major model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Spanx'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Nike', NULL, 'media.europe@nike.com', 'press', 'https://www.nike.com', 'nike', 'activewear', 'Beaverton', 'United States', 'World''s largest sportswear brand. This is UK/Europe media contact. Massive global campaign production.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Nike'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Xexymix', NULL, 'globalonline@xexymix.com', 'general', 'https://en.xexymix.com', 'xfromblossom', 'activewear', 'Seoul', 'South Korea', 'Leading Korean athleisure brand. Expanding globally (US, Australia, Singapore). Uses models extensively in Asian markets.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Xexymix'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Manduka', NULL, 'info@manduka.com', 'general', 'https://www.manduka.com', 'manduka', 'activewear', 'El Segundo', 'United States', 'Premium yoga brand (mats, props, apparel). Strong yoga lifestyle campaigns. Also: wholesale@manduka.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Manduka'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Brooks Running', NULL, 'press@brooksrunning.com', 'press', 'https://www.brooksrunning.com', 'brooksrunning', 'activewear', 'Seattle', 'United States', 'Major running brand (Berkshire Hathaway). Growing apparel campaigns beyond footwear. $1B+ revenue.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Brooks Running'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Salomon', NULL, 'communications@salomon.com', 'press', 'https://www.salomon.com', 'salomon', 'activewear', 'Annecy', 'France', 'French outdoor/trail brand crossing into fashion. Owned by Amer Sports. Growing lifestyle and activewear campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Salomon'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Saucony', 'Sharon Barbano', 'sharon.barbano@saucony.com', 'pr', 'https://www.saucony.com', 'saucony', 'activewear', 'Waltham', 'United States', 'Performance running brand. Growing lifestyle activewear line. PR also through Agentry PR (North America).'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Saucony'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Alala', NULL, 'service@alalastyle.com', 'general', 'https://alalastyle.com', 'alaboralastyle', 'activewear', 'New York', 'United States', 'Designer activewear for capsule wardrobes. Founded 2014. NYC-based luxury positioning.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Alala'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lucas Hugh', NULL, 'info@lucashugh.com', 'general', 'https://www.lucashugh.com', 'lucashugh', 'activewear', 'London', 'United Kingdom', 'Luxury performance activewear designed in London. Founded 2010. Sold at Net-a-Porter. High-end editorial campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lucas Hugh'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Montiel', 'Maggie Montiel', 'info@montiel.com', 'general', 'https://montiel.com', 'montielactivewear', 'activewear', 'Thousand Oaks', 'United States', 'DTC women''s activewear brand. Strong Instagram presence. LA-based with model-driven marketing.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Montiel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Reebok', NULL, 'Will.Smiarowski@reebok.com', 'pr', 'https://www.reebok.com', 'reebok', 'activewear', 'Boston', 'United States', 'Iconic athletic brand (Authentic Brands Group). Senior Manager, Global PR & Brand Marketing. Major model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Reebok'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'AYBL', NULL, 'hello@aybl.com', 'general', 'https://www.aybl.com', 'ayaborbl', 'activewear', 'Redditch', 'United Kingdom', 'Fast-growing UK gymwear brand. Part of AYBL Group. Strong social media driven campaigns with models.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('AYBL'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Adanola', NULL, 'help@adanola.com', 'general', 'https://adanola.com', 'adanola', 'activewear', 'Manchester', 'United Kingdom', 'Trending UK activewear/athleisure. Sold at Selfridges. Very strong model campaigns and lookbooks. Rapidly growing.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Adanola'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'TALA', NULL, 'hello@wearetala.com', 'general', 'https://www.wearetala.com', 'wearetala', 'activewear', 'London', 'United Kingdom', 'Sustainable activewear founded by Grace Beverley (Forbes 30U30). Strong model campaigns and Gen Z following.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('TALA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ryderwear', NULL, 'support@ryderwear.com.au', 'general', 'https://au.ryderwear.com', 'ryderwear', 'activewear', 'Melbourne', 'Australia', 'Australian gym apparel brand since 2009. Ships to 50+ countries. Strong bodybuilding/fitness model campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ryderwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Born Primitive', NULL, 'contact@bornprimitive.com', 'general', 'https://bornprimitive.com', 'bornprimitive', 'activewear', 'Virginia Beach', 'United States', 'CrossFit and military-inspired activewear. Patriot aesthetic. Model and athlete campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Born Primitive'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ten Thousand', NULL, 'support@tenthousand.cc', 'general', 'https://www.tenthousand.cc', 'tenthousand', 'activewear', 'New York', 'United States', 'Premium men''s training activewear. Known for best-in-class training shorts. Growing campaign production.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ten Thousand'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Spiritual Gangster', NULL, 'care@spiritualgangster.com', 'general', 'https://spiritualgangster.com', 'spiritualgangster', 'activewear', 'Laguna Beach', 'United States', 'Yoga-inspired clothing and accessories. Founded 2008 by yoga instructors. Bohemian lifestyle campaigns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Spiritual Gangster'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lunya', NULL, 'press@lunya.co', 'press', 'https://lunya.co', 'lunya', 'resort_wear', 'Santa Monica', 'US', 'Loungewear. Luxury sleepwear brand known for washable silk sets. Also operates Lahgo (men''s). Press page confirmed.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lunya'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lake Pajamas', NULL, 'info@lakepajamas.com', 'general', 'https://lakepajamas.com', 'lakepajamas', 'resort_wear', 'Savannah', 'US', 'Loungewear. Ultra-soft sleepwear and loungewear. Also has bridal@lakepajamas.com and corporategifts@lakepajamas.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lake Pajamas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Desmond & Dempsey', NULL, 'hello@desmondanddempsey.com', 'press', 'https://desmondanddempsey.com', 'desmondanddempsey', 'resort_wear', 'London', 'UK', 'Loungewear. Luxury print pajamas designed in UK, hand-sewn in Portugal from organic cotton. hello@ is their press contact per website.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Desmond & Dempsey'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Olivia von Halle', 'Daisy Hoppen', 'daisy@dh-pr.com', 'pr', 'https://oliviavonhalle.com', 'oliviavonhalle', 'resort_wear', 'London', 'UK', 'Loungewear. Ultra-luxury silk sleepwear. UK PR via DH-PR. US PR: Bollare Communications (melissa@bollare.com). Flagship in Sloane Square.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Olivia von Halle'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tekla', NULL, 'press@teklafabrics.com', 'press', 'https://teklafabrics.com', 'teklafabrics', 'resort_wear', 'Copenhagen', 'Denmark', 'Loungewear. Danish minimalist brand. Cotton poplin sleepwear, terry robes, cashmere sets. Founded 2016.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tekla'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Derek Rose', NULL, 'press@derek-rose.com', 'press', 'https://www.derek-rose.com', 'derekroseofficial', 'resort_wear', 'London', 'UK', 'Loungewear. British heritage sleepwear brand founded 1926. Premium men''s and women''s pajamas, loungewear, dressing gowns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Derek Rose'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hanro', NULL, 'press@hanro.com', 'press', 'https://www.hanro.com', 'hanro.official', 'resort_wear', 'New York', 'US', 'Loungewear. Swiss luxury brand. Press office at 358 5th Ave, Suite 1103, NYC. Also cs@hanro.com for general.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hanro'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Magniberg', NULL, 'press@magniberg.com', 'press', 'https://magniberg.com', 'magnibergofficial', 'resort_wear', 'Stockholm', 'Sweden', 'Loungewear. Swedish bedwear and sleepwear brand. Silk pajama shirts, crisp poplin sets. Founded 2016.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Magniberg'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hesper Fox', NULL, 'press@hesperfox.com', 'press', 'https://hesperfox.com', 'hesperfox', 'resort_wear', 'London', 'UK', 'Loungewear. Luxury women''s silk sleepwear and nightwear. Also has sales@hesperfox.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hesper Fox'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Pour Les Femmes', 'Ayla', 'ayla@pourlesfemmes.com', 'pr', 'https://pourlesfemmes.com', 'pourlesfemmes', 'resort_wear', 'Los Angeles', 'US', 'Loungewear. Co-founded by Robin Wright. Ethical luxury sleepwear. Also sales@pourlesfemmes.com for wholesale.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Pour Les Femmes'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Morgan Lane', NULL, 'info@morgan-lane.com', 'general', 'https://www.morgan-lane.com', 'morganlane', 'resort_wear', 'New York', 'US', 'Loungewear. NYC luxury sleepwear brand founded 2014. Playful prints, original hand-drawn designs, seductive aesthetics.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Morgan Lane'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sleepy Jones', NULL, 'press@sleepyjones.com', 'press', 'https://sleepyjones.com', 'sleepyjones', 'resort_wear', 'New York', 'US', 'Loungewear. Founded by Andy Spade in 2013. Artist-inspired sleepwear and loungewear. Also wholesale@sleepyjones.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sleepy Jones'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bedhead Pajamas', NULL, 'press@bedheadpjs.com', 'press', 'https://bedheadpjs.com', 'bedheadpjs', 'resort_wear', 'Los Angeles', 'US', 'Loungewear. Made in USA. Boutique in West Hollywood. Also wholesale@bedheadpjs.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bedhead Pajamas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Printfresh', NULL, 'hello@printfresh.com', 'press', 'https://printfresh.com', 'printfresh', 'resort_wear', 'Philadelphia', 'US', 'Loungewear. Bold print luxury pajamas designed in Philadelphia, hand screen-printed by artisans in India. Sold at Anthropologie.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Printfresh'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'LESET', NULL, 'contact@leset.com', 'general', 'https://leset.com', 'leset', 'resort_wear', 'Los Angeles', 'US', 'Loungewear. Elevated LA-based loungewear. Mix-and-match pieces for modern comfort. Featured in Vogue.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('LESET'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Morpho + Luna', NULL, 'info@morphoandluna.com', 'general', 'https://morphoandluna.com', 'morphoandluna', 'resort_wear', 'Milan', 'Italy', 'Loungewear. Luxury nightwear made in Italy. Silk, linen, cotton, cashmere. French-Italian founders. By appointment showroom in Milan.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Morpho + Luna'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'La Perla', 'Frederic Klein', 'frederic.klein@laperla.com', 'general', 'https://laperla.com', 'laperlaofficial', 'resort_wear', 'London', 'UK', 'Loungewear/Lingerie. Iconic Italian luxury lingerie and sleepwear. HQ London, production Bologna. Also UK PR: Seven Dials City.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('La Perla'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Fleur du Mal', NULL, 'press@fleurdumal.com', 'press', 'https://fleurdumal.com', 'fleurdumalnyc', 'resort_wear', 'New York', 'US', 'Loungewear/Lingerie. Luxury lingerie and sleepwear brand. Founded 2012 by Jennifer Zuccarini. Store on Mott St NYC.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Fleur du Mal'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Commando', NULL, 'commando@lindagaunt.com', 'pr', 'https://www.wearcommando.com', 'wearcommando', 'resort_wear', 'Burlington', 'US', 'Loungewear/Lingerie. Luxury garments. US PR via Linda Gaunt Communications. UK PR: juliademetriou.jdpr@gmail.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Commando'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Natori', NULL, 'help@natori.com', 'general', 'https://www.natori.com', 'naboricollection', 'resort_wear', 'New York', 'US', 'Loungewear. The Natori Company - designer clothing, women''s lingerie and luxury sleepwear. HQ at 261 5th Ave NYC. Also has bridal loungewear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Natori'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'LILYSILK', NULL, 'press@lilysilk.com', 'press', 'https://www.lilysilk.com', 'lilysilk', 'resort_wear', 'New York', 'US', 'Loungewear/Silk. Premium silk sleepwear and fashion. Worn by Lucy Hale, Nina Dobrev, Gwyneth Paltrow. Featured in VOGUE, ELLE.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('LILYSILK'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Clementine Sleepwear', NULL, 'press@sleepwithclementine.com', 'press', 'https://www.sleepwithclementine.com', 'clementinesleepwear', 'resort_wear', 'Beverly Hills', 'US', 'Loungewear/Sustainable. Award-winning organic silk sleepwear. GOTS certified. Donates 1% to Feeding America.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Clementine Sleepwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Coyuchi', NULL, 'prs@coyuchi.com', 'pr', 'https://www.coyuchi.com', 'coyuchi', 'resort_wear', 'Point Reyes Station', 'US', 'Loungewear/Sustainable. Organic luxury loungewear and sleepwear since 1991. GOTS certified organic cotton. California-based.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Coyuchi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cozy Earth', NULL, 'collaborations@cozyearth.com', 'partnerships', 'https://cozyearth.com', 'cozyearth', 'resort_wear', 'Salt Lake City', 'US', 'Loungewear/Sustainable. Premium bamboo loungewear and bedding. Oprah''s Favorite Things. Also hello@cozyearth.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cozy Earth'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sant and Abel', NULL, 'press@santandabel.com', 'press', 'https://santandabel.com', 'santandabel', 'resort_wear', 'Sydney', 'Australia', 'Loungewear. Luxury cotton sleepwear from Australia. Born in Sydney 2011. Also has LA presence. Also sales@santandabel.com for wholesale.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sant and Abel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Jasmine and Will', NULL, 'info@jasmineandwill.com', 'general', 'https://www.jasmineandwill.com', 'jasmineandwill', 'resort_wear', 'Sydney', 'Australia', 'Loungewear. Timeless quality sleepwear designed in Australia. Cotton sateen, minimalist cuts. Monogramming available.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Jasmine and Will'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Papinelle', NULL, 'marketing@papinelle.com', 'press', 'https://www.papinelle.com', 'papinellesleepwear', 'resort_wear', 'Sydney', 'Australia', 'Loungewear. Australian sleepwear brand in Paddington. Natural fabrics. Also wholesale@papinelle.com. Now at Victoria''s Secret US.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Papinelle'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Homebodii', 'Ingrid Bonnor', 'studio@homebodii.com', 'general', 'https://www.homebodii.com', 'homebodii', 'resort_wear', 'Gold Coast', 'Australia', 'Loungewear/Bridal. Australian luxury sleepwear and bridal robes. Founded 2012. Stocked at Nordstrom, Bloomingdale''s, Anthropologie.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Homebodii'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'GINIA', NULL, 'marketing@fashionata.com.au', 'pr', 'https://giniaofficial.com', 'giniaofficial', 'resort_wear', 'Sydney', 'Australia', 'Loungewear. Australian luxury silk sleepwear and RTW. Stocked at David Jones, Bloomingdale''s. Suite 5.10, 77 Dunning Ave, Rosebery NSW.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('GINIA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gelato Pique', NULL, 'customer@gelatopique.us', 'general', 'https://gelatopique.us', 'gelatopique_usa', 'resort_wear', 'New York', 'US', 'Loungewear. Japanese luxury loungewear brand - ''wearable dessert''. Signature gelato fabric. Store on Orchard St NYC. Japan HQ.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gelato Pique'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mey', 'Isabell Haasis', 'isabell.haasis@mey.com', 'press', 'https://www.mey.com', 'mey_bodywear', 'resort_wear', 'Albstadt', 'Germany', 'Loungewear. German family company since 1928. Premium sleepwear and loungewear. FSC-certified clothing manufacturer.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mey'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Dagsmejan', NULL, 'info@dagsmejan.com', 'general', 'https://dagsmejan.com', 'dagsmejan', 'resort_wear', 'Zurich', 'Switzerland', 'Loungewear. Swiss sleep innovation since 2015. Developed with EMPA research lab. Made in Europe from sustainable materials.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Dagsmejan'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'The White Company', NULL, 'press@thewhitecompany.com', 'press', 'https://www.thewhitecompany.com', 'thewhitecompany', 'resort_wear', 'London', 'UK', 'Loungewear. British lifestyle brand. Luxury sleepwear, loungewear, home. HQ: 2 Television Centre, 101 Wood Lane, London W12 7FR.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('The White Company'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Love Stories', NULL, 'press@lovestoriesintimates.com', 'press', 'https://lovestoriesintimates.com', 'lovestoriesintimates', 'resort_wear', 'Amsterdam', 'Netherlands', 'Loungewear/Lingerie. Dutch brand founded 2013 by Marloes Hoedeman. 15 boutiques worldwide. Playful prints and loungewear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Love Stories'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'NK IMODE', 'Diana A.', 'diana.a@nkimode.com', 'general', 'https://nkimode.com', 'nkimode', 'resort_wear', 'Vancouver', 'Canada', 'Loungewear/Silk. Canadian luxury silk lingerie and sleepwear since 2003. 100% silk charmeuse. Also 1-866-995-3626.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('NK IMODE'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Flora Nikrooz', 'Alexandra Graham', 'agraham@essentialbrands.com', 'pr', 'https://flora-nikrooz.com', 'floranikrooz', 'resort_wear', 'New York', 'US', 'Loungewear/Bridal. Premier bridal intimates and sleepwear. Part of Essential Brands Inc. Also sales@essentialbrands.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Flora Nikrooz'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'KIM+ONO', NULL, 'hello@kimandono.com', 'general', 'https://kimandono.com', 'kimandono_', 'resort_wear', 'San Francisco', 'US', 'Loungewear/Robes. Handcrafted kimono robes. Family-owned 30+ years by sisters Renee & Tiffany Tam. Boutique in Chinatown SF.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('KIM+ONO'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Simone Perele', NULL, 'contact@simone-perele.fr', 'general', 'https://us.simone-perele.com', 'simoneperele_paris', 'resort_wear', 'Clichy', 'France', 'Loungewear/Lingerie. French lingerie house. Sleepwear and loungewear collections. HQ: 62 rue d''Alsace, 92582 Clichy la Garenne.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Simone Perele'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Soma', 'Nicole Colaco', 'nicole.colaco@chicos.com', 'pr', 'https://www.soma.com', 'soma', 'resort_wear', 'Fort Myers', 'US', 'Loungewear. Part of Chico''s FAS Inc. Women''s luxury sleepwear, pajamas, robes. 200+ stores. Also kristin.mcclement@chicos.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Soma'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Eberjey', NULL, 'partnerships@eberjey.com', 'partnerships', 'https://eberjey.com', 'eberjey', 'resort_wear', 'Coral Gables', 'US', 'Loungewear. ALREADY IN DB - SKIP IF DUPLICATE. Designer of the Year - Salon International de la Lingerie. Also stylist@eberjey.com for bridal.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Eberjey'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Etam', 'Helene Serra', 'helene.serra@etam.fr', 'press', 'https://www.etam.com', 'etam', 'lingerie', 'Clichy', 'France', 'Major French lingerie brand, 100+ year heritage. Also contact press agency: caroline.charrier@dresscodepress.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Etam'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Aubade', NULL, 'contact@aubadepro.com', 'general', 'https://www.aubade.com', 'aubadeparis', 'lingerie', 'Paris', 'France', 'Iconic French luxury lingerie house since 1958. Known for ''Lecons de Seduction'' campaigns'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Aubade'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Chantelle', NULL, 'chantelle@chantelle.com', 'general', 'https://www.chantelle.com', 'chantelle_paris', 'lingerie', 'Paris', 'France', 'World leader in women''s lingerie design and retail. Corporate email format: firstname.lastname@groupechantelle.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Chantelle'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lindex', 'Kristina Hermansson', 'kristina.hermansson@lindex.com', 'pr', 'https://www.lindex.com', 'laboratoriodelindex', 'lingerie', 'Gothenburg', 'Sweden', 'Swedish fashion brand with strong lingerie line. Senior PR & Communications Manager. Alt PR contact: susanna.antonini@lindex.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lindex'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Underprotection', NULL, 'info@underprotection.dk', 'general', 'https://underprotection.eu', 'underprotection', 'lingerie', 'Copenhagen', 'Denmark', 'Sustainable Danish lingerie, swimwear, and loungewear brand. Customer care: customercare@underprotection.dk'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Underprotection'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Organic Basics', NULL, 'hello@organicbasics.com', 'general', 'https://organicbasics.com', 'organicbasics', 'lingerie', 'Copenhagen', 'Denmark', 'Scandinavian sustainable underwear brand. Organic cotton and recycled materials. Now owned by Delta Galil'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Organic Basics'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Opaak', NULL, 'customerservice@opaak.de', 'general', 'https://www.opaak.de', 'opaakofficial', 'lingerie', 'Cologne', 'Germany', 'Independent German lingerie brand founded 2016. Eco-friendly, ethically sustainable, designed in Germany and made in EU'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Opaak'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Naturana', NULL, 'socialmedia@naturana.de', 'press', 'https://naturana.com', 'naturana_de', 'lingerie', 'Gomaringen', 'Germany', 'German lingerie brand for cooperations, influencers, and press inquiries. Digital team handles PR/media requests'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Naturana'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Andres Sarda', NULL, 'madrid@andressarda.com', 'general', 'https://www.andressarda.com', 'andressarda', 'lingerie', 'Madrid', 'Spain', 'Iconic Spanish luxury lingerie brand. Now part of Van de Velde Group. 400+ multi-brand points of sale globally'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Andres Sarda'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Yasmine Eslami', 'Yasmine Eslami', 'shop@yasmine-eslami.com', 'general', 'https://yasmine-eslami.com', 'yasmineeslami', 'lingerie', 'Paris', 'France', 'Parisian designer lingerie brand launched 2011. Boutique at 35 rue de Richelieu, 75001 Paris'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Yasmine Eslami'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sofia Luzon', 'Sofia Luzon', 'info@sofia-luzon.com', 'general', 'https://www.sofia-luzon.com', 'sofialuzonlingerie', 'lingerie', 'Stockholm', 'Sweden', 'Couture lingerie brand handmade in Stockholm. Limited edition and bespoke garments. Sustainable luxury'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sofia Luzon'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Baserange', 'Millie (Village PR)', 'millie@wearevillage.com', 'pr', 'https://baserange.com', 'baserange', 'lingerie', 'Paris', 'France', 'Sustainable organic underwear brand. French-Danish founded 2012. France/Europe PR: pauline@suchandsuch.fr'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Baserange'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mimi Holliday', NULL, 'press@mimiholliday.com', 'press', 'https://www.mimiholliday.com', 'mimiholliday', 'lingerie', 'London', 'United Kingdom', 'British luxury lingerie by Damaris. Wholesale: sales@mimiholliday.com. Team: team@mimiholliday.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mimi Holliday'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Boux Avenue', NULL, 'pressoffice@bouxavenue.com', 'press', 'https://www.bouxavenue.com', 'bouxavenue', 'lingerie', 'London', 'United Kingdom', 'UK high street lingerie brand. Partnership inquiries: partnershipenquiries@bouxavenue.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Boux Avenue'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Heist Studios', NULL, 'pressrequest@heist-studios.com', 'press', 'https://www.heist-studios.com', 'heiststudios', 'lingerie', 'London', 'United Kingdom', 'London-based intimates brand known for innovative tights and shapewear. Founded 2014'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Heist Studios'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Beija London', NULL, 'hello@beija.london', 'press', 'https://beija.london', 'beijalondon', 'lingerie', 'London', 'United Kingdom', 'London lingerie and swimwear brand. Coal Drops Yard, Kings Cross. Fit experts: fitexperts@beija.london'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Beija London'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Fruity Booty', NULL, 'dropmealime@fruitybooty.co.uk', 'general', 'https://fruitybooty.co.uk', 'fruitybooty', 'lingerie', 'London', 'United Kingdom', 'East London sustainable underwear and swim label. Leader in sustainable lingerie since 2017'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Fruity Booty'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Curvy Kate', NULL, 'support@curvykate.com', 'general', 'https://www.curvykate.com', 'curvykate', 'lingerie', 'London', 'United Kingdom', 'Plus-size/fuller bust lingerie brand. D-K cup specialist. Strong body-positive marketing'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Curvy Kate'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Panache', NULL, 'info@panache-lingerie.com', 'general', 'https://www.panache-lingerie.com', 'panaborache', 'lingerie', 'Sheffield', 'United Kingdom', 'UK lingerie brand specializing in D+ cup sizes. Major wholesale presence. careers@panache-lingerie.com for jobs'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Panache'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Playful Promises', NULL, 'info@playful-promises.com', 'general', 'https://www.playful-promises.com', 'playfulpromises', 'lingerie', 'London', 'United Kingdom', 'Award-winning London lingerie brand. 85+ sizes up to US K cup. Female-founded. PR by MGPR Ltd'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Playful Promises'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Elomi', NULL, 'customercare@elomilingerie.com', 'general', 'https://www.elomilingerie.com', 'elomilingerie', 'lingerie', NULL, 'United Kingdom', 'Plus-size lingerie, bras and swimwear up to K cup. Part of Wacoal group'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Elomi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kat The Label', NULL, 'wholesale@katthelabel.com', 'wholesale', 'https://www.katthelabel.com', 'kat_thelabel', 'lingerie', 'Melbourne', 'Australia', 'Australian boutique lingerie label. Flagship store in Armadale, Melbourne'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kat The Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Saturday The Label', NULL, 'info@saturdayplay.com', 'general', 'https://saturdaythelabel.com', 'saturdaythelabel', 'lingerie', NULL, 'Australia', 'Australian lingerie and loungewear brand promoting confidence, comfort, and self-love'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Saturday The Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Love & Lustre', NULL, 'info@loveandlustre.com.au', 'general', 'https://loveandlustre.com.au', 'loveandlustre', 'lingerie', 'Melbourne', 'Australia', 'Australian sleepwear and intimates brand. Hawthorn, Victoria. Premium nightwear and loungewear'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Love & Lustre'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Dita Von Teese Lingerie', NULL, 'hello@ditalingerie.com', 'general', 'https://ditavonteeselingerie.com', 'ditavonteeselingerie', 'lingerie', 'Melbourne', 'Australia', 'Celebrity-founded lingerie line by burlesque icon Dita Von Teese. Managed by AB Enterprises Australia'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Dita Von Teese Lingerie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'NEIWAI', NULL, 'hello@neiwai.life', 'general', 'https://neiwai.life', 'neiwai_official', 'lingerie', 'Shanghai', 'China', 'Leading Chinese lingerie brand championing body inclusivity. Founded 2012. 100+ stores in China. Expanding to US'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('NEIWAI'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'aimerfeel', NULL, 'aimerfeelglobal@aimerfeel.jp', 'general', 'https://aimerfeel.com', 'aimerfeel_global', 'lingerie', 'Kobe', 'Japan', 'One of Japan''s most popular lingerie brands. Born in Kobe. 190+ stores across Japan, Korea, and Taiwan'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('aimerfeel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bradelis New York', NULL, 'customercare@bradelisnewyork.com', 'general', 'https://bradelisnewyork.com', 'bradelisnewyork', 'lingerie', 'New York', 'United States', 'Japanese-founded luxury lingerie (est. 1994) with NYC presence. Known for innovative shapewear tech. English, Japanese, Chinese support'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bradelis New York'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'XIXILI', NULL, 'xixilifans@xixili-intimates.com', 'general', 'https://www.xixili-intimates.com', 'xixili_official', 'lingerie', 'Kuala Lumpur', 'Malaysia', 'First Malaysian lingerie brand with 3D avatar try-on. Plus-size inclusive. Multiple boutiques in KL'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('XIXILI'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hope Lingerie', NULL, 'contato@hopelingerie.com.br', 'general', 'https://en.hopelingerie.com.br', 'hopelingerie', 'lingerie', 'Sao Paulo', 'Brazil', 'Major Brazilian lingerie group. Also manages Bonjour Lingerie and HOPE Resort brands'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hope Lingerie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Loungerie', NULL, 'contato@loungerie.com.br', 'general', 'https://www.loungerie.com.br', 'loungerie', 'lingerie', 'Sao Paulo', 'Brazil', 'Brazilian lingerie brand with multiple retail locations. Mix of comfortable and sexy lingerie'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Loungerie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Duloren', NULL, 'contact@dulorenusa.com', 'general', 'https://dulorenusa.com', 'dulorenusa', 'lingerie', 'Danbury', 'United States', 'Brazilian lingerie brand founded 1962. Top of underwear market in Brazil. US office in Connecticut'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Duloren'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hasaria', 'Aneesa Qureshi', 'contact@hasaria.com', 'general', 'https://www.hasaria.com', 'hasarialondon', 'lingerie', 'London', 'United Kingdom', 'Luxury modest/bridal lingerie for Muslim women. Founded 2020 by LCF graduate. Viral on TikTok (2M+ likes)'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hasaria'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Parfait', NULL, 'cs@parfaitlingerie.com', 'general', 'https://parfaitlingerie.com', 'parfaitlingerie', 'lingerie', 'City of Industry', 'United States', 'Plus-size lingerie brand, 32A-44G (select sizes up to K cup). Based in California'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Parfait'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Montelle Intimates', NULL, 'info@montelleintimates.com', 'general', 'https://montelleintimates.com', 'montellintimates', 'lingerie', 'Montreal', 'Canada', 'Canadian intimate apparel brand, designing and manufacturing since 1994'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Montelle Intimates'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mary Young', 'Mary Young', 'hello@maryyoung.com', 'general', 'https://maryyoung.com', 'maryyoung', 'lingerie', 'Toronto', 'Canada', 'Ethical, sustainable lingerie. All garments produced in Montreal. Self-love focused branding'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mary Young'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Miguelina', NULL, 'Press@miguelina.com', 'press', 'https://www.miguelina.com', 'miguelinagambaccini', 'lingerie', 'New York', 'United States', 'Luxury designer expanding into intimates. Sales: Sales@Miguelina.com. Known for resort/beachwear and silk bralettes'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Miguelina'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kilo Brava', NULL, 'hello@kilobrava.com', 'general', 'https://kilobrava.com', 'kilobrava', 'lingerie', 'Denver', 'United States', 'Woman-owned, self-funded. Sizes S-XXXL. Designed and developed in USA. Has wholesale program'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kilo Brava'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cou Cou Intimates', NULL, 'hi@coucouintimates.com', 'general', 'https://coucouintimates.com', 'coucouintimates', 'lingerie', 'New York', 'United States', 'Sustainable organic cotton intimates. 1% donated to nonprofits. Stocked at Le Bon Marche'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cou Cou Intimates'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Araks', NULL, 'shop@araks.com', 'general', 'https://www.araks.com', 'araboraksyeramian', 'lingerie', 'New York', 'United States', 'NYC lingerie and swimwear brand. Has dedicated press page. Araks Salon at 401 Broadway, NYC'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Araks'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Only Hearts', 'Amanda', 'amanda@onlyhearts.com', 'press', 'https://onlyhearts.com', 'onlyhearts', 'lingerie', 'New York', 'United States', 'Ethically manufactured in NYC. Wholesale: rosamaria@onlyhearts.com. Uses deadstock, organic, recycled textiles'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Only Hearts'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Salua Lingerie', NULL, 'salua@salualingerie.com', 'general', 'https://salualingerie.com', 'salualingerie', 'lingerie', 'Seattle', 'United States', 'Colombian-founded luxury lingerie brand (est. 1993). US operations in Seattle'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Salua Lingerie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Elma Lingerie', 'Elma Valerio', 'elma@elmashop.co', 'general', 'https://elmashop.co', 'elmalingerie', 'lingerie', NULL, 'United States', 'Handmade to order lingerie from California. Bespoke and custom pieces available. Also on Etsy'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Elma Lingerie'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Angela Friedman', 'Angela Friedman', 'info@angelafriedman.com', 'general', 'https://angelafriedman.com', 'angelafriedman', 'lingerie', 'London', 'United Kingdom', 'Luxury bridal lingerie specialist. Handmade in English atelier. Featured in W Magazine, Vogue, Forbes. Worn by Rihanna, Gigi Hadid'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Angela Friedman'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'CALIDA', NULL, 'contact@calidagroup.com', 'general', 'https://www.calida.com', 'calida', 'lingerie', 'Oberkirch', 'Switzerland', 'Swiss premium underwear and sleepwear brand. Part of CALIDA Holding AG. Handles press/influencer inquiries'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('CALIDA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'PrimaDonna', NULL, 'contacten@primadonna.com', 'general', 'https://www.primadonna.com', 'primadonnalingerie', 'lingerie', NULL, 'Belgium', 'Premium lingerie, swimwear and sportswear. Part of Van de Velde Group. Has dedicated pressroom at pressroom.primadonna.eu'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('PrimaDonna'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sloggi', NULL, 'customerservice@triumph.com', 'general', 'https://www.sloggi.com', 'sloggi', 'lingerie', 'Bad Zurzach', 'Switzerland', 'Leading European bodywear brand by Triumph International. Sold in 40,000+ wholesale accounts across 3,600 points of sale'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sloggi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Pure Chemistry', NULL, 'sales@purechemistrylingerie.com', 'general', 'https://purechemistrylingerie.com', 'purechemistrylingerie', 'lingerie', NULL, 'United Kingdom', 'Specializes in Indian bridal lingerie and saris. Niche cultural bridal market'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Pure Chemistry'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Etam Press Agency (Dresscode Press)', 'Caroline Charrier', 'caroline.charrier@dresscodepress.com', 'pr', 'https://press.etam.com', 'etam', 'lingerie', 'Paris', 'France', 'External PR agency representing Etam lingerie. Direct press agency contact for media inquiries'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Etam Press Agency (Dresscode Press)'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Emporio Sirenuse', NULL, 'info@emporiosirenuse.com', 'general', 'https://emporiosirenuse.com', 'emporiosirenuse', 'resort_wear', 'Positano', 'Italy', 'Luxury resort wear born from Le Sirenuse hotel in Positano. Famous for caftans, swimwear and vibrant Mediterranean prints. Founded by Carla Sersale in 2013.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Emporio Sirenuse'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ploumanac''h', NULL, 'support@theploumanach.com', 'general', 'https://www.theploumanach.com', 'ploumanach', 'resort_wear', 'Arenzano', 'Italy', 'Resort wear brand for women and men, founded in Italy in 2000. Inspired by the Breton coast. Known for hand-painted cashmere, luxurious linens, and signature dyeing processes.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ploumanac''h'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Manebi', NULL, 'sales@manebigroup.com', 'wholesale', 'https://manebi.com', 'manebi', 'resort_wear', 'Milan', 'Italy', 'Handmade espadrilles designed in Italy, crafted in Spain. Expanded to swimwear, bags and full resort wear collections. Men''s and women''s vacation essentials.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Manebi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Etoile Coral', NULL, 'info@etoilecoral.com', 'general', 'https://www.etoilecoral.com', 'etoilecoral', 'resort_wear', 'Thessaloniki', 'Greece', 'Greek resort wear brand inspired by folk and traditional techniques. Universally flattering silhouettes crafted from silk or cotton with embroidery accents.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Etoile Coral'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Devotion Twins', 'Athina Parnasa', 'support@devotiontwins.com', 'general', 'https://www.devotiontwins.com', 'devotion_twins', 'resort_wear', 'Athens', 'Greece', 'Greek family business run by designer Athina and husband Dimitris. Boho resort wear inspired by Grecian culture. 1,500+ points of sale in 40+ countries since 2013.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Devotion Twins'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cortana', 'Rosa Esteva', 'info@cortana.es', 'general', 'https://cortana.es', 'cortana_official', 'resort_wear', 'Palma de Mallorca', 'Spain', 'Founded 2001 by Rosa Esteva. Artisanal approach with sustainability and purity at heart. Limited edition collections in natural fabrics, handcrafted in Barcelona and Mallorca.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cortana'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gimaguas', NULL, 'help@gimaguas.com', 'general', 'https://gimaguas.com', 'gimaguas', 'resort_wear', 'Barcelona', 'Spain', 'Barcelona-based label drawing inspiration from travel, vintage references, and Mediterranean lifestyle. Relaxed tailoring, crochet details, and soft linens.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gimaguas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lug Von Siga', 'Gul Agis', 'info@lugvonsiga.com', 'general', 'https://lugvonsiga.com', 'lugvonsiga', 'resort_wear', 'Istanbul', 'Turkey', 'Founded 2010 by Creative Director Gul Agis. Vacation-perfect patterns, embroidery work, and soft feminine shapes. Emphasizes sustainable living and craftsmanship.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lug Von Siga'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hanne Bloch', NULL, 'shop@hanne-bloch.com', 'general', 'https://hanne-bloch.com', 'hannebloch', 'resort_wear', 'Copenhagen', 'Denmark', 'Danish design silk swimwear and resort dresses by mother-daughter duo. Made ethically in Portugal. Italian and Turkish fabrics. Launched 2008 after Hanne left Missoni.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hanne Bloch'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Three Graces London', NULL, 'info@threegraceslondon.com', 'press', 'https://threegraceslondon.com', 'threegraces', 'resort_wear', 'London', 'United Kingdom', 'Luxury British resort wear. Curated collection of dresses, kaftans, and separates. Known for feminine silhouettes and quality fabrics.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Three Graces London'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Heidi Klein', 'Camilla', 'camilla@heidiklein.com', 'press', 'https://heidiklein.com', 'heidikleinswim', 'resort_wear', 'London', 'United Kingdom', 'Luxury swimwear and beachwear brand based in Chelsea, London. Flagship store on Pavilion Road. Premium resort wear and swimwear collections.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Heidi Klein'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Asceno', NULL, 'concierge@asceno.com', 'general', 'https://www.asceno.com', 'asceno', 'resort_wear', 'London', 'United Kingdom', 'Sustainable resort, beach, sleep and loungewear brand. Focus on timeless design, conscious materials, and quality. Silk and linen focused collections.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Asceno'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Casa Raki', NULL, 'hello@casaraki.com', 'general', 'https://casaraki.com', 'casaraki', 'resort_wear', 'London', 'United Kingdom', 'Sustainable luxury resort wear designed in London. Uses 100% GOTS-certified organic Belgian linen and recycled fabrics. High-fashion sustainable resort pieces.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Casa Raki'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hunza G', NULL, 'customercare@hunzag.com', 'general', 'https://www.hunzag.com', 'hunzag', 'resort_wear', 'London', 'United Kingdom', 'Iconic British swim and resort wear brand since 2015. Known for Original Crinkle signature material. One-size-fits-all concept. Designed and produced in London.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hunza G'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lindsey Brown', NULL, 'sales@lindseybrown.com', 'wholesale', 'https://www.lindseybrown.com', 'lindsey_brown_uk', 'resort_wear', 'Leicester', 'United Kingdom', 'British designer resort wear since 2012. Dreamy silk dresses and timeless cotton styles. Sizes XS-5XL. Specializes in luxury vacation and cruise wear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lindsey Brown'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'ViX Paula Hermanny', 'Paula Hermanny', 'customerservice@vixpaulahermanny.com', 'general', 'https://www.vixpaulahermanny.com', 'vixpaulahermanny', 'resort_wear', 'San Diego', 'Brazil', 'Brazilian-born luxury swimwear pioneer in the US. Special finish on swimsuits featuring leather, ropes, metal, straw or resin. Stores in Newport Beach and Coral Gables.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('ViX Paula Hermanny'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Isabela Capeto', 'Carola (Agencia Guanabara)', 'carola@agenciaguanabara.com.br', 'pr', 'https://isabelacapeto.com.br', 'icapeto', 'resort_wear', 'Rio de Janeiro', 'Brazil', 'Brazilian designer known for craft, color, and romantic sensibility. Hand embroidery, lacework, and fabric manipulation. Flagship store in Ipanema, Rio de Janeiro.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Isabela Capeto'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Osklen', NULL, 'sac@osklen.com.br', 'general', 'https://www.osklen.com', 'osklen', 'resort_wear', 'Rio de Janeiro', 'Brazil', 'Founded 1989 in Rio by Oskar Metsavaht. Brazil''s premier luxury brand combining sophisticated design with sustainability. Organic materials, recycled fabrics, fair-trade production.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Osklen'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Aguaclara', NULL, 'aguaclara@applauzi.com', 'general', 'https://www.aguaclara-swimwear.com', 'aguaclaraswimwear', 'resort_wear', 'Lima', 'Peru', 'Peruvian resort wear brand est. 1987 by siblings Liliana and Jorge Villalobos. Leader swimwear company in Peru producing 6,000+ pieces/month. Made from finest Italian fabrics.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Aguaclara'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Maaji', NULL, 'customerservice@maaji.co', 'general', 'https://www.maaji.co', 'maaji', 'resort_wear', 'Medellin', 'Colombia', 'Founded 2003 by sisters Manuela and Amalia Sierra. Colorful, playful, reversible swimwear. B Corp certified. Present in 57 countries with 15 stores in Americas.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Maaji'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Peixoto', 'Mauricio Esquenazi', 'info@peixotowear.com', 'general', 'https://www.peixotowear.com', 'peixotowear', 'resort_wear', 'Miami', 'Colombia', 'Colombian-made resort wear brand. Figure-flattering swimwear with perfect balance of support and sexiness. Founder Mauricio Esquenazi based in Miami.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Peixoto'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Chufy', 'Sofia Sanchez de Betak', 'info@chufy.com', 'general', 'https://chufy.com', 'chufy', 'resort_wear', 'New York', 'Argentina', 'Launched 2017 by Buenos Aires-born Sofia Sanchez de Betak. Sustainable fabrics and hand-painted patterns. Vacation resort wear with artisanal South American touch.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Chufy'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Jaline Resort', 'Jacqueline Lopez', 'info@jalineresort.com', 'general', 'https://jalineresort.com', 'jaline_resort', 'resort_wear', 'Oaxaca', 'Mexico', 'Sustainable luxury resort wear inspired by artisan textiles of Oaxaca. Hand loomed and hand knotted by artisans in Mexico. Showroom by appointment only.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Jaline Resort'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Luli Fama', 'Christy', 'christy@lulifama.com', 'pr', 'https://www.lulifama.com', 'lulifama', 'resort_wear', 'Miami', 'United States', 'Miami-based designer tropical resort swimwear and outfits. Sexy, colorful resort wear with Latin flair. Flagship stores in Miami Beach and Miami.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Luli Fama'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Marysia', NULL, 'customerservice@marysia.com', 'general', 'https://marysia.com', 'marysia', 'resort_wear', 'Los Angeles', 'United States', 'High fashion swim and resort wear. Designed in LA with stores in NYC. Known for scalloped edge detailing and elegant resort pieces.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Marysia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Savannah Morrow The Label', NULL, 'pr@savannahmorrow.com', 'pr', 'https://savannahmorrow.com', 'savannahmorrowthelabel', 'resort_wear', 'Los Angeles', 'United States', 'Australian-born designer, label launched 2017 in LA. Airy, light resort wear with laidback elegance. Ethical production with Bali artisans.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Savannah Morrow The Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Fe Noel', 'Felisha Noel', 'press@fenoel.com', 'press', 'https://fenoel.com', 'fenoel', 'resort_wear', 'New York', 'United States', 'Caribbean-inspired resort wear by Grenadian designer Felisha Noel. Flowy wide-legged pants, cropped bralettes, and chic caftans in stunning tropical motifs. Based in Brooklyn.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Fe Noel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sai Sankoh', 'Sai Sankoh', 'info@saisankoh.com', 'general', 'https://saisankoh.com', 'shopsaisankoh', 'resort_wear', 'Dallas', 'United States', 'Luxury kaftans and resort wear. Sierra Leonean heritage meets global luxury. Worn by Beyonce, Gabrielle Union, Iman. Rising Star nominee Fashion Group International 2020.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sai Sankoh'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'lemlem', 'Liya Kebede', 'shop@lemlem.com', 'general', 'https://www.lemlem.com', 'lemlem', 'resort_wear', 'New York', 'Ethiopia', 'Founded 2007 by supermodel Liya Kebede to preserve Ethiopian weaving traditions. Artisan-driven sustainable resort and swimwear. All made responsibly in Africa.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('lemlem'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rhea Imani', NULL, 'shop@rheaimani.com', 'general', 'https://rheaimani.com', 'rhea_imani', 'resort_wear', 'Negril', 'Jamaica', 'Luxury resort and loungewear brand handmade in Negril, Jamaica. Caftans, swimsuits, and loungewear. Women-owned, sustainable brand.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rhea Imani'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Verandah', NULL, 'pr@studioverandah.com', 'pr', 'https://www.studioverandah.com', 'studioverandah', 'resort_wear', 'Goa', 'India', 'Conscious luxury travel brand with Indian design roots. Hand-illustrated prints, fine embroideries, sustainable fabrics. Store in Arpora, Goa.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Verandah'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Shivan & Narresh', NULL, 'customercare@shivanandnarresh.com', 'general', 'https://www.shivanandnarresh.com', 'shivanandnarresh', 'resort_wear', 'Gurugram', 'India', 'Synonymous with luxury Indian resort wear. Sophisticated designs and elegant silhouettes for discerning summer travelers. Headquartered in Haryana, India.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Shivan & Narresh'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'BIASA', 'Susanna Perini', 'marketing@biasagroup.com', 'press', 'https://biasagroup.com', 'biasaofficial', 'resort_wear', 'Seminyak', 'Indonesia', 'Founded 1994 by Italian designer Susanna Perini. Pioneered sophisticated resort wear in Indonesia. Blends Indonesian lifestyle with Italian design. Flagship in Seminyak.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('BIASA'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Magali Pascal', NULL, 'marketing@magalipascal.com', 'press', 'https://magalipascal.com', 'magalipascal', 'resort_wear', 'Bali', 'Indonesia', 'French designer based in Bali since 2002. Sophisticated bohemian dresses with French influence. 5 boutiques across Bali. Parisian chic meets island vibe.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Magali Pascal'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Flook The Label', NULL, 'orders@flookthelabel.com', 'general', 'https://flookthelabel.com', 'flookthelabel', 'resort_wear', 'Canggu', 'Indonesia', 'Bali-based resort wear collaborating with local artisans. Entirely handmade beachwear, swimwear and knitwear. Sustainable materials, plant-based dyes, fair labor.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Flook The Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Andrea Iyamah', NULL, 'admin@andreaiyamah.com', 'general', 'https://www.andreaiyamah.com', 'andreaiyamah', 'resort_wear', 'Toronto', 'Nigeria', 'Nigerian-founded, Toronto/NYC-based. Inspired by color, ethnic cultures, and nature. Contemporary yet retro resort wear. Store on Bleecker St, NYC.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Andrea Iyamah'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Christie Brown', 'Aisha Ayensu', 'info@christiebrownonline.com', 'general', 'https://christiebrownonline.com', 'christiebrowngh', 'resort_wear', 'Accra', 'Ghana', 'Proudly Made in Ghana luxury brand launched 2008 by Aisha Ayensu. Named after grandmother. Vibrant prints and intricate patterns celebrating African craftsmanship.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Christie Brown'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tongoro', 'Sarah Diouf', 'contact@tongoro.com', 'general', 'https://www.tongoro.com', 'tongoro_', 'resort_wear', 'Dakar', 'Senegal', '100% Made In Africa label, designed and produced in Dakar. Celebrity fans include Beyonce, Naomi Campbell, Alicia Keys. Fast Company''s 50 Most Innovative Companies 2020.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tongoro'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Doreen Mashika', 'Doreen Mashika', 'info@doreenmashika.com', 'general', 'https://doreenmashika.com', 'doreenmashika', 'resort_wear', 'Zanzibar', 'Tanzania', 'Zanzibar-based designer. Ultra-feminine, breezy silhouettes with hand-crafted motifs. Kanga prints from Swahili coastline. Studied in Switzerland, returned to Tanzania.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Doreen Mashika'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Shona Joy', 'Tayla Bashford', 'PR@shonajoy.com.au', 'pr', 'https://shonajoy.com.au', 'shonajoy', 'resort_wear', 'Sydney', 'Australia', 'Contemporary Australian fashion brand. Known for effortless resort wear, elegant dresses and feminine silhouettes. Based in Rosebery, NSW.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Shona Joy'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Anna Quan', NULL, 'press@annaquan.com', 'press', 'https://annaquan.com.au', 'annaquanlabel', 'resort_wear', 'Sydney', 'Australia', 'Founded 2013. Timeless Australian pieces at intersection of minimalism and understated luxury. Known for elevated tailoring and resort-ready pieces.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Anna Quan'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Christopher Esber', NULL, 'info@christopheresber.com.au', 'general', 'https://christopheresber.com.au', 'christopheresber', 'resort_wear', 'Sydney', 'Australia', 'Australian designer since 2010. Known for skin-baring designs that look endlessly classy. Master of cut-out silhouettes and elegant minimalism. Based in Redfern, NSW.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Christopher Esber'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'VENROY', NULL, 'info@venroy.com.au', 'general', 'https://venroy.com.au', 'venroy', 'resort_wear', 'Sydney', 'Australia', 'Premium Australian leisurewear. Organic cotton, silk, and terry towelling. Delicate bralettes, two-piece sets and crocheted dresses. Quality, comfort and style.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('VENROY'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Palm Noosa', NULL, 'media@palmnoosa.com.au', 'press', 'https://palmnoosa.com.au', 'palm.noosa', 'resort_wear', 'Noosa Heads', 'Australia', 'Noosa-based contemporary resort wear in luxury linen and cottons. Exclusive prints designed in collaboration with local artists. Quintessential Australian beach lifestyle.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Palm Noosa'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bouguessa', NULL, 'Press@bouguessa.com', 'press', 'https://bouguessa.com', 'bouguessa', 'resort_wear', 'Dubai', 'United Arab Emirates', 'Contemporary women''s wear from Dubai Design District. Modern take on abayas and resort wear. Worn by Beyonce, Melissa McCarthy, Sophia Bush. Founded 2013.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bouguessa'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kalita', 'Kalita Al Swaidi', 'CustomerCare@kalita.co', 'general', 'https://kalita.co', 'kalitaofficial', 'resort_wear', 'London', 'United Kingdom', 'London-based luxury resort wear founded 2016 by Kalita Al Swaidi. Known for flowing silhouettes and effortless vacation dresses. Stocked at Net-a-Porter and Lane Crawford.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kalita'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Soleil Blue', NULL, 'customerservice@soleilblue.com', 'general', 'https://soleilblue.com', 'soleilblue', 'resort_wear', 'Los Angeles', 'United States', 'LA-based online destination for high quality resort wear and swim. Curates top resort brands alongside their own collections. Contemporary vacation clothing.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Soleil Blue'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, email_type, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Moeva', NULL, 'info@moeva.com', 'general', 'https://moeva.com', 'moeva_london', 'resort_wear', 'London', 'Turkey', 'Luxury swimwear and resort wear with Turkish roots, London-based. Handcrafted designer pieces. Made in Antalya and Istanbul, Turkey.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Moeva'));
