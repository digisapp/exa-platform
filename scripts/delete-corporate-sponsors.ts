import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Brands owned by mega-corporations (Diageo, LVMH, Bacardí, Pernod Ricard,
// Constellation, L'Oreal, Estée Lauder, Coty, Shiseido, PepsiCo, Monster,
// Starbucks, Unilever, Nestlé, Kraft Heinz, Google) — too big to sponsor locally
const TO_DELETE = [
  // Spirits conglomerates
  "Don Julio", "Casamigos", "Cîroc", "Grey Goose", "Absolut Vodka",
  "Patrón Tequila", "Jose Cuervo", "Modelo", "Corona Extra", "Malibu",
  "White Claw", "Truly Hard Seltzer", "Tito's Handmade Vodka", "Aperol",
  "Hendrick's Gin", "Ketel One Botanical", "Espolòn Tequila", "1800 Tequila",
  "Tequila Herradura", "Blue Moon Brewing", "Lagunitas Brewing",
  "Diplomatico Rum", "Vizzy Hard Seltzer",

  // Beauty/makeup conglomerates (L'Oreal, Estée Lauder, LVMH, Coty, Shiseido)
  "L'Oreal Paris", "Maybelline", "Covergirl", "MAC Cosmetics",

  // Beverage giants (PepsiCo, Monster, Starbucks, Unilever)
  "Red Bull", "Monster Energy", "Celsius", "Rockstar Energy", "Starbucks Baya Energy",

  // Wellness giants (Nestlé, Kraft Heinz, Google, PepsiCo)
  "Garden of Life Sport", "Garden of Life", "Vital Proteins Collagen",
  "Orgain Nutrition", "Fairlife Nutrition Plan", "Primal Kitchen",
  "Fitbit (Google)", "Muscle Milk",
];

let deleted = 0;
let notFound = 0;

for (const name of TO_DELETE) {
  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .delete()
    .eq("contact_type", "sponsor")
    .ilike("brand_name", name)
    .select("brand_name");

  if (error) { console.error(`Error deleting "${name}":`, error.message); continue; }

  if (!data || data.length === 0) {
    console.log(`  ✗ Not found: "${name}"`);
    notFound++;
  } else {
    console.log(`  ✓ Deleted: ${data.map(r => r.brand_name).join(", ")}`);
    deleted += data.length;
  }
}

const { count } = await supabase.from("brand_outreach_contacts").select("id", { count: "exact", head: true }).eq("contact_type", "sponsor");
console.log(`\n── Summary ──────────────────────────`);
console.log(`  Deleted:   ${deleted}`);
console.log(`  Not found: ${notFound}`);
console.log(`  Remaining: ${count} sponsors`);
