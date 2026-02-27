import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORRECTIONS: Array<{
  brand_name: string;
  old_email: string;
  new_email: string;
  note: string;
}> = [
  {
    brand_name: "The Palms Turks & Caicos",
    old_email: "reservations@thepalmstc.com",
    new_email: "info@thepalmstc.com",
    note: "Press Room at thepalmstc.com/press/ lists info@ as the PR contact; reservations@ is wrong dept",
  },
  {
    brand_name: "Cheval Blanc St-Barth",
    old_email: "res.stbarth@chevalblanc.com",
    new_email: "anne-laure.pandolfi@lvmh.com",
    note: "res.stbarth@ is the reservations inbox; Communications Director Anne-Laure Pandolfi at LVMH Hotel Management is the correct press contact",
  },
];

async function main() {
  console.log("Starting batch 3 email corrections (Caribbean extras)...\n");

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  for (const fix of CORRECTIONS) {
    const { data, error } = await supabase
      .from("brand_outreach_contacts")
      .update({ email: fix.new_email })
      .eq("brand_name", fix.brand_name)
      .eq("email", fix.old_email)
      .eq("category", "travel")
      .select("id");

    if (error) {
      console.error(`ERROR updating ${fix.brand_name}:`, error.message);
      errors++;
    } else if (!data || data.length === 0) {
      console.warn(`NOT FOUND: ${fix.brand_name} (${fix.old_email})`);
      notFound++;
    } else {
      console.log(`✓ ${fix.brand_name}: ${fix.old_email} → ${fix.new_email}`);
      updated++;
    }
  }

  console.log(`\n✓ Done — ${updated} updated, ${notFound} not found, ${errors} errors`);
}

main().catch(console.error);
