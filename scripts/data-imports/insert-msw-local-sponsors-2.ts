import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  { brand_name: "The DRIPBaR Fort Lauderdale", email: "FortLauderdale108@THEDRIPBaR.com", phone: "(954) 256-9232", notes: "IV therapy drip bar in Fort Lauderdale." },
  { brand_name: "Liquivida Lounge Brickell", email: "support@liquivida.com", phone: "(305) 504-8860", notes: "IV therapy & wellness in Brickell, Miami." },
  { brand_name: "Cryo Miami", email: "info@cryo-miami.com", phone: "(305) 456-0684", notes: "Cryotherapy & recovery in Coral Gables." },
  { brand_name: "Hydrology Wellness", email: "info@hydrologywellness.com", phone: "(305) 859-3999", notes: "HBOT, cryotherapy, IV therapy, red light in Coral Gables." },
  { brand_name: "RESET Cryotherapy", email: "whit@resetcryotherapy.com", phone: "(305) 763-8297", notes: "Cryotherapy & infrared sauna in Miami Beach / South Beach." },
  { brand_name: "Solea Brickell Spa", email: "soleabrickellsspa@gmail.com", phone: "(786) 536-7926", notes: "Wellness spa in Brickell, Miami." },
  { brand_name: "Pause Studio Fort Lauderdale", email: "hello@pausestudio.com", phone: "(310) 439-1972", notes: "Infrared saunas, IV drips, wellness in Fort Lauderdale. 2071 E Oakland Park Blvd, Fort Lauderdale FL 33306." },
  { brand_name: "Float8 Wellness Lounge", email: "hello@float8ion.com", phone: "(954) 869-4034", notes: "Float therapy & sensory deprivation in Fort Lauderdale & Delray Beach." },
  { brand_name: "Transitions Wellness Center", email: "info@staycalmandfloat.com", phone: "(561) 402-6132", notes: "Float therapy & wellness in Juno Beach." },
  { brand_name: "Hippocrates Wellness", email: "hippocrates@worldnet.att.net", phone: "(561) 471-8876", notes: "Holistic wellness center in West Palm Beach." },
  { brand_name: "Inspire Palm Beach", email: "info@inspirepalmbeach.com", phone: "(561) 377-8772", notes: "Wellness center in West Palm Beach." },
  { brand_name: "Tringali Vibrant Health", email: "info@tringali-health.com", phone: "(561) 283-1166", notes: "Integrative wellness in West Palm Beach & Palm Beach Gardens." },
  { brand_name: "Palm Beach Wellness Institute", email: "info@pbwellnessmd.com", phone: "(561) 802-0929", notes: "Wellness institute in Palm Beach." },
  { brand_name: "Thrive Power Yoga Palm Beach", email: "info@thrivepoweryogapb.com", phone: "(561) 835-1577", notes: "Luxury yoga studio in Palm Beach Gardens." },
  { brand_name: "The Lane Spa", email: "relax@thelanespa.com", phone: "(561) 691-0104", notes: "Day spa in Palm Beach Gardens." },
  { brand_name: "Studio Three Miami", email: "info@studiothree.com", phone: "(877) 651-8620", notes: "Luxury fitness studio in Miami." },
  { brand_name: "Rock Fitness Doral", email: "reception@rockfitness.live", phone: "(786) 848-4517", notes: "Luxury fitness studio in Doral." },
  { brand_name: "Centner Wellness", email: "hello@centnerwellness.com", phone: "(305) 602-5244", notes: "Wellness center in Coral Gables, Miami." },
  { brand_name: "NutriDrip IV Lounge (Fontainebleau)", email: "miamibooking@nutridrip.com", phone: "(305) 535-1646", notes: "IV therapy lounge at Fontainebleau Miami Beach." },
  { brand_name: "Dripping Wellness", email: "hello@drippingwellness.com", phone: "(954) 833-1369", notes: "IV therapy & wellness in Fort Lauderdale." },
  { brand_name: "AlluraMD Aesthetics + Wellness", email: "info@alluraaesthetics.com", phone: "(561) 316-4580", notes: "Med spa & wellness in Jupiter, FL." },
];

async function main() {
  const emails = contacts.map(c => c.email.toLowerCase());
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing || []).map(e => e.email.toLowerCase()));
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));

  console.log(`Total: ${contacts.length}, Already in DB: ${contacts.length - newContacts.length}, New: ${newContacts.length}`);

  if (newContacts.length === 0) {
    console.log("No new contacts to insert.");
    return;
  }

  const rows = newContacts.map(c => ({
    brand_name: c.brand_name,
    email: c.email,
    contact_name: null,
    phone: c.phone,
    status: "new",
    notes: c.notes,
  }));

  const { data, error } = await supabase
    .from("brand_outreach_contacts")
    .insert(rows)
    .select("id");

  if (error) {
    console.error("Insert error:", error);
    process.exit(1);
  }

  console.log(`Inserted ${data.length} new contacts!`);
}

main();
