-- Batch insert new outreach contacts from research
-- Skips brands that already exist by name (case insensitive)

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Luli Fama', 'Christy', 'contact@lulifama.com', 'https://www.lulifama.com', 'lulifamaswimwear', 'swimwear', 'Miami', 'US', 'Miami Swim Week regular. Also try christy@lulifama.com for PR. Phone: 305-234-5656'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Luli Fama'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Frankies Bikinis', NULL, 'sales@frankiesbikinis.com', 'https://frankiesbikinis.com', 'frankiesbikinis', 'swimwear', 'Los Angeles', 'US', 'Founded by Francesca Aiello. CEO: Mimi Aiello. Wholesale: sales@frankiesbikinis.com. Victoria''s Secret partnership.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Frankies Bikinis'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Vitamin A', NULL, 'vitaminapr@swimusa.com', 'https://www.vitaminaswim.com', 'vitaminaswim', 'swimwear', 'Costa Mesa', 'US', 'Dedicated press email. Sustainable swimwear pioneer. Wholesale: vitamina@vitamina.eco'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Vitamin A'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mara Hoffman', NULL, 'pr@marahoffman.com', 'https://marahoffman.com', 'maaborsfuls', 'swimwear', 'New York', 'US', 'Dedicated press/casting email. Sustainable luxury designer. Miami Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mara Hoffman'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Monday Swimwear', NULL, 'press@mondayswimwear.com', 'https://mondayswimwear.com', 'mondayswimwear', 'swimwear', 'Los Angeles', 'US', 'Founded by Natasha Oakley & Devin Brugman. Has dedicated press page. Paraiso Miami Swim Week regular.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Monday Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oseree', NULL, 'press@oseree.com', 'https://oseree.com', 'osereeswimwear', 'luxury', 'Milan', 'Italy', 'Italian luxury swimwear & resort. Featured at Miami Swim Week. Also: info@oseree.com (general), sales@oseree.com (wholesale). 299K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oseree'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Leslie Amon', NULL, 'press.leslieamon@gmail.com', 'https://www.leslieamon.com', 'leslieamon', 'swimwear', NULL, NULL, 'Dedicated press email. Also: info.leslieamon@gmail.com. Paraiso Miami Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Leslie Amon'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rove Swimwear', NULL, 'pr@roveswimwear.com', 'https://www.roveswimwear.com', 'roveswimwear', 'swimwear', NULL, NULL, 'Dedicated PR email for influencer, collaboration, and media requests.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rove Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gottex', NULL, 'info@gottexbrand.com', 'https://www.gottex-swimwear.com', 'gottexswimwear', 'swimwear', NULL, 'Israel', 'Heritage luxury swimwear brand. Press inquiries via info email.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gottex'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Andie Swim', NULL, 'press@andieswim.com', 'https://andieswim.com', 'andieswim', 'swimwear', 'New York', 'US', 'Dedicated press email. Size-inclusive (XXS-3XL). Also: hello@andieswim.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Andie Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bright Swimwear', NULL, 'pr@brightswimwear.com', 'https://www.brightswimwear.com', 'brightswimwear', 'swimwear', NULL, NULL, 'Dedicated PR email for collaborations and partnerships.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bright Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Jade Swim', NULL, 'press@jadeswim.com', 'https://jadeswim.com', 'jaborswim', 'swimwear', 'Los Angeles', 'US', 'Dedicated press email. Also: info@jadeswim.com, sales@jadeswim.com. HQ: Wilshire Blvd, LA'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Jade Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'PQ Swim', NULL, 'press@pqswim.com', 'https://pqswim.com', 'pqswim', 'swimwear', 'San Diego', 'US', 'Dedicated press email. HQ: 10999 Sorrento Valley Road, San Diego, CA 92121'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('PQ Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Onia', NULL, 'press@onia.com', 'https://onia.com', 'onia', 'swimwear', 'New York', 'US', 'Dedicated press email. Also: sales@onia.com (wholesale). HQ: 10 E 40th St, NY'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Onia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mikoh', NULL, 'mikoh@bollare.com', 'https://mikoh.com', 'mikoh', 'swimwear', 'San Clemente', 'US', 'Press handled by BOLLARE agency. Sister duo from Southern California surf culture.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mikoh'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Maaji', 'Paulina Madrid', 'pmadrid@maaji.co', 'https://www.maaji.co', 'maaji', 'swimwear', 'Medellin', 'Colombia', 'PR contact: Paulina Madrid. Phone: 786-614-6501. B Corp certified. Founded 2003.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Maaji'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Agua Bendita', NULL, 'info@aguabendita.com', 'https://www.aguabendita.com', 'aguabenditasw', 'swimwear', 'Medellin', 'Colombia', 'Colombian handcrafted swimwear. Founded 2003. Paraiso Miami Swim Week participant. Contact via customer form.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Agua Bendita'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Dippin'' Daisy''s', NULL, 'partnerships@dippindaisys.com', 'https://dippindaisys.com', 'dippindaisys', 'swimwear', NULL, 'US', 'Dedicated partnerships email. Also: social@dippindaisys.com (collabs), hello@dippindaisys.com (general). Sustainable swimwear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Dippin'' Daisy''s'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kulani Kinis', NULL, 'info@kulanikinis.com', 'https://www.kulanikinis.com', 'kulanikinis', 'swimwear', NULL, 'US', 'Paraiso Miami Swim Week participant. Hawaiian-inspired prints.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kulani Kinis'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Beach Bunny', NULL, 'info@beachbunnyswimwear.com', 'https://www.beachbunnyswimwear.com', 'beachbunnyswimwear', 'swimwear', 'Newport Beach', 'US', 'Founded by Angela Chittenden. Has Press section on website. HQ: 950 W Coast Hwy, Newport Beach'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Beach Bunny'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Montce', NULL, 'customerservice@montce.com', 'https://www.montce.com', 'montce', 'swimwear', 'Fort Lauderdale', 'US', 'Multiple South Florida stores. Collab with Quay Sunglasses at Miami Swim Week. Text: 786-590-0216'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Montce'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Acacia', 'Naomi Newirth', 'info@acacia.co', 'https://www.acacia.co', 'acaciaswimwear', 'swimwear', 'Kailua', 'US', 'Hawaiian brand. Owner: Naomi Newirth. Flagship in Paia, HI. Phone: +1.808.446.3033'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Acacia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Hunza G', NULL, 'customercare@hunzag.com', 'https://www.hunzag.com', 'hunzag', 'swimwear', 'London', 'UK', 'Iconic crinkle fabric. Designed in London. One-size concept. Phone: 02076331655'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Hunza G'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ema Savahl', NULL, 'info@emasavahl.com', 'https://emasavahl.com', 'emasavahl', 'swimwear', 'Miami', 'US', 'Couture hand-painted swimwear. Miami Swim Week regular. Miss Universe partnership. Phone: 305-754-6717'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ema Savahl'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Trina Turk', NULL, 'socialmedia@trinaturk.com', 'https://www.trinaturk.com', 'trinaturk', 'swimwear', 'Alhambra', 'US', 'PR Manager: 3025 W Mission Rd, Alhambra, CA 91803. Also: customercare@trinaturk.com'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Trina Turk'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Norma Kamali', NULL, 'info@normakamali.com', 'https://normakamali.com', 'normakamali', 'swimwear', 'New York', 'US', 'Iconic designer. HQ: 609 Greenwich St, 2 Fl New York, NY 10014. Phone: 212-957-9797'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Norma Kamali'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Solid & Striped', NULL, 'press@solidandstriped.com', 'https://www.solidandstriped.com', 'solidandstriped', 'fashion', 'New York', 'USA', 'Luxury swimwear & beachwear. Also: concierge@solidandstriped.com (general), sales@solidandstriped.com (wholesale). 350K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Solid & Striped'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Seafolly', NULL, 'seafolly@b-theagency.com', 'https://us.seafolly.com', 'seafollyaustralia', 'swimwear', 'Sydney', 'Australia', 'PR handled by B. The Communications Agency. Also: customercareau@seafolly.com.au'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Seafolly'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Zimmermann', NULL, 'clientservices.us@zimmermann.com', 'https://www.zimmermann.com', 'zimmermann', 'swimwear', 'Sydney', 'Australia', 'Luxury Australian brand. Founded 1991 by Nicky & Simone Zimmermann. Showrooms in Sydney, NYC, LA, London, Paris.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Zimmermann'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Triangl', NULL, 'customercare@triangl.com', 'https://triangl.com', 'triangl', 'swimwear', NULL, 'Australia', 'Exclusively online. Phone: (833) 918-3420. Major DTC swimwear brand.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Triangl'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Peixoto', 'Mauricio Esquenazi', 'info@peixotowear.com', 'https://www.peixotowear.com', 'peixotowear', 'swimwear', 'Miami', 'US', 'Founded by Mauricio Esquenazi. Miami-based. Paraiso Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Peixoto'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'SIGAL', 'Sigal Cohen Wolkowiez', 'info@shopsigal.com', 'https://shopsigal.com', 'shopsigal', 'swimwear', 'Miami', 'US', 'Venezuelan designer. Hand-painted prints. Woman-owned. Paraiso Miami Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('SIGAL'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Salty Mermaid', NULL, 'mermaids@saltymermaid.com', 'https://saltymermaid.com', 'saltymermaidswimwear', 'swimwear', 'Odessa', 'US', 'Corporate: 1430 Lake Parker Dr, Odessa, FL 33556. Has press page. Paraiso participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Salty Mermaid'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rielli', 'Arielle C. Baril', 'sales.riellibrand@gmail.com', 'https://riellibrand.com', 'riellibrand', 'swimwear', 'Miami', 'US', 'Forbes 30 Under 30 Miami 2023. Founded 2019. Has dedicated PRESS section on site.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rielli'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Marysia', 'Marysia Dobrzanska Reeves', 'info@marysia.com', 'https://marysia.com', 'marysiaswim', 'swimwear', 'Los Angeles', 'US', 'High fashion swim and resort. Founded 2009. Signature scallop edges. Has press blog.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Marysia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lascana', NULL, 'socialmedia@lascana.com', 'https://www.lascana.com', 'lascanausaofficial', 'swimwear', 'Jacksonville', 'US', 'DC Swim Week 2025. Also hello@collabs.lascana.com for collabs. Global swim & lingerie.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lascana'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Melissa Odabash', NULL, 'shop@odabash.com', 'https://www.odabash.com', 'melissaodabash', 'swimwear', 'London', 'UK', 'Luxury British swimwear. Flagships in Notting Hill & Chelsea. Phone: 44 207 499 9129'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Melissa Odabash'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oceanus', NULL, 'customerservices@oceanusswimwear.com', 'https://oceanusthelabel.com', 'oceanusthelabel', 'swimwear', 'London', 'UK', 'Luxury sequin & embellished swim. Has press page. WhatsApp: +44 7999 836562. Paraiso participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oceanus'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Koba Swim', NULL, 'hello@kobaswim.com', 'https://www.kobaswim.com', 'kobaswim', 'swimwear', NULL, NULL, 'Has PR & Collabs page. Use same email for collaboration inquiries.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Koba Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sundia Swimwear', 'Patricia Dominguez', 'info@sundiaswimwear.com', 'https://sundiaswimwear.com', 'sundia_swim', 'swimwear', 'Fallbrook', 'US', 'Has PR/Collabs/Ambassadors page. Collabs: sundiacollabs@gmail.com. Text: 760-317-3375'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sundia Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Peony', NULL, 'info@peonyswimwear.com', 'https://www.peonyswimwear.com', 'peonyswimwear', 'swimwear', 'Burleigh Heads', 'Australia', 'Australian luxury swim. HQ: 3/37a Tallabudgera Creek Rd, Burleigh Heads, QLD 4220. Sustainable.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Peony'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bond Eye', NULL, 'info@bond-eye.com.au', 'https://www.bond-eye.com', 'bondeyeswim', 'swimwear', 'Sydney', 'Australia', 'Australian-made. Signature unsized tubular crinkle fabric. Handmade in Sydney.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bond Eye'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Faithfull the Brand', NULL, 'social@faithfullthebrand.com', 'https://faithfullthebrand.com', 'faithfullthebrand', 'swimwear', 'Bali', 'Indonesia', 'Australian-designed, handcrafted in Bali. Also: shop@faithfullthebrand.com. Offices in Bali & Sydney.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Faithfull the Brand'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Stay Wild Swim', NULL, 'hello@staywildswim.com', 'https://staywildswim.com', 'staywildswim', 'swimwear', NULL, 'UK', 'Sustainable swimwear. Same email for press and media enquiries.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Stay Wild Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sinesia Karol', 'Sinesia Karol', 'info@sinesiakarol.us', 'https://sinesiakarol.us', 'sinesiakarol', 'swimwear', 'Vila Velha', 'Brazil', 'Brazilian designer. Founded 2012. Atelier in Vila Velha, Espirito Santo, Brazil. Featured by Vogue.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sinesia Karol'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Axil Swim', NULL, 'xo@axilswim.com', 'https://axilswim.com', 'axilswim', 'swimwear', 'Los Angeles', 'US', 'Also listed as Axii Swim at Miami Swim Week. HQ: 10008 National Blvd, PMB 190, LA, CA 90034'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Axil Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Delarose Sisters', NULL, 'info@thedelarosesisters.com', 'https://thedelarosesisters.com', 'thedelarosesisters', 'swimwear', 'London', 'UK', 'Designed in London. Sustainable swimwear. Miami Swim Week 2025 participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Delarose Sisters'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oh Polly', NULL, 'press@ohpolly.com', 'https://www.ohpolly.com', 'ohpollyswim', 'swimwear', 'Glasgow', 'UK', 'Has press sign-up page. Email format: first.last@ohpolly.com. Offices in Glasgow, Liverpool, LA. Paraiso participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oh Polly'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ayra Swim', NULL, 'info@ayraswim.com', 'https://ayraswim.com', 'ayraswim', 'swimwear', NULL, NULL, 'Exclusive designer swimwear. Press inquiries via info email.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ayra Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'L Space', NULL, 'info@lspace.com', 'https://www.lspace.com', 'lspace', 'swimwear', 'Costa Mesa', 'US', 'California beach lifestyle brand. Founded 2008. Has dedicated Press page. HQ: 9821 Irvine Center Dr, Irvine, CA'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('L Space'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'SHAN', 'Chantal Levesque', 'info@shan.ca', 'https://www.shan.ca', 'shanswimwear', 'swimwear', 'Montreal', 'Canada', 'Luxury Canadian brand. Founded 1985. Handcrafted in Montreal. 150+ employees. Sold in 35+ countries. Paraiso participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('SHAN'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Azulu', NULL, 'info@azulu.com', 'https://azulu.com', 'azuluoficial', 'swimwear', NULL, 'Colombia', 'Colombian heritage resortwear. Paraiso Miami Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Azulu'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Moda Minx', NULL, 'usacs@modaminx.com', 'https://www.modaminx.com', 'modaminx', 'swimwear', 'London', 'UK', 'Designed in London. Family-run business from Essex. Miami Swim Week 2025 participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Moda Minx'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Smart Swimsuits', NULL, 'info@smartswimsuits.us', 'https://www.smartswimsuits.us', 'smartswimsuits', 'swimwear', 'Honolulu', 'US', 'Tan-through swimwear. Miami Swim Week 2025 participant. Wholesale: wholesale@smartswimsuits.us'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Smart Swimsuits'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Amarotto Swimwear', NULL, 'info@amarottoswimwear.com', 'https://www.amarottoswimwear.com', 'amarottoswimwear', 'swimwear', NULL, NULL, 'Handmade luxury swimwear. Miami Swim Week regular. Also shown at NY Fashion Week.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Amarotto Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cult Gaia', 'Holly', 'holly@cultgaia.com', 'https://cultgaia.com', 'cultgaia', 'resort_wear', 'Los Angeles', 'USA', 'PR/press contact for media and influencer requests. Corporate office: 8111 Beverly Blvd Ste 310, LA 90048.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cult Gaia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'PatBO', 'Savannah Engel', 'rsvp@savannahengel.com', 'https://patbo.com', 'pataborealba', 'resort_wear', 'New York', 'USA', 'External PR agency contact. Founded by Patricia Bonaldi in Brazil, 2002. US flagship: 65 Greene St, NYC. Sold at Saks, Bergdorf, Neiman Marcus, Net-A-Porter.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('PatBO'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Miguelina', NULL, 'press@miguelina.com', 'https://www.miguelina.com', 'miguelinagambaccini', 'resort_wear', 'New York', 'USA', 'Dedicated press email. Office: 325 W 37th St, Floor 2, NYC 10018. Known for caftans and coverups.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Miguelina'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Eberjey', NULL, 'partnerships@eberjey.com', 'https://eberjey.com', 'eberjey', 'resort_wear', 'Coral Gables', 'USA', 'Partnerships/press email. HQ: 1200 Ponce De Leon Blvd, Suite 802, Coral Gables FL 33134. Premium loungewear and sleepwear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Eberjey'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lunya', NULL, 'press@lunya.co', 'https://lunya.co', 'lunya', 'resort_wear', 'Santa Monica', 'USA', 'Official PR email. Luxury sleepwear and loungewear. HQ: 1032 Broadway, Santa Monica CA.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lunya'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Jonathan Simkhai', 'Stephanie Shimon', 'press@jonathansimkhai.com', 'https://simkhai.com', 'jonathansimkhai', 'resort_wear', 'West Hollywood', 'USA', 'Official press email. 653 N La Cienega Blvd, West Hollywood CA 90069. Resort and RTW shown at Miami Swim Week.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Jonathan Simkhai'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Honorine', NULL, 'press@iamhonorine.com', 'https://iamhonorine.com', 'iamhonorine', 'resort_wear', 'New York', 'USA', 'Dedicated press email. Also: hello@iamhonorine.com (general), wholesale@iamhonorine.com. Resort dresses, lounge, and tops.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Honorine'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Marie France Van Damme', NULL, 'info@mariefrancevandamme.com', 'https://www.mariefrancevandamme.com', 'mariefrancevandamme', 'resort_wear', 'Hong Kong', 'Hong Kong', 'Press/corporate email. Luxury kaftans and resort wear. Sold at One&Only and Aman Resorts hotel boutiques worldwide. 40 years in fashion.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Marie France Van Damme'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Three Graces London', NULL, 'info@threegraceslondon.com', 'https://threegraceslondon.com', 'threegraces', 'resort_wear', 'London', 'UK', 'Press inquiries email. Luxury resort wear including dresses, kaftans, and separates.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Three Graces London'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Pitusa', 'Clara Lago', 'pr@pitusa.co', 'https://www.pitusa.co', 'pitusa', 'resort_wear', 'Miami', 'USA', 'Official PR email. Founded by Clara Lago. Known for coverups and resort pieces. Sales: sales@pitusa.co.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Pitusa'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Heidi Klein', 'Penny Klein', 'penny@heidiklein.com', 'https://heidiklein.com', 'heidikleinswim', 'resort_wear', 'London', 'UK', 'Press/PR contact (co-founder). Luxury resort swimwear and beachwear. Founded 2002. Also: info@heidiklein.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Heidi Klein'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Olivia von Halle', 'Marina Caccone', 'marina@oliviavonhalle.com', 'https://oliviavonhalle.com', 'oliviavonhalle', 'resort_wear', 'London', 'UK', 'UK/International PR contact. Studio: 6 Bayley St, London WC1B 3HE. Luxury silk nightwear and loungewear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Olivia von Halle'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Beach Bunny Swimwear', 'Angela Chittenden', 'angela@beachbunnyswimwear.com', 'https://www.beachbunnyswimwear.com', 'beachbunnyswimwear', 'resort_wear', 'Huntington Beach', 'USA', 'Dedicated PR contact. Phone: (949) 313-6113. Miami Swim Week regular. Multiple retail stores.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Beach Bunny Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lack of Color', NULL, 'pr@lackofcolor.com.au', 'https://lackofcolor.com', 'lackofcolor', 'resort_wear', 'Gold Coast', 'Australia', 'Official PR email. Resort/vacation hat brand. Also: love@lackofcolor.com.au (general), sales@lackofcolor.com.au (wholesale).'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lack of Color'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Significant Other', NULL, 'pr@shopsignificant.com', 'https://shopsignificantother.com', 'significantother_', 'resort_wear', 'Adelaide', 'Australia', 'Official PR email. Australian artisanal luxury and resort wear. Also: enquiries@shopsignificant.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Significant Other'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Johanna Ortiz', NULL, 'madisonavenue@store.johannaortiz.com', 'https://www.johannaortiz.com', 'johannaortiz', 'resort_wear', 'Cali', 'Colombia', 'NYC store contact. Luxury Colombian resort and RTW. Miami location: miami@store.johannaortiz.com. Shows at Paris and Milan fashion weeks.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Johanna Ortiz'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Silvia Tcherassi', NULL, 'info@silviatcherassi.com', 'https://silviatcherassi.com', 'silviatcherassi', 'resort_wear', 'Coral Gables', 'USA', 'General/press contact. HQ: 400 University Dr Ste 200, Coral Gables FL 33134. Colombian designer, shown at Paris and Milan FW. Miami Swim Week.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Silvia Tcherassi'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'FARM Rio', NULL, 'hello@farmrio.com', 'https://farmrio.com', 'farmrio', 'resort_wear', 'Rio de Janeiro', 'Brazil', 'General inquiries email. Part of Grupo Soma. Founded 1997. Known for colorful tropical prints. Stores in NYC, LA, Paris, London.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('FARM Rio'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Flook The Label', NULL, 'orders@flookthelabel.com', 'https://flookthelabel.com', 'flookthelabel', 'resort_wear', 'Canggu', 'Indonesia', 'General contact. Bali-based resort wear. Handmade crochet sets, dresses, knitwear by local artisans. WhatsApp: +62 822 6668 9533.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Flook The Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Camilla', NULL, 'pr@camilla.com', 'https://au.camilla.com', 'camaborsha', 'resort_wear', 'Sydney', 'Australia', 'Email format first.last@camilla.com. Founded 2004 by Camilla Franks. Luxury printed kaftans and resort collections.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Camilla'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'The Resort Co', 'Mattias Adolfsson', 'info@theresortco.com', 'https://www.theresortco.com', 'theresortco', 'resort_wear', 'Stockholm', 'Sweden', 'Corporate/collaboration email. HQ: Tomtebogatan 8, 113 39 Stockholm. Founded 2019. Ethical resort wardrobe curation.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('The Resort Co'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Adriana Degreas', NULL, 'customer@adrianadegreas.com', 'https://adrianadegreas.com', 'adrianadegreas', 'resort_wear', 'Sao Paulo', 'Brazil', 'General email; has press section on website. Brazilian luxury resort swimwear. Phone: +1 305 363 8686.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Adriana Degreas'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Natori', NULL, 'customerservice@natori.com', 'https://www.natori.com', 'josienatori', 'resort_wear', 'New York', 'USA', 'General email; has press page at natori.com/pages/press. Founded by Josie Natori. Luxury lingerie, sleepwear, loungewear. Sold at upscale department stores in 15+ countries.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Natori'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cosabella', 'Lisa Lauri', 'lisa@lisalauri.com', 'https://www.cosabella.com', 'shopcosabella', 'resort_wear', 'New York', 'USA', 'PR handled by Lisa Lauri Communications. Premium lingerie and loungewear. Now part of CALIDA GROUP. Miami Swim Week participant.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cosabella'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sundress', 'Estelle Calafato', 'contact@sundress.fr', 'https://sundress.fr', 'sundress_official', 'resort_wear', 'Saint-Laurent du Var', 'France', 'General contact email. French Riviera-based resort wear. Founded by Estelle Calafato. Mediterranean vacation style.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sundress'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'LESET', NULL, 'contact@leset.com', 'https://leset.com', 'lfreset', 'resort_wear', 'New York', 'USA', 'General inquiries/press email. Elevated loungewear brand. Text: 888-442-6942.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('LESET'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Eliza Christoph', NULL, 'customercare@elizachristoph.com', 'https://elizachristoph.com', 'elizachristoph', 'resort_wear', 'New York', 'USA', 'Customer care email for all inquiries. Ethical luxury kaftans and resort wear. Co-founded in NYC and Nairobi, Kenya. Handcrafted silk pieces.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Eliza Christoph'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Show Me Your Mumu', NULL, 'helpme@showmeyourmumu.com', 'https://showmeyourmumu.com', 'showmeyourmumu', 'resort_wear', 'Los Angeles', 'USA', 'General contact email. Resort, swim, and vacation wear. Address: 1531 Cabrillo Ave #6, Venice CA 90291.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Show Me Your Mumu'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Shani Shemer', NULL, 'info@shanishemer.com', 'https://www.shanishemer.com', 'shanishemer', 'resort_wear', 'Tel Aviv', 'Israel', 'General/press contact. Israeli resort swimwear designer. Carried at FWRD. Phone: +972-50-99-23-444.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Shani Shemer'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Montce Swim', NULL, 'customerservice@montce.com', 'https://www.montce.com', 'montce_swim', 'swimwear', 'Miami', 'US', 'Paraiso 2025 runway. Miami-based, 451K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Montce Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'L*Space', NULL, 'customerservice@lspace.com', 'https://www.lspace.com', 'lspace', 'swimwear', 'Costa Mesa', 'US', 'Paraiso designer. 455K IG followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('L*Space'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tropic of C', NULL, 'hello@tropicofc.com', 'https://tropicofc.com', 'tropicofc', 'swimwear', 'Los Angeles', 'US', 'Paraiso designer. Founded by Candice Swanepoel.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tropic of C'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Riot Swim', NULL, 'contactus@riotswim.com', 'https://www.riotswim.com', 'riotswim', 'swimwear', 'Houston', 'US', 'Paraiso designer. Also sales@riotswim.com for wholesale.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Riot Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Beach Riot', NULL, 'press@beachriot.com', 'https://beachriot.com', 'beachriot', 'swimwear', 'Los Angeles', 'US', 'Paraiso designer. Also info@beachriot.com, sales@beachriot.com. 446K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Beach Riot'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Stone Fox Swim', NULL, 'hello@stonefoxswim.com', 'https://stonefoxswim.com', 'stonefoxswim', 'swimwear', 'Redondo Beach', 'US', 'Paraiso designer. Also social@stonefoxswim.com for PR. 275K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Stone Fox Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tori Praver Swimwear', NULL, 'customerservice@toripraverswimwear.com', 'https://www.toripraverswimwear.com', 'toripraverswimwear', 'swimwear', 'Maui', 'US', 'Paraiso designer. PR: maria@sassmarque.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tori Praver Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'ViX Paula Hermanny', NULL, 'customerservice@vixpaulahermanny.com', 'https://www.vixpaulahermanny.com', 'vixpaulahermanny', 'swimwear', 'San Diego', 'US', 'Paraiso designer. Brazilian luxury swimwear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('ViX Paula Hermanny'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Liliana Montoya', 'Liliana Montoya', 'lm@lilianamontoya.com', 'https://lilianamontoya.com', 'lilianamontoyaswim', 'swimwear', 'Miami Beach', 'US', 'Paraiso 2026 lineup. Colombian designer, 213K followers. Founded 2006.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Liliana Montoya'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Oh Polly Swim', NULL, 'hello@ohpolly.com', 'https://www.ohpolly.com', 'ohpollyswim', 'swimwear', 'Belfast', 'GB', 'Paraiso 2026 lineup. 655K followers on swim account, 5M+ on main.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Oh Polly Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kittenish', NULL, 'hello@kittenish.com', 'https://kittenish.com', 'kittenish', 'swimwear', 'Nashville', 'US', 'Paraiso 2025 & 2026 runway. Founded by Jessie James Decker. 602K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kittenish'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Mars the Label', NULL, 'help@marsthelabel.com', 'https://marsthelabel.com', 'marsthelabel', 'swimwear', 'Gold Coast', 'AU', 'DC Swim Week 2025. 621K followers. Australian luxury swim.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Mars the Label'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lahana Swim', NULL, 'hello@lahiswim.com', 'https://lahiswim.com', 'lahanaswim', 'swimwear', 'Gold Coast', 'AU', 'Paraiso designer. Australian brand, 418K followers. Also info@lahana.co.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lahana Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'OneOne Swimwear', NULL, 'support@oneoneswimwear.com', 'https://oneoneswimwear.com', 'oneoneswimwear', 'swimwear', 'Miami', 'US', 'Paraiso 2025 & 2026 lineup.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('OneOne Swimwear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lolli Swim', NULL, 'info@ilovelolli.com', 'https://lolliswim.com', 'lolliswim', 'swimwear', 'Los Angeles', 'US', 'Paraiso designer. Fun & flirty swim, 117K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lolli Swim'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Cupshe', NULL, 'customercare@cupshe.com', 'https://www.cupshe.com', 'cupshe', 'swimwear', 'Los Angeles', 'US', 'Paraiso designer. 2M IG followers. Collab with Kittenish.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Cupshe'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Red Carter', NULL, 'rcohen@amerexgroup.com', 'https://redcarter.com', 'redcarterofficial', 'swimwear', 'New York', 'US', 'SwimShow 2025 exhibitor. Under Amerex Group.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Red Carter'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Rio de Sol', NULL, 'info@riodesol.com', 'https://riodesol.com', 'riodesol', 'swimwear', 'Fortaleza', 'BR', 'SwimShow 2025 exhibitor. Brazilian lifestyle swimwear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Rio de Sol'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Giannina Azar', 'Giannina Azar', 'info@gianninaazaratelier.com', 'https://gianninaazaratelier.com', 'gianninaazar', 'swimwear', 'Miami', 'US', 'Art Hearts Fashion Miami Swim Week 2025. Lebanese-Dominican couture, 347K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Giannina Azar'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Natasha Tonic', NULL, 'hello@natashatonic.com', 'https://natashatonic.com', 'natashatonic', 'swimwear', 'Los Angeles', 'US', 'Paraiso 2026 lineup. Organic hemp swimwear, made in LA.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Natasha Tonic'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'BECCA by Rebecca Virtue', NULL, 'customerservice@lunadabay.net', 'https://beccaswim.com', 'beccaswim', 'swimwear', 'Los Angeles', 'US', 'Paraiso designer. Contemporary inclusive swimwear.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('BECCA by Rebecca Virtue'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bombshell Sportswear', NULL, 'customerservice@bombshellsportswear.com', 'https://www.bombshellsportswear.com', 'bombshellsportswear', 'swimwear', 'Miami', 'US', 'DC Swim Week 2025 designer. 1M IG followers. Activewear & swim.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bombshell Sportswear'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Andrea Iyamah', NULL, 'hello@andreaiyamah.com', 'https://www.andreaiyamah.com', 'andreaiyamah', 'swimwear', 'Lagos', 'NG', 'Paraiso designer. Nigerian designer, retro & couture swimwear. Founded 2011.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Andrea Iyamah'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Del Toro', NULL, 'info@deltoroshoes.com', 'https://deltoroshoes.com', 'deltoro', 'luxury', 'Miami', 'USA', 'Handmade Italian luxury footwear & accessories. Wynwood showroom. Has dedicated Press & Marketing section on contact page.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Del Toro'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Alepel', 'Adriana Epelboim-Levy (Founder)', 'info@alepel.com', 'https://alepel.com', 'alepelofficial', 'luxury', 'Miami', 'USA', 'Hand-painted luxury shoes & accessories. Also: sales@alepel.com (marketing), isabella@alepel.com (corporate gifting). Founded 2014.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Alepel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Ema Savahl Couture', NULL, 'info@emasavahl.com', 'https://emasavahl.com', 'emasavahl', 'luxury', 'Miami', 'USA', 'Handcrafted wearable art, gowns, swimwear. ''Made with love in Miami'' since 1996. Featured at Miami Swim Week 2025. 152K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Ema Savahl Couture'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Shantall Lacayo', 'Shantall Lacayo (Founder/Designer)', 'info@shantall.com', 'https://shantall.com', 'shantalllacayo', 'fashion', 'Miami', 'USA', 'Nicaraguan designer, Miami-based. Won Project Runway S19. Featured at Miami Fashion Week 2025.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Shantall Lacayo'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'VICSON', 'Victoria Cirigliano (CEO/Founder)', 'victoria@shopvicson.com', 'https://shopvicson.com', 'iamvicson_', 'fashion', 'Miami', 'USA', 'Argentine-born, Miami-based. Statement leather shoes from cowboy boots to stilettos. Founded at 21, expanded globally from Argentina.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('VICSON'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Nikoza', 'Olga Nikoza (Founder/Designer)', 'olga@olganikoza.com', 'https://www.nikoza.com', 'nikoza_swimwear', 'fashion', 'Miami', 'USA', 'Luxury designer swimwear, resort wear & jewelry. Miami-based. Uses exquisite high-quality fabrics.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Nikoza'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Maygel Coronel', 'Maygel Coronel (Founder/Designer)', 'info@maygelcoronel.com', 'https://maygelcoronel.com', 'maygelcoronelofficial', 'luxury', 'Cartagena', 'Colombia', 'Inspired by Cartagena. Sold at Net-a-Porter. 251K followers on official account. Latin flair with color, volume, shape.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Maygel Coronel'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Bahia Maria', 'Maria Alejandra Cajamarca (Founder)', 'info@bahiamaria.com', 'https://int.bahiamaria.com', 'bahiamariasw', 'fashion', 'Bogota', 'Colombia', 'Luxe swimwear, art deco influence. Designed & manufactured in Colombia. Also: sales@bahiamaria.com. 193K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Bahia Maria'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'ESCVDO', 'Chiara & Giuliana Macchiavello (Co-Founders)', 'contact@escvdo.com', 'https://www.escvdo.com', 'escvdo', 'luxury', 'Lima', 'Peru', 'Sustainable luxury using Peruvian textiles. 300 artisans, 95% women. Sold at Net-a-Porter. 75K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('ESCVDO'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Naeem Khan', 'Zaheen (Showroom Contact)', 'zaheen@naeemkhan.com', 'https://naeemkhan.com', 'naeemkhannyc', 'luxury', 'New York', 'USA', 'Indian-American luxury designer. Featured at MIAFW 2025 Summit. 686K followers. Known for red carpet gowns.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Naeem Khan'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Quay Australia', NULL, 'pr@quay.com', 'https://www.quay.com', 'quay', 'fashion', 'San Francisco', 'USA', 'Trendy affordable sunglasses. Celebrity collabs (Lizzo, Paris Hilton, Chrissy Teigen). Also: customercare@quay.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Quay Australia'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gorjana', NULL, 'customercare@gorjana.com', 'https://www.gorjana.com', 'gorjana', 'fashion', 'Laguna Beach', 'USA', 'Contemporary jewelry. 486K followers. Contact form has ''Marketing Outreach'' and ''Collaboration'' categories. Miami store possible.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gorjana'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Vuori', NULL, 'press@vuoriclothing.com', 'https://vuoriclothing.com', 'vuoriclothing', 'activewear', 'Encinitas', 'USA', 'Premium activewear/athleisure. 1M followers. Athlete endorsements (Jared Goff, Jack Draper). Kaia Gerber capsule 2025.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Vuori'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Gymshark', NULL, 'press@gymshark.com', 'https://www.gymshark.com', 'gymshark', 'activewear', 'Birmingham', 'UK', '8M followers. Heavy influencer/ambassador marketing. Most mentioned active apparel brand on social media. Also: support@gymshark.com.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Gymshark'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Splits59', NULL, 'press@splits59.com', 'https://www.splits59.com', 'splits59', 'activewear', 'Los Angeles', 'USA', 'Luxury activewear, made in LA. Also: sales@splits59.com (wholesale), customerservice@splits59.com. 130K followers.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Splits59'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Sol de Janeiro', NULL, 'pr@soldejaneiro.com', 'https://soldejaneiro.com', 'soldejaneiro', 'beauty', 'New York', 'USA', 'Brazilian-inspired beauty. 5th largest skin care brand. Also: hello@soldejaneiro.com. Brazilian Bum Bum Cream is Fashion Week staple.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Sol de Janeiro'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Tarte Cosmetics', NULL, 'info@tartecosmetics.com', 'https://tartecosmetics.com', 'tartecosmetics', 'beauty', 'New York', 'USA', '10M followers. Official beauty partner for 2025 SI Swimsuit Runway Show. #TrippinWithTarte creator program. Top TikTok cosmetics brand.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Tarte Cosmetics'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Lenox & Sixteenth', 'Amy Peterson (Founder)', 'community@lenoxandsixteenth.com', 'https://lenoxandsixteenth.com', 'lenoxandsixteenth', 'beauty', 'Miami Beach', 'USA', 'Miami-based luxury skincare by celebrity aesthetician. Vegan, cruelty-free. Also: stockist@lenoxandsixteenth.com. Launched at Moda Operandi.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Lenox & Sixteenth'));

INSERT INTO brand_outreach_contacts (brand_name, contact_name, email, website_url, instagram_handle, category, location_city, location_country, notes)
SELECT 'Kopari Beauty', NULL, 'aloha@koparibeauty.com', 'https://koparibeauty.com', 'koparibeauty', 'beauty', 'La Jolla', 'USA', 'Beach/tropical-lifestyle beauty. 446K followers. Coconut-based clean beauty. Relevant for resort/swim lifestyle partnerships.'
WHERE NOT EXISTS (SELECT 1 FROM brand_outreach_contacts WHERE LOWER(brand_name) = LOWER('Kopari Beauty'));
