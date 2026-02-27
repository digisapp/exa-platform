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
  // caribbean-islands-hotels.json
  {
    brand_name: "Le Barthélemy Hotel & Spa",
    old_email: "spa@lebarth.com",
    new_email: "contact@lebarth.com",
    note: "spa@ is the wrong department; contact@ is the general/PR contact per lebarthelemyhotel.com",
  },
  {
    brand_name: "GoldenEye Resort Jamaica",
    old_email: "reservations@goldeneye.com",
    new_email: "julie@frenchflairpr.com",
    note: "GoldenEye press handled by French Flair PR (Julie); reservations@ is wrong dept",
  },
  {
    brand_name: "Malliouhana, An Auberge Resort",
    old_email: "callie.stanton@aubergeresorts.com",
    new_email: "Concierge@Malliouhana.com",
    note: "Malliouhana left Auberge Collection in 2023; Callie Stanton no longer relevant, use direct property contact",
  },
  {
    brand_name: "Baoase Luxury Resort Curacao",
    old_email: "reservations@baoase.com",
    new_email: "guestrelations@baoase.com",
    note: "guestrelations@ is confirmed contact for media/partnership outreach at Baoase",
  },

  // maldives-indian-ocean-hotels.json
  {
    brand_name: "JOALI BEING",
    old_email: "reservations.being@joali.com",
    new_email: "Duygu.Tatar@joali.com",
    note: "Duygu Tatar is confirmed PR/Communications contact at JOALI BEING",
  },
  {
    brand_name: "Amilla Maldives Resort & Residences",
    old_email: "hello@amilla.com",
    new_email: "pr@amilla.com",
    note: "hello@ is generic; pr@ is the confirmed press/media contact at Amilla",
  },
  {
    brand_name: "Dusit Thani Maldives",
    old_email: "dusit.reservations@dusit.com",
    new_email: "dibkcommemo@dusit.com",
    note: "reservations@ is wrong dept; dibkcommemo@ is the Maldives marketing/communications contact",
  },
  {
    brand_name: "Raffles Seychelles",
    old_email: "seychelles@raffles.com",
    new_email: "Stefan.lewis@raffles.com",
    note: "Stefan Lewis is confirmed PR contact at Raffles Seychelles",
  },
  {
    brand_name: "LUX* Saint Gilles",
    old_email: "stay@luxresorts.com",
    new_email: "luxiledelareunion@luxresorts.com",
    note: "stay@ is generic group inbox; luxiledelareunion@ is property-specific contact for Île de La Réunion",
  },
];

async function main() {
  console.log("Starting batch 2 email corrections (Caribbean + Maldives)...\n");

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
