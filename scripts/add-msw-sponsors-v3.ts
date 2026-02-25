/**
 * Final top-up to reach 500+ sponsors
 * Run with: npx ts-node scripts/add-msw-sponsors-v3.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SPONSORS = [
  // ── More Med Spas ─────────────────────────────────────────────────────────────
  { brand_name: "Skin by Lovely", email: "info@skinbylovely.com", category: "medspa", notes: "Boca Raton / South Florida" },
  { brand_name: "Brickell Medical Center", email: "info@brickellmedical.com", category: "medspa", notes: "Miami" },
  { brand_name: "Alchemy Medspa Miami", email: "hello@alchemymedspa.com", category: "medspa", notes: "Miami Beach" },
  { brand_name: "Skin & Beam", email: "info@skinandbeam.com", category: "medspa", notes: "Miami" },
  { brand_name: "OVME Aesthetics", email: "press@ovme.com", category: "medspa", notes: "National chain" },
  { brand_name: "Skin Bar NYC", email: "info@skinbarnyc.com", category: "medspa", notes: "New York" },
  { brand_name: "MedSpa 810", email: "info@medspa810.com", category: "medspa", notes: "National franchise chain" },
  { brand_name: "National Laser Institute", email: "info@nlionline.com", category: "medspa", notes: "Scottsdale + national" },
  { brand_name: "Silk Touch Med Spa", email: "info@silktouchmedspa.com", category: "medspa", notes: "Boise / national" },
  { brand_name: "Cosmetic Laser Dermatology", email: "info@clderm.com", category: "medspa", notes: "San Diego" },
  { brand_name: "Wax Center (European Wax Center)", email: "press@waxcenter.com", category: "medspa", notes: "National wax chain" },
  { brand_name: "Deka Lash", email: "press@dekalash.com", category: "medspa", notes: "Lash extensions franchise" },
  { brand_name: "Amazing Lash Studio", email: "press@amazinglashstudio.com", category: "medspa" },
  { brand_name: "Blo Blow Dry Bar", email: "press@blomedry.com", category: "medspa", notes: "Blowout franchise" },
  { brand_name: "Sola Salons", email: "press@solasalons.com", category: "medspa" },
  { brand_name: "Studs Earrings", email: "press@studs.com", category: "medspa", notes: "Piercing studio chain — trendy" },
  { brand_name: "Grazia Aesthetics", email: "info@graziaaesthetics.com", category: "medspa", notes: "Dallas TX" },
  { brand_name: "Aesthetica Med Spa", email: "info@aestheticamedspa.com", category: "medspa", notes: "LA / national" },
  { brand_name: "Younique Boutique", email: "press@youniqueproducts.com", category: "medspa" },
  { brand_name: "Peachy (acne & skin)", email: "press@getpeachy.com", category: "medspa", notes: "NYC acne medspa chain" },
  { brand_name: "Spring MedSpa", email: "info@springmedspa.com", category: "medspa", notes: "Palm Beach / Miami" },
  { brand_name: "The Clear Clinic", email: "info@theclearclinic.com", category: "medspa", notes: "Acne specialists" },
  { brand_name: "Hydrafacial HQ (BeautyHealth)", email: "press@beautyhealth.com", category: "medspa" },

  // ── More Wellness / Supplements ───────────────────────────────────────────────
  { brand_name: "mindbodygreen", email: "press@mindbodygreen.com", category: "wellness", notes: "Wellness media + supplements" },
  { brand_name: "Whoop Supplement", email: "press@whoop.com", category: "wellness" },
  { brand_name: "Huel", email: "press@huel.com", category: "wellness", notes: "Complete nutrition brand" },
  { brand_name: "Ka'Chava", email: "press@kachava.com", category: "wellness" },
  { brand_name: "Soylent", email: "press@soylent.com", category: "wellness" },
  { brand_name: "Ample Foods", email: "hello@amplemeal.com", category: "wellness" },
  { brand_name: "Ascent Protein", email: "press@ascentprotein.com", category: "wellness" },
  { brand_name: "Evolve Protein", email: "press@evolveorganic.com", category: "wellness" },
  { brand_name: "Garden of Life Sport", email: "press@gardenoflife.com", category: "wellness" },
  { brand_name: "Amazing Grass", email: "press@amazinggrass.com", category: "wellness" },
  { brand_name: "Primal Kitchen", email: "press@primalkitchen.com", category: "wellness", notes: "Mark Sisson brand" },
  { brand_name: "RxBar", email: "press@rxbar.com", category: "wellness" },
  { brand_name: "Perfect Bar", email: "press@perfectbar.com", category: "wellness" },
  { brand_name: "LÄRABAR", email: "press@larabar.com", category: "wellness" },
  { brand_name: "This Bar Saves Lives", email: "press@thisbarsaveslives.com", category: "wellness" },
  { brand_name: "Barebells Protein Bar", email: "press@barebells.com", category: "wellness" },
  { brand_name: "Quest Nutrition", email: "press@questnutrition.com", category: "wellness" },
  { brand_name: "Built Bar", email: "press@builtbar.com", category: "wellness" },
  { brand_name: "Muscle Milk", email: "press@musclemilk.com", category: "wellness" },
  { brand_name: "Fairlife Nutrition Plan", email: "press@fairlife.com", category: "wellness" },
  { brand_name: "Isopure Protein", email: "press@theisopurecompany.com", category: "wellness" },
  { brand_name: "Body Armor SuperDrink", email: "press@drinkbodyarmor.com", category: "beverage" },

  // ── More Spirits ──────────────────────────────────────────────────────────────
  { brand_name: "Lalo Tequila", email: "press@drinklalo.com", category: "spirits", notes: "Celebrity tequila brand" },
  { brand_name: "Nosotros Tequila", email: "press@drinknos.com", category: "spirits" },
  { brand_name: "Mijenta Tequila", email: "press@mijenta.com", category: "spirits" },
  { brand_name: "Lobos 1707 Tequila", email: "press@lobos1707.com", category: "spirits", notes: "LeBron James brand" },
  { brand_name: "D'Ussé Cognac", email: "press@dusse.com", category: "spirits", notes: "Jay-Z brand" },
  { brand_name: "Bumbu Rum", email: "press@bumburum.com", category: "spirits" },
  { brand_name: "Diplomatico Rum", email: "press@diplomatico.com", category: "spirits" },
  { brand_name: "Bacardí", email: "press@bacardi.com", category: "spirits" },
  { brand_name: "Captain Morgan", email: "press@captainmorgan.com", category: "spirits" },
  { brand_name: "Malibu Splash RTD", email: "press@malibu.com", category: "spirits" },
  { brand_name: "Palm Breeze", email: "press@palmbreeze.com", category: "spirits" },
  { brand_name: "Bud Light Seltzer", email: "press@budlight.com", category: "spirits" },
  { brand_name: "Vizzy Hard Seltzer", email: "press@vizzyhardseltzer.com", category: "spirits" },
  { brand_name: "Topo Chico Hard Seltzer", email: "press@topochico.com", category: "spirits" },
  { brand_name: "Henry's Hard Sparkling", email: "press@henryshardsoda.com", category: "spirits" },

  // ── More Skincare ─────────────────────────────────────────────────────────────
  { brand_name: "Honest Beauty", email: "press@honest.com", category: "skincare", notes: "Jessica Alba brand" },
  { brand_name: "Kopari Beauty", email: "press@koparibeauty.com", category: "skincare" },
  { brand_name: "Buttah Skin", email: "press@buttahskin.com", category: "skincare", notes: "Melanin-focused skincare" },
  { brand_name: "Topicals Skincare", email: "press@topicals.com", category: "skincare" },
  { brand_name: "Bubble Skincare", email: "press@hellobubble.com", category: "skincare", notes: "Teen / Gen Z skincare" },
  { brand_name: "Starface World", email: "press@starface.world", category: "skincare", notes: "Acne patches, Gen Z brand" },
  { brand_name: "Peace Out Skincare", email: "press@peaceoutskincare.com", category: "skincare" },
  { brand_name: "Hero Cosmetics (Mighty Patch)", email: "press@herocosmetics.us", category: "skincare" },
  { brand_name: "CeraVe", email: "press@cerave.com", category: "skincare" },
  { brand_name: "La Roche-Posay (body)", email: "press@larocheposay.com", category: "skincare" },

  // ── Food / Snack Sponsors (Swim Week fuel) ─────────────────────────────────────
  { brand_name: "Chomps Beef Sticks", email: "press@chomps.com", category: "wellness" },
  { brand_name: "Epic Bar", email: "press@epicbar.com", category: "wellness" },
  { brand_name: "Caveman Foods", email: "press@cavemanfoods.com", category: "wellness" },
  { brand_name: "Siete Family Foods", email: "press@sietefoods.com", category: "wellness" },
  { brand_name: "Simple Mills", email: "press@simplemills.com", category: "wellness" },
  { brand_name: "Hu Kitchen", email: "press@hukitchen.com", category: "wellness" },
  { brand_name: "Justin's Nut Butter", email: "press@justins.com", category: "wellness" },
  { brand_name: "Aloha Protein", email: "press@aloha.com", category: "wellness" },
  { brand_name: "Vega One", email: "press@myvega.com", category: "wellness" },
  { brand_name: "Paleo Valley", email: "press@paleovalley.com", category: "wellness" },
];

async function main() {
  console.log(`Processing ${SPONSORS.length} additional sponsors...`);
  const emails = SPONSORS.map(s => s.email.toLowerCase());
  const { data: existing } = await supabase.from("brand_outreach_contacts").select("email").in("email", emails).eq("contact_type", "sponsor");
  const existingEmails = new Set((existing || []).map(r => r.email.toLowerCase()));
  const toInsert = SPONSORS.filter(s => !existingEmails.has(s.email.toLowerCase()));

  console.log(`New to insert: ${toInsert.length}`);
  if (toInsert.length === 0) { console.log("Nothing new."); return; }

  const rows = toInsert.map(s => ({
    brand_name: s.brand_name, contact_name: null, email: s.email.toLowerCase(),
    email_type: "press", category: s.category, notes: (s as any).notes || null,
    contact_type: "sponsor", status: "new",
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from("brand_outreach_contacts").insert(rows).select("id, brand_name, category");
  if (error) { console.error("Error:", error.message); process.exit(1); }
  console.log(`✓ Inserted ${data?.length} sponsors`);

  // Final count
  const { count } = await supabase.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("contact_type", "sponsor");
  console.log(`\nTotal sponsors in DB: ${count}`);
}
main().catch(console.error);
