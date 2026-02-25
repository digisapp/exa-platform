/**
 * Seeds Miami Swim Week 2026 potential sponsors into brand_outreach_contacts
 * with contact_type = 'sponsor' so they appear in the Sponsors tab
 *
 * Run with: npx ts-node scripts/add-msw-sponsors.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SPONSORS = [
  // ── Sunscreen / SPF ──────────────────────────────────────────────────────────
  { brand_name: "Supergoop!", email: "press@supergoop.com", category: "sunscreen" },
  { brand_name: "Vacation Inc.", email: "hello@vacationsuncare.com", category: "sunscreen" },
  { brand_name: "Sun Bum", email: "press@sunbum.com", category: "sunscreen" },
  { brand_name: "COOLA Suncare", email: "press@coolasuncare.com", category: "sunscreen" },
  { brand_name: "EltaMD", email: "pr@eltamd.com", category: "sunscreen" },
  { brand_name: "Bondi Sands", email: "press@bondisands.com.au", category: "sunscreen" },
  { brand_name: "La Roche-Posay", email: "press@larocheposay.com", category: "sunscreen" },
  { brand_name: "Coppertone", email: "press@coppertone.com", category: "sunscreen" },
  { brand_name: "Raw Elements", email: "hello@rawelementssuncare.com", category: "sunscreen" },
  { brand_name: "Cay Skin", email: "press@cayskin.com", category: "sunscreen", notes: "Michelle Obama's SPF brand" },

  // ── Skincare ─────────────────────────────────────────────────────────────────
  { brand_name: "Glow Recipe", email: "press@glowrecipe.com", category: "skincare" },
  { brand_name: "Drunk Elephant", email: "press@drunkelephant.com", category: "skincare" },
  { brand_name: "Summer Fridays", email: "press@summerfridays.com", category: "skincare" },
  { brand_name: "Tatcha", email: "press@tatcha.com", category: "skincare" },
  { brand_name: "Paula's Choice", email: "press@paulaschoice.com", category: "skincare" },
  { brand_name: "The Ordinary (DECIEM)", email: "press@deciem.com", category: "skincare" },
  { brand_name: "Murad", email: "press@murad.com", category: "skincare" },
  { brand_name: "SkinMedica", email: "press@skinmedica.com", category: "skincare" },
  { brand_name: "Kiehl's", email: "press@kiehls.com", category: "skincare" },
  { brand_name: "Cetaphil", email: "mediarelations@galderma.com", category: "skincare" },

  // ── Haircare ─────────────────────────────────────────────────────────────────
  { brand_name: "Moroccanoil", email: "press@moroccanoil.com", category: "haircare" },
  { brand_name: "Amika", email: "press@amikahair.com", category: "haircare" },
  { brand_name: "Bumble and bumble", email: "press@bumbleandbumble.com", category: "haircare" },
  { brand_name: "It's a 10 Haircare", email: "press@itsa10haircare.com", category: "haircare" },
  { brand_name: "Not Your Mother's", email: "press@notyourmothers.com", category: "haircare" },
  { brand_name: "Sun Bum Hair", email: "press@sunbum.com", category: "haircare", notes: "Sun Bum hair line — same press contact" },

  // ── Beverages ─────────────────────────────────────────────────────────────────
  { brand_name: "Liquid Death", email: "press@liquiddeath.com", category: "beverage" },
  { brand_name: "Poppi", email: "press@drinkpoppi.com", category: "beverage" },
  { brand_name: "Olipop", email: "press@drinkolipop.com", category: "beverage" },
  { brand_name: "Celsius", email: "press@celsius.com", category: "beverage" },
  { brand_name: "Vita Coco", email: "press@vitacoco.com", category: "beverage" },
  { brand_name: "Bodyarmor", email: "press@drinkbodyarmor.com", category: "beverage" },
  { brand_name: "Nuun Hydration", email: "press@nuunlife.com", category: "beverage" },
  { brand_name: "Coco5", email: "info@coco5.com", category: "beverage" },
  { brand_name: "Bai Brands", email: "press@drinkbai.com", category: "beverage" },

  // ── Spirits / Alcohol ─────────────────────────────────────────────────────────
  { brand_name: "Casamigos", email: "press@casamigos.com", category: "spirits" },
  { brand_name: "Patrón Tequila", email: "press@patronspirits.com", category: "spirits" },
  { brand_name: "Don Julio", email: "press@donjulio.com", category: "spirits" },
  { brand_name: "Whispering Angel Rosé", email: "press@whisperingangel.com", category: "spirits" },
  { brand_name: "Onda Tequila Seltzer", email: "hello@drinkonda.com", category: "spirits" },
  { brand_name: "Malibu", email: "press@malibu.com", category: "spirits" },
  { brand_name: "White Claw", email: "press@whiteclaw.com", category: "spirits" },
  { brand_name: "Truly Hard Seltzer", email: "press@trulyhardselter.com", category: "spirits" },
  { brand_name: "Cîroc", email: "press@ciroc.com", category: "spirits" },

  // ── Wellness / Health ─────────────────────────────────────────────────────────
  { brand_name: "AG1 (Athletic Greens)", email: "press@athleticgreens.com", category: "wellness" },
  { brand_name: "Ritual", email: "press@ritual.com", category: "wellness" },
  { brand_name: "Hum Nutrition", email: "press@humnutrition.com", category: "wellness" },
  { brand_name: "Thorne", email: "press@thorne.com", category: "wellness" },
  { brand_name: "Goop", email: "press@goop.com", category: "wellness" },
  { brand_name: "Sakara Life", email: "press@sakara.com", category: "wellness" },
  { brand_name: "Care/of", email: "press@takecareof.com", category: "wellness" },

  // ── Beauty / Makeup ───────────────────────────────────────────────────────────
  { brand_name: "Charlotte Tilbury", email: "press@charlottetilbury.com", category: "beauty" },
  { brand_name: "Fenty Beauty", email: "press@fentybeauty.com", category: "beauty" },
  { brand_name: "NARS Cosmetics", email: "press@narscosmetics.com", category: "beauty" },
  { brand_name: "Too Faced", email: "press@toofaced.com", category: "beauty" },
  { brand_name: "Benefit Cosmetics", email: "press@benefitcosmetics.com", category: "beauty" },
  { brand_name: "NYX Professional Makeup", email: "press@nyxcosmetics.com", category: "beauty" },
  { brand_name: "e.l.f. Beauty", email: "press@elfcosmetics.com", category: "beauty" },
  { brand_name: "Rare Beauty", email: "press@rarebeauty.com", category: "beauty" },

  // ── Med Spa / Aesthetics ──────────────────────────────────────────────────────
  { brand_name: "Allergan Aesthetics (Botox/Juvederm)", email: "press@allergan.com", category: "medspa" },
  { brand_name: "HydraFacial", email: "press@hydrafacial.com", category: "medspa" },
  { brand_name: "Cutera", email: "info@cutera.com", category: "medspa" },
  { brand_name: "BTL Aesthetics", email: "info@btlaesthetics.com", category: "medspa" },
  { brand_name: "Sofwave", email: "info@sofwave.com", category: "medspa" },
  { brand_name: "Lumenis", email: "press@lumenis.com", category: "medspa" },
];

async function main() {
  console.log(`Adding ${SPONSORS.length} potential sponsors...`);

  // Check for existing emails to avoid duplicates
  const emails = SPONSORS.map(s => s.email.toLowerCase());
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing || []).map(r => r.email.toLowerCase()));
  const toInsert = SPONSORS.filter(s => !existingEmails.has(s.email.toLowerCase()));

  if (toInsert.length === 0) {
    console.log("All sponsors already in DB.");
    return;
  }

  const rows = toInsert.map(s => ({
    brand_name: s.brand_name,
    contact_name: null,
    email: s.email.toLowerCase(),
    email_type: "press",
    category: s.category,
    notes: (s as any).notes || null,
    contact_type: "sponsor",
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .insert(rows)
    .select("id, brand_name, email, category");

  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }

  console.log(`\nInserted ${data?.length ?? 0} sponsors:\n`);

  const byCategory: Record<string, typeof data> = {};
  data?.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category]!.push(r);
  });

  Object.entries(byCategory).forEach(([cat, items]) => {
    console.log(`  ${cat.toUpperCase()} (${items?.length})`);
    items?.forEach(r => console.log(`    ✓ ${r.brand_name} <${r.email}>`));
  });

  if (existingEmails.size > 0) {
    console.log(`\nSkipped (already in DB): ${existingEmails.size}`);
  }
}

main().catch(console.error);
