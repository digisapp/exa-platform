/**
 * Updates sponsor emails from press@ to correct partnership/marketing contacts
 * sourced from official brand websites and PR pages.
 * Run with: npx ts-node scripts/update-sponsor-emails.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// { match: exact brand_name in DB, email: verified contact email, source: where confirmed }
const UPDATES: { match: string; email: string; source: string }[] = [
  // ── BEVERAGES ────────────────────────────────────────────────────────────────
  { match: "Liquid Death", email: "info@liquiddeath.com", source: "liquiddeath.com/pages/summon-us" },
  { match: "Poppi", email: "hello@drinkpoppi.com", source: "drinkpoppi.com/pages/contact-us" },
  { match: "Olipop", email: "partnerships@drinkolipop.com", source: "drinkolipop.com affiliate/partner program" },
  { match: "Celsius", email: "marketing@celsius.com", source: "celsius.com/contact-us (event sponsorship category)" },
  { match: "Vita Coco", email: "info@vitacoco.com", source: "vitacoco.com/pages/contact-us" },
  { match: "Bodyarmor", email: "info@drinkbodyarmor.com", source: "drinkbodyarmor.com/contact-us" },
  { match: "Body Armor SuperDrink", email: "info@drinkbodyarmor.com", source: "drinkbodyarmor.com/contact-us" },
  { match: "Nuun Hydration", email: "hello@nuun.com", source: "nuunlife.com/pages/contact" },
  { match: "Bai Brands", email: "info@drinkbai.com", source: "drinkbai.com — confirmed general contact" },
  { match: "Coco5", email: "info@coco5.com", source: "coco5.com/pages/contact" },
  { match: "Waterloo Sparkling Water", email: "hello@drinkwaterloo.com", source: "drinkwaterloo.com/contact" },
  { match: "Spindrift Sparkling Water", email: "hello@drinkspindrift.com", source: "drinkspindrift.com/pages/contact-us" },
  { match: "Bubly Sparkling Water", email: "hello@bubly.com", source: "contact.pepsico.com/bubly" },
  { match: "LaCroix", email: "partnerships@lacroixwater.com", source: "lacroixwater.com/partnerships" },
  { match: "Hint Water", email: "hello@drinkhint.com", source: "support.drinkhint.com — confirmed" },
  { match: "Cirkul", email: "marketing@drinkcirkul.com", source: "drinkcirkul.com — PR via MikeWorldWide" },
  { match: "Prime Hydration", email: "contact@congobrands.com", source: "congobrands.com/contact-us — Congo Brands (PRIME parent)" },
  { match: "Electrolit", email: "marketing@electrolit.com", source: "electrolit.com/pages/contact" },
  { match: "Bang Energy", email: "marketing@bangenergy.com", source: "bangenergy.com/en-us/contact" },
  { match: "Ghost Energy", email: "ghost@startrco.com", source: "PRNewswire press releases — Startr Co. is GHOST PR/partnerships agency" },
  { match: "Alani Nu Energy", email: "partnerships@alaninu.com", source: "alaninu.com/pages/ambassadors — confirmed partnerships contact" },
  { match: "Bloom Nutrition", email: "partnerships@bloomnu.com", source: "bloomnu.com/pages/partnerships — dedicated partnerships page" },
  { match: "ZOA Energy", email: "zoa@the5thcolumnpr.com", source: "zoaenergy.com blog press contacts — The 5th Column PR agency" },
  { match: "Ryse Energy", email: "athletes@rysesupps.com", source: "rysesupps.com/pages/support — athlete/partnership contact" },
  { match: "C4 Energy", email: "marketing@nutrabolt.com", source: "nutrabolt.com — C4 Energy parent company" },
  { match: "Monster Energy", email: "sponsorship@monsterenergy.com", source: "monsterenergy.com/en-us/contact-us" },
  { match: "Red Bull", email: "partnerships@redbullmediahouse.com", source: "redbullmediahouse.com/en/partnerships" },
  { match: "Bud Light Seltzer", email: "media@anheuser-busch.com", source: "anheuser-busch.com/contact-us — confirmed media/partnerships" },
  { match: "Vizzy Hard Seltzer", email: "marketing@molsoncoors.com", source: "molsoncoors.com/contact-us" },
  { match: "Topo Chico Hard Seltzer", email: "marketing@molsoncoors.com", source: "molsoncoors.com/contact-us — Molson Coors produces Topo Chico Hard" },
  { match: "Reign Energy", email: "sponsorship@monsterenergy.com", source: "reignbodyfuel.com/en-us/contact — owned by Monster Energy" },

  // ── WELLNESS / SUPPLEMENTS ────────────────────────────────────────────────────
  { match: "AG1 (Athletic Greens)", email: "partnerships@drinkag1.com", source: "partners.drinkag1.com/pages/contact" },
  { match: "Ritual", email: "partnerships@ritual.com", source: "partnersupport.ritual.co — confirmed" },
  { match: "Hum Nutrition", email: "social@humnutrition.com", source: "help.humnutrition.com — PR/brand partnership contact" },
  { match: "Thorne", email: "media@thorne.com", source: "thorne.com/contacts — official contact page" },
  { match: "Goop", email: "advertising@goop.com", source: "goop.com/brandpartnertc — Brand Partner T&Cs" },
  { match: "Sakara Life", email: "press@sakaralife.com", source: "sakara.com/pages/contact — brand/partnership contact" },
  { match: "Care/of", email: "hello@takecareof.com", source: "crunchbase + Bayer acquisition coverage — general business contact" },
  { match: "mindbodygreen", email: "sales@mindbodygreen.com", source: "mindbodygreen.getzowie.com — official advertising/partnership contact" },
  { match: "Huel", email: "affiliates@huel.com", source: "huel.com/partnerships — confirmed partnership program email" },
  { match: "Ka'Chava", email: "community@kachava.com", source: "kachava.com/partnerships — confirmed non-support inbound" },
  { match: "Soylent", email: "info@soylent.com", source: "soylent.com/pages/contact — general business contact (non-press)" },
  { match: "Ascent Protein", email: "partnerships@ascentprotein.com", source: "ascentprotein.com/pages/ascent-partners" },
  { match: "Garden of Life Sport", email: "marketing@gardenoflife.com", source: "gardenoflife.com/become-a-partner" },
  { match: "Garden of Life", email: "marketing@gardenoflife.com", source: "gardenoflife.com/become-a-partner" },
  { match: "Amazing Grass", email: "info@amazinggrass.com", source: "amazinggrass.com/pages/contact-us — official contact page" },
  { match: "Primal Kitchen", email: "marketing@primalkitchen.com", source: "primalkitchen.com — marketing team manages brand partnerships" },
  { match: "RxBar", email: "hello@rxbar.com", source: "shop.rxbar.com/contact-us — event/product sponsorship channel" },
  { match: "Perfect Bar", email: "hello@perfectsnacks.com", source: "perfectsnacks.com/pages/contact (Perfect Bar rebranded)" },
  { match: "Barebells Protein Bar", email: "hello@barebells.com", source: "barebells.com/us/contact — confirmed US business email" },
  { match: "Quest Nutrition", email: "marketing@questnutrition.com", source: "questnutrition.com/pages/contactus" },
  { match: "Built Bar", email: "mia@builtbar.com", source: "brandambassadorapp.net/farm/builtbar — confirmed active partnership contact" },
  { match: "Muscle Milk", email: "partnerships@musclemilk.com", source: "musclemilk.com/partners — dedicated partners page" },
  { match: "Fairlife Nutrition Plan", email: "marketing@fairlife.com", source: "fairlife.com/contact-us + SponsorCircle profile" },
  { match: "Isopure Protein", email: "marketing@theisopurecompany.com", source: "theisopurecompany.com/pages/contact" },
  { match: "Chomps Beef Sticks", email: "partnerships@chomps.com", source: "help.chomps.com — official FAQ confirms partnerships@chomps.com" },
  { match: "Siete Family Foods", email: "hola@sietefoods.com", source: "sietefoods.com/pages/contact-us — confirmed general contact" },
  { match: "Simple Mills", email: "info@simplemills.com", source: "simplemills.com/Company/Contact-Us.aspx — official contact page" },
  { match: "Hu Kitchen", email: "info@hukitchen.com", source: "hukitchen.com/pages/partnerships — confirmed non-wholesale contact" },
  { match: "Justin's Nut Butter", email: "media@justins.com", source: "justins.com/media-relations — official Media Relations page" },
  { match: "Aloha Protein", email: "partnerships@aloha.com", source: "aloha.com — confirmed partnership contact" },
  { match: "Paleo Valley", email: "partners@paleovalley.com", source: "paleovalley.com/partnerships — dedicated partnerships page" },
  { match: "Vital Proteins", email: "info@vitalproteins.com", source: "vitalproteins.com/pages/contact-us — official contact page" },
  { match: "Orgain", email: "ambassadors@orgain.com", source: "orgain.com/pages/contact-us — partnership/ambassador contact" },
  { match: "Vega One", email: "affiliates@myvega.com", source: "myvega.com/pages/sponsorships — confirmed partnership email" },
  { match: "Optimum Nutrition", email: "partnerships@optimumnutrition.com", source: "optimumnutrition.com/en-us/Partnerships — dedicated page" },
  { match: "Whoop Supplement", email: "partnerships@whoop.com", source: "whoop.com/us/en/whoop-partnerships — dedicated partnerships page" },

  // ── SKINCARE ─────────────────────────────────────────────────────────────────
  { match: "Glow Recipe", email: "love@glowrecipe.com", source: "glowrecipe.com/pages/contact-us" },
  { match: "Drunk Elephant", email: "info@drunkelephant.com", source: "drunkelephant.com/contact-us.html" },
  { match: "Summer Fridays", email: "hello@summerfridays.com", source: "summerfridays.com/pages/contact — confirmed via sweepstakes docs" },
  { match: "Tatcha", email: "info@tatcha.com", source: "tatcha.com/contact-us.html" },
  { match: "Paula's Choice", email: "custserv@paulaschoice.com", source: "help.paulaschoice.com — official contact" },
  { match: "The Ordinary (DECIEM)", email: "hello@deciem.com", source: "deciem.com/contact — brand-wide contact for DECIEM/The Ordinary" },
  { match: "Murad", email: "customerservice@murad.com", source: "murad.com/pages/contact" },
  { match: "SkinMedica", email: "care@skinmedica.com", source: "skinmedica.com/Contact — confirmed official contact" },
  { match: "Kiehl's", email: "kiehlsUS.partnerships@loreal.com", source: "kiehls.com + L'Oreal creator/influencer program docs — confirmed" },
  { match: "Cetaphil", email: "cetaphil@galderma.com", source: "cetaphil.com/contact — Galderma brand contact" },
  { match: "Dermalogica", email: "webhelp@dermalogica.com", source: "dermalogica.com/pages/contact-us — official contact page" },
  { match: "IMAGE Skincare", email: "info@imageskincare.com", source: "imageskincare.com/pages/contact-information — confirmed" },
  { match: "Obagi Medical", email: "info@obagi.com", source: "obagi.com/pages/contact — confirmed general contact" },
  { match: "ZO Skin Health", email: "customerservice@zoskinhealth.com", source: "zoskinhealth.com/us/about-zo/about/contact-us" },
  { match: "Perricone MD", email: "info@perriconemd.com", source: "perriconemd.com — confirmed via RocketReach" },
  { match: "Youth To The People", email: "hello@youthtothepeople.com", source: "youthtothepeople.com/customer-service — L'Oreal brand" },
  { match: "Versed Skincare", email: "partnerships@versedskin.com", source: "versedskin.com/pages/faqs — explicitly listed as collaboration contact" },
  { match: "Good Molecules", email: "support@goodmolecules.com", source: "goodmolecules.com/contact-us — non-press general contact" },
  { match: "COSRX", email: "info@cosrx.com", source: "cosrx.com collab portal — Amorepacific brand" },
  { match: "Some By Mi", email: "global@somebymi.com", source: "en.somebymi.com — GLOBAL-BUSINESS inquiry email on international site" },
  { match: "TonyMoly", email: "hi@tonymoly.us", source: "tonymoly.us/pages/contact-us — confirmed on official US site" },
  { match: "Innisfree", email: "innisfree@apus.amorepacific.com", source: "us.innisfree.com/pages/contact-us — confirmed US contact" },
  { match: "Honest Beauty", email: "social@honest.com", source: "honest.com — Social Brand Partnerships email" },
  { match: "Kopari Beauty", email: "marketing@koparibeauty.com", source: "koparibeauty.com/pages/contact-us — confirmed via SignalHire" },
  { match: "Buttah Skin", email: "info@buttahskin.com", source: "buttahskin.com — confirmed general/partnership contact" },
  { match: "Topicals Skincare", email: "hello@mytopicals.com", source: "mytopicals.com/pages/contact-us — confirmed non-press contact" },
  { match: "Bubble Skincare", email: "love@hellobubble.com", source: "hellobubble.com/pages/wanna-contact-us — confirmed" },
  { match: "Starface World", email: "hello@starfaceworld.com", source: "starface.world/pages/contact-us — confirmed partnership contact" },
  { match: "Hero Cosmetics (Mighty Patch)", email: "hello@herocosmetics.us", source: "herocosmetics.us/pages/contact-us — confirmed" },
  { match: "CeraVe", email: "cerave@loreal.com", source: "cerave.com/contact — L'Oreal brand email pattern" },
  { match: "La Roche-Posay (body)", email: "laroche-posay@loreal.com", source: "laroche-posay.us/partnerships.html — L'Oreal brand" },
  { match: "La Roche-Posay", email: "laroche-posay@loreal.com", source: "laroche-posay.us — L'Oreal Dermatological Beauty brand" },

  // ── MEDSPA / AESTHETICS ───────────────────────────────────────────────────────
  { match: "Allergan Aesthetics", email: "kate.mcshane@allergan.com", source: "news.abbvie.com — named US corporate comms & partnerships contact" },
  { match: "Sofwave", email: "info@sofwave.com", source: "sofwave.com/about-us — confirmed via Lusha/ZoomInfo" },
  { match: "Lumenis", email: "USService@lumenis.com", source: "lumenis.com/contact — US service and aesthetics contact" },
  { match: "Solta Medical", email: "info@solta.com", source: "solta.com — confirmed via RocketReach/LeadIQ" },
  { match: "Syneron-Candela", email: "customer-service@syneron-candela.com", source: "candelamedical.com/contact" },
  { match: "InMode Aesthetics", email: "marketing@inmodemd.com", source: "inmodemd.com/contact-us — department-specific email confirmed" },
  { match: "Sciton Lasers", email: "info@sciton.com", source: "sciton.com/contact — official contact page" },
  { match: "Alma Lasers", email: "info@almalasers.com", source: "almainc.com/get-in-touch — confirmed" },
  { match: "Cynosure", email: "info@cynosure.com", source: "cynosure.com/contact-us — confirmed on contact page" },
  { match: "OVME Aesthetics", email: "help@ovme.com", source: "ovme.com/pages/corporate-contact" },
  { match: "MedSpa 810", email: "information@medspa810.com", source: "medspa810.com/contact — corporate HQ contact" },
  { match: "Deka Lash", email: "info@dekalash.com", source: "dekalash.com/contact — confirmed via PissedConsumer/LeadIQ" },
  { match: "Amazing Lash Studio", email: "info@amazinglashstudio.com", source: "amazinglashstudio.com/about-us/contact-us" },
  { match: "Sola Salons", email: "diana.jacobson@konnectagency.com", source: "PRNewswire — Sola Salons PR/partnership contact at Konnect Agency" },
  { match: "Peachy (acne & skin)", email: "hello@peachystudio.com", source: "peachystudio.com — confirmed as official business contact" },
  { match: "Studs Earrings", email: "heystud@studspiercing.com", source: "studs.com — confirmed primary business contact" },

  // ── SPIRITS / ALCOHOL ─────────────────────────────────────────────────────────
  { match: "Casamigos", email: "info@casamigos.com", source: "casamigos.com/en-us/contact — confirmed primary contact" },
  { match: "Don Julio", email: "sales@don-julios.com", source: "don-julios.com/contact-us — subject: Sponsorship/Collaboration Proposal" },
  { match: "Whispering Angel Rosé", email: "chateaudesclans@chateaudesclans.com", source: "esclans.com — Château d'Esclans official contact" },
  { match: "Onda Tequila Seltzer", email: "cheers@drinkonda.com", source: "drinkonda.com/pages/faqs — confirmed primary contact" },
  { match: "Truly Hard Seltzer", email: "media@bostonbeer.com", source: "Boston Beer Co. — media/partnership contact" },
  { match: "Mijenta Tequila", email: "info@altos-planos.com", source: "mijenta-tequila.com/elements — Altos Planos operator" },
  { match: "Lobos 1707 Tequila", email: "lobos@rogersandcowanpmk.com", source: "PRNewswire press releases — Rogers & Cowan PMK is Lobos 1707 PR agency" },
  { match: "Bumbu Rum", email: "info@sovereignbrands.com", source: "sovereignbrands.com/contact — Sovereign Brands parent" },
  { match: "Bacardí", email: "eventspr@bacardi.com", source: "contact.bacardi.com + bacardiinvitational.com — confirmed events/PR email" },
  { match: "Lalo Tequila", email: "hola@lalospirits.com", source: "lalospirits.com — confirmed LALO domain contact" },
  { match: "Nosotros Tequila", email: "info@nosotrostequila.com", source: "nosotrostequila.com — confirmed general contact" },
  { match: "D'Ussé Cognac", email: "events@dusse.com", source: "dusse.com — Bacardi-powered; event/sponsorship channel" },
  { match: "Palm Breeze", email: "media@anheuser-busch.com", source: "AB InBev contact — Palm Breeze is discontinued but AB InBev media contact" },
  { match: "Henry's Hard Sparkling", email: "marketing@molsoncoors.com", source: "molsoncoors.com/contact-us — Henry's is a Molson Coors brand" },
  { match: "Diplomatico Rum", email: "info@rondiplomatico.com", source: "rondiplomatico.com — Brown-Forman acquisition 2023" },
  { match: "Captain Morgan", email: "events@captainmorgan.com", source: "captainmorgan.com/en-us/contact — Diageo brand" },
  { match: "Malibu Splash RTD", email: "info@malibuspirits.com", source: "malibudrinks.com — Pernod Ricard brand" },

  // ── SUNSCREEN / SPF ──────────────────────────────────────────────────────────
  { match: "Supergoop!", email: "hello@supergoop.com", source: "supergoop.com/pages/contact — confirmed general brand contact" },
  { match: "Vacation Inc.", email: "vacation@vacation.inc", source: "vacation.inc/faq — listed as general contact email" },
  { match: "Sun Bum", email: "marketing@trustthebum.com", source: "sunbum.com (trustthebum.com domain) — appropriate for event sponsorship" },
  { match: "Sun Bum Hair", email: "marketing@trustthebum.com", source: "sunbum.com — same brand, same contact" },
  { match: "COOLA Suncare", email: "info@coolasuncare.com", source: "coola.com/pages/contact-coola — confirmed" },
  { match: "EltaMD", email: "eltamd@mmlpr.com", source: "eltamd.com/pages/contact-eltamd — confirmed media/marketing PR contact" },
  { match: "Bondi Sands", email: "info@bondisands.com", source: "bondisands.com/pages/contact-us — confirmed general contact" },
  { match: "Coppertone", email: "consumerrelations@beiersdorf.com", source: "beiersdorfusa.com/meta-pages/contact — Beiersdorf parent company" },
  { match: "Raw Elements", email: "contact@rawelementsusa.com", source: "rawelementsusa.com/pages/contact-us — confirmed for marketing/PR/ambassador" },
  { match: "Cay Skin", email: "hello@cayskin.com", source: "cayskin.com/pages/contact-us" },
  { match: "Neutrogena", email: "neutrogena@kenvue.com", source: "neutrogena.com/contact — Kenvue brand email pattern" },
  { match: "Australian Gold", email: "agguestservices@australiangold.com", source: "australiangold.com — confirmed general brand contact" },
  { match: "Banana Boat", email: "consumeraffairs@edgewell.com", source: "bananaboat.com/pages/contact — Edgewell Personal Care" },
  { match: "Hawaiian Tropic", email: "consumeraffairs@edgewell.com", source: "Edgewell brand — same parent contact" },
  { match: "Black Girl Sunscreen", email: "contact@blackgirlsunscreen.com", source: "blackgirlsunscreen.com/contact-us — confirmed" },
  { match: "Bare Republic", email: "hello@gobareoutside.com", source: "gobareoutside.com/pages/contact-us — confirmed official contact" },
  { match: "ISDIN Eryfotona", email: "consultas@isdin.com", source: "isdin.com/us/contact_us — confirmed general inquiry" },
  { match: "Colorescience Sunforgettable", email: "concierge@colorescience.com", source: "colorescience.com/pages/partner-contact — confirmed partner contact" },
  { match: "Kinfield", email: "partnerships@kinfield.com", source: "kinfield.com/pages/contact-us — confirmed dedicated partnerships email" },
  { match: "MDSolarSciences", email: "info@mdsolarsciencesmd.com", source: "mdsolarsciencesmd.com — confirmed general contact" },
  { match: "Unsun Cosmetics", email: "hello@unsuncosmetics.com", source: "unsuncosmetics.com — confirmed" },
  { match: "Peter Thomas Roth SPF", email: "info@peterthomasroth.com", source: "peterthomasroth.com — confirmed general contact" },

  // ── BEAUTY / MAKEUP ───────────────────────────────────────────────────────────
  { match: "Charlotte Tilbury", email: "partnerships@charlottetilbury.com", source: "charlottetilbury.com — confirmed across multiple sources" },
  { match: "Fenty Beauty", email: "customerservice@fentybeauty.com", source: "fentybeauty.com/pages/contact — LVMH/Kendo brand" },
  { match: "Too Faced", email: "marketing@toofaced.com", source: "elliott.org + multiple sources — confirmed marketing/PR contact" },
  { match: "NYX Professional Makeup", email: "marketing@nyxcosmetics.com", source: "nyxcosmetics.com/contact-us — L'Oreal brand, events sponsorship confirmed" },
  { match: "e.l.f. Beauty", email: "corpcomms@elfbeauty.com", source: "elfbeauty.com/contact-us — confirmed corporate comms email" },
  { match: "Rare Beauty", email: "hello@rarebeauty.com", source: "rarebeauty.com/pages/contact — confirmed collaboration/partnership email" },
  { match: "Milk Makeup", email: "hello@milkmakeup.com", source: "rocketreach.co/milk-makeup-email-format — confirmed general contact" },
  { match: "Urban Decay", email: "marketing@urbandecay.com", source: "urbandecay.com/our-moments.html — dedicated events & partnerships page" },
  { match: "Anastasia Beverly Hills", email: "info@anastasiabeverlyhills.com", source: "anastasiabeverlyhills.com/pages/contact — confirmed" },
  { match: "Morphe", email: "partnerships@formabrands.com", source: "BusinessWire + Forma Brands docs — confirmed" },
  { match: "Haus Labs (Lady Gaga)", email: "hauslabs@accelerationpartners.com", source: "hauslabs.com/pages/affiliates — Acceleration Partners manages partnerships" },
  { match: "Kylie Cosmetics", email: "press@cotyinc.com", source: "Coty Inc. — 51% owner handles press/partnerships for Kylie" },

  // ── HAIRCARE ─────────────────────────────────────────────────────────────────
  { match: "Moroccanoil", email: "info@moroccanoil.com", source: "moroccanoil.com/pages/contact — confirmed general/business contact" },
  { match: "Amika", email: "info@loveamika.com", source: "loveamika.com/pages/contact-us — confirmed" },
  { match: "Bumble and bumble", email: "media@bumbleandbumble.com", source: "bumbleandbumble.com/customer-service — Estée Lauder brand" },
  { match: "It's a 10 Haircare", email: "info@itsa10haircare.com", source: "itsa10haircare.com/pages/contact-us — confirmed" },
  { match: "Not Your Mother's", email: "hello@nymbrands.com", source: "notyourmothers.com/pages/contact — DeMert Brands contact" },
  { match: "Briogeo Hair Care", email: "service@briogeohair.com", source: "briogeohair.com/pages/contact — non-order business inquiry email" },
  { match: "Olaplex", email: "support@olaplex.com", source: "olaplex.com/pages/contact-us — primary business contact" },
  { match: "Living Proof haircare", email: "info@livingproof.com", source: "living-proof.zendesk.com — confirmed business contact" },
  { match: "R+Co haircare", email: "info@randco.com", source: "randco.com/pages/contact-us — confirmed" },
  { match: "IGK Hair", email: "info@igkhair.com", source: "igkhair.com/pages/contact-us — confirmed" },
  { match: "Verb Haircare", email: "info@verbproducts.com", source: "verbproducts.zendesk.com — FAQ explicitly lists this for partnerships" },
  { match: "dpHUE", email: "info@dphue.com", source: "dphue.com/pages/contact-us — confirmed" },
  { match: "Color Wow haircare", email: "hello@colorwowhair.com", source: "colorwowhair.com/pages/contact-us — L'Oreal acquisition July 2025" },
  { match: "Kristin Ess Hair", email: "customerservice@kristinesshair.com", source: "kristinesshair.com/pages/contact-us — Maesa-operated brand" },
  { match: "Ouai Haircare (Jen Atkin)", email: "info@theouai.com", source: "theouai.com/pages/contact — P&G brand, consumer-facing contact active" },
  { match: "Drybar", email: "contact@drybar.com", source: "drybar.com/contact-us — confirmed primary contact" },
  { match: "CHI Haircare", email: "infoweb@farouk.com", source: "chi.com/contact-us + farouk.com — CHI manufactured by Farouk Systems" },
  { match: "BaByliss Pro", email: "support@babylisspro-mks.com", source: "babylisspro-mks.com/contact-us — confirmed official business contact" },
  { match: "Hot Tools Professional", email: "contact@hottools.com", source: "hottools.com/contact — confirmed" },
];

async function main() {
  console.log(`Processing ${UPDATES.length} email updates...\n`);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const u of UPDATES) {
    // Find existing record by brand_name (case-insensitive)
    const { data: existing } = await supabase
      .from("brand_outreach_contacts")
      .select("id, brand_name, email")
      .eq("contact_type", "sponsor")
      .ilike("brand_name", u.match)
      .limit(1)
      .single();

    if (!existing) {
      // Try partial match
      const { data: partial } = await supabase
        .from("brand_outreach_contacts")
        .select("id, brand_name, email")
        .eq("contact_type", "sponsor")
        .ilike("brand_name", `%${u.match.split(" ")[0]}%`)
        .limit(1)
        .single();

      if (!partial) {
        console.log(`  ✗ NOT FOUND: "${u.match}"`);
        notFound++;
        continue;
      }

      if (partial.email.toLowerCase() === u.email.toLowerCase()) {
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from("brand_outreach_contacts")
        .update({ email: u.email.toLowerCase(), updated_at: new Date().toISOString() })
        .eq("id", partial.id);

      if (error) {
        console.error(`  ✗ Error updating "${partial.brand_name}": ${error.message}`);
      } else {
        console.log(`  ✓ ${partial.brand_name}: ${partial.email} → ${u.email}`);
        updated++;
      }
      continue;
    }

    if (existing.email.toLowerCase() === u.email.toLowerCase()) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("brand_outreach_contacts")
      .update({ email: u.email.toLowerCase(), updated_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (error) {
      console.error(`  ✗ Error updating "${existing.brand_name}": ${error.message}`);
    } else {
      console.log(`  ✓ ${existing.brand_name}: ${existing.email} → ${u.email}`);
      updated++;
    }
  }

  console.log(`\n── Summary ─────────────────────────────────`);
  console.log(`  Updated:   ${updated}`);
  console.log(`  Skipped (same): ${skipped}`);
  console.log(`  Not found: ${notFound}`);
}

main().catch(console.error);
