/**
 * Re-adds brand outreach contacts with corrected emails (previously bounced)
 * Inserts them with status "new" so the bulk sender will pick them up
 *
 * Run with: npx ts-node scripts/readd-corrected-brands.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Brands with confirmed updated emails (old email bounced → new email found)
const CORRECTED_CONTACTS = [
  { brand_name: "Sarda", contact_name: null, email: "contacten@sardaworld.com", category: "swimwear", notes: "Formerly Andres Sarda, rebranded 2025" },
  { brand_name: "Cortana", contact_name: null, email: "transcortana@cortana.es", category: "swimwear", notes: "Updated from info@cortana.es" },
  { brand_name: "Chantelle", contact_name: null, email: "customersupport@chantelle.com", category: "swimwear", notes: "Updated from chantelle@chantelle.com" },
  { brand_name: "Opaak", contact_name: null, email: "press@opaak.de", category: "swimwear", notes: "Updated from customerservice@opaak.de" },
  { brand_name: "Natasha Tonic", contact_name: null, email: "info@natashatonic.com", category: "swimwear", notes: "Updated from hello@natashatonic.com" },
  { brand_name: "LESET", contact_name: null, email: "press@leset.com", category: "swimwear", notes: "Updated from contact@leset.com" },
  { brand_name: "Camilla", contact_name: null, email: "collaboration@camilla.com.au", category: "swimwear", notes: "Updated from pr@camilla.com" },
  { brand_name: "Sundia Swimwear", contact_name: null, email: "sundiacollabs@gmail.com", category: "swimwear", notes: "Updated from info@sundiaswimwear.com" },
  { brand_name: "Hale Bob", contact_name: null, email: "concierge@halebob.com", category: "swimwear", notes: "Updated from customerservice@halebob.com" },
  { brand_name: "Gooseberry Intimates", contact_name: null, email: "connect@gooseberryintimates.com", category: "swimwear", notes: "Updated from support@gooseberryintimates.com" },
  { brand_name: "Agent Provocateur", contact_name: null, email: "press@agentprovocateur.com", category: "luxury", notes: "Updated from customercare@agentprovocateur.com" },
  { brand_name: "Wolford", contact_name: null, email: "press@wolford.com", category: "luxury", notes: "Updated from ingola.metz@wolford.com (personal contact)" },
  { brand_name: "Natori", contact_name: null, email: "press@natori.com", category: "swimwear", notes: "Updated from customerservice@natori.com" },
  { brand_name: "Sinesia Karol", contact_name: null, email: "business@sinesiakarol.com", category: "swimwear", notes: "Updated from info@sinesiakarol.com" },
  { brand_name: "Mars The Label", contact_name: null, email: "help@marsthelabel.com", category: "swimwear", notes: "Updated from hello@marsthelabel.com" },
  { brand_name: "Salty Mermaid", contact_name: null, email: "mermaids@saltymermaid.com", category: "swimwear", notes: "Updated from hello@saltymermaid.com" },
  { brand_name: "Hanky Panky", contact_name: null, email: "contact-us@hankypanky.com", category: "swimwear", notes: "Updated from info@hankypanky.com" },
  { brand_name: "Negative Underwear", contact_name: null, email: "hello@negativeunderwear.com", category: "swimwear", notes: "Updated from hi@negativeunderwear.com" },
  { brand_name: "LIVY", contact_name: null, email: "bonjour@li-vy.com", category: "luxury", notes: "Updated from lisa.chavy@li-vy.com (founder personal)" },
  { brand_name: "Zemra Swim", contact_name: null, email: "love@zemraswim.com", category: "swimwear", notes: "Updated from info@zemraswim.com" },
  { brand_name: "Solid & Striped", contact_name: null, email: "press@solidandstriped.com", category: "swimwear", notes: "Updated from customerservice@solidandstriped.com" },
  { brand_name: "Monday Swimwear", contact_name: null, email: "collab@mondayswimwear.com", category: "swimwear", notes: "Updated from support@mondayswimwear.com" },
  { brand_name: "Cupshe", contact_name: null, email: "press@cupshe.com", category: "swimwear", notes: "Updated from frankchesska@cupshe.com (personal contact)" },
  { brand_name: "Maaji", contact_name: null, email: "info@maaji.co", category: "swimwear", notes: "Updated from paulinam@maaji.co (personal contact)" },
  { brand_name: "Beach Bunny Swimwear", contact_name: null, email: "info@beachbunnyswimwear.com", category: "swimwear", notes: "Updated from press@beachbunnyswimwear.com" },
  { brand_name: "Norma Kamali", contact_name: null, email: "info@normakamali.com", category: "swimwear", notes: "Updated from customerservice@normakamali.com" },
  { brand_name: "Agua Bendita", contact_name: null, email: "contact@aguabendita.com", category: "swimwear", notes: "Updated from servicioalcliente@aguabendita.com" },
];

async function main() {
  console.log(`Re-adding ${CORRECTED_CONTACTS.length} contacts with corrected emails...`);

  // Check which emails already exist in DB (to avoid duplicates)
  const emails = CORRECTED_CONTACTS.map(c => c.email.toLowerCase());
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing || []).map(r => r.email.toLowerCase()));
  const toInsert = CORRECTED_CONTACTS.filter(c => !existingEmails.has(c.email.toLowerCase()));

  if (toInsert.length === 0) {
    console.log("All contacts already exist in DB. Nothing to insert.");
    return;
  }

  const rows = toInsert.map(c => ({
    brand_name: c.brand_name,
    contact_name: c.contact_name,
    email: c.email.toLowerCase(),
    email_type: "pr",
    category: c.category,
    notes: c.notes,
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .insert(rows)
    .select("id, brand_name, email");

  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }

  console.log(`\nInserted ${data?.length ?? 0} contacts:`);
  data?.forEach(c => console.log(`  ✓ ${c.brand_name} <${c.email}>`));

  if (existingEmails.size > 0) {
    console.log(`\nSkipped (already in DB):`);
    CORRECTED_CONTACTS
      .filter(c => existingEmails.has(c.email.toLowerCase()))
      .forEach(c => console.log(`  - ${c.brand_name} <${c.email}>`));
  }
}

main().catch(console.error);
