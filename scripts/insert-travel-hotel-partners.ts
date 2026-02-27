import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

const SCRIPTS_DIR = path.join(process.cwd(), "scripts");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FILES = [
  "mexico-caribbean-hotels-outreach.json",
  "luxury-hotels-influencer-outreach.json",   // Bali/Maldives/SE Asia (round 1)
  "europe-luxury-hotels-influencer-outreach.json",
  "us-hotels-influencer-outreach.json",
  "latam-hotels-outreach.json",
  "dubai-hotels-outreach.json",
  // Round 2 — new regions
  "caribbean-islands-hotels.json",            // Turks & Caicos, St Barts, Jamaica, Anguilla, etc.
  "maldives-indian-ocean-hotels.json",        // More Maldives + Seychelles + Réunion
  "indonesia-hotels.json",                    // Bali (new), Lombok, Gili, Komodo, Sumba, Raja Ampat
  "thailand-vietnam-hotels.json",             // Thailand + Vietnam + Cambodia
  "brazil-southamerica-hotels.json",          // Brazil, Colombia, Bolivia, Suriname
  "mallorca-croatia-hotels.json",             // Mallorca, Ibiza, Menorca, Croatia, Montenegro, Slovenia
  "global-misc-hotels.json",                  // Iceland, Turkey, Portugal, Japan, Korea, Philippines, Egypt, Sri Lanka
  "morocco-africa-hotels.json",               // Morocco, South Africa, Kenya, Tanzania, Rwanda, Botswana
];

async function main() {
  // Get existing emails to avoid duplicates
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .eq("category", "travel");

  const existingEmails = new Set((existing || []).map((r: any) => r.email.toLowerCase().trim()));
  console.log(`Found ${existingEmails.size} existing travel partners`);

  const all: any[] = [];

  for (const file of FILES) {
    const p = path.join(SCRIPTS_DIR, file);
    if (!fs.existsSync(p)) { console.warn(`Missing: ${file}`); continue; }
    const data = JSON.parse(fs.readFileSync(p, "utf8"));
    console.log(`${file}: ${data.length} entries`);
    all.push(...data);
  }

  console.log(`Total from all files: ${all.length}`);

  // Deduplicate by email within the new batch
  const seen = new Set<string>();
  const toInsert: any[] = [];

  for (const h of all) {
    if (!h.email || !h.brand_name) continue;
    const emailKey = h.email.toLowerCase().trim();
    if (existingEmails.has(emailKey)) { console.log(`SKIP (exists): ${h.brand_name} <${h.email}>`); continue; }
    if (seen.has(emailKey)) { console.log(`SKIP (dupe): ${h.brand_name} <${h.email}>`); continue; }
    seen.add(emailKey);

    // Normalize instagram_handle — strip @ prefix if present
    let ig = h.instagram_handle || null;
    if (ig && ig.startsWith("@")) ig = ig.slice(1);

    toInsert.push({
      brand_name: h.brand_name,
      contact_name: h.contact_name || null,
      email: h.email.trim(),
      email_type: ["press", "pr", "general", "partnerships"].includes(h.email_type) ? h.email_type : "general",
      instagram_handle: ig,
      website_url: h.website_url || null,
      notes: h.notes || null,
      category: "travel",
      status: "new",
    });
  }

  console.log(`\nInserting ${toInsert.length} new travel partners...`);

  // Insert in batches of 50
  let inserted = 0;
  let failed = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const batch = toInsert.slice(i, i + 50);
    const { error } = await supabase.from("brand_outreach_contacts").insert(batch);
    if (error) {
      console.error(`Batch ${i}-${i + batch.length} error:`, error.message);
      failed += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${i}-${i + batch.length} ✓`);
    }
  }

  console.log(`\n✓ Done — ${inserted} inserted, ${failed} failed`);
}

main().catch(console.error);
