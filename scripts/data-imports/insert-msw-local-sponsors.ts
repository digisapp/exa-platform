import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Contact {
  brand_name: string;
  email: string;
  phone?: string;
  notes: string;
}

const contacts: Contact[] = [
  // === MED SPAS / AESTHETICS ===
  { brand_name: "Rejuvaline Medspa", email: "info@rejuvalinemedspa.com", phone: "(786) 884-0110", notes: "Med spa in Miami Beach. 1508 Bay Rd & 100 South Pointe Dr, Miami Beach FL 33139." },
  { brand_name: "Aviva Medical Spa", email: "info@avivamedicalspa.com", phone: "(786) 812-8622", notes: "Med spa in Miami Design District. 4100 NE 2nd Ave #301, Miami FL 33137." },
  { brand_name: "Sanctuary Medical Aesthetic Center", email: "info@sanctuarymedical.com", phone: "(561) 886-0970", notes: "Top med spa in Boca Raton. 4800 N Federal Hwy Suite C100, Boca Raton FL 33431." },
  { brand_name: "Lumiere Med Spa", email: "lumierebyadriana@gmail.com", phone: "(954) 335-4546", notes: "Med spa in Fort Lauderdale." },
  { brand_name: "AestheteMed", email: "info@aesthetemed.com", phone: "(786) 966-7878", notes: "Med spa in Hallandale Beach serving Aventura & Sunny Isles. 2100 E Hallandale Beach Blvd Suite 100, Hallandale Beach FL 33009." },
  { brand_name: "Solea Medical Spa & Beauty Lounge", email: "info@soleabeautylounge.com", phone: "(305) 912-2155", notes: "Med spa in Sunny Isles Beach. 18140 Collins Ave, Sunny Isles Beach FL 33160." },
  { brand_name: "Bespoke Aesthetics PB", email: "contact@bespokeaestheticspb.com", phone: "(561) 337-3375", notes: "Med spa in West Palm Beach. 625 N Flagler Drive Suite 675, West Palm Beach FL 33401." },
  { brand_name: "Le Mar Aesthetics", email: "info@lemaraesthetics.com", phone: "(786) 838-6859", notes: "Med spa in Kendall, Miami. 7887 N Kendall Dr Suite 215, Miami FL 33156." },
  { brand_name: "Key West Med Spa", email: "info@keywestmedspa.com", phone: "(786) 652-7255", notes: "Med spa in Key West. 408 Greene Street, Key West FL 33040." },
  { brand_name: "Aromas Med Spa", email: "aromas@me.com", phone: "(305) 591-3005", notes: "Med spa with locations in Doral, Kendall, and Weston. 18+ years experience." },
  { brand_name: "Monaco MedSpa", email: "info@monacomedspa.com", phone: "(786) 536-6117", notes: "Med spa in Midtown Miami. 2930 NE 2nd Court, Miami FL 33137." },
  { brand_name: "Miami Dermatology & Laser Institute", email: "info@miamidermlaser.com", phone: "(305) 279-6060", notes: "Cosmetic dermatology in Coconut Grove. 3683 S Miami Avenue Suite 200, Miami FL 33133." },
  { brand_name: "Mayoral Dermatology", email: "info@mayoralderm.com", phone: "(305) 665-6166", notes: "Luxury cosmetic dermatology in Coral Gables. 6705 SW 57th Ave Suite 314, Coral Gables FL 33143." },
  { brand_name: "New Wave Med Spa", email: "support@bodyartzspa.com", phone: "(954) 775-8885", notes: "Med spa in Pembroke Pines & Miami. 18465 Pines Blvd, Pembroke Pines FL 33029." },
  { brand_name: "MD Beauty Labs", email: "info@mdbeautylabs.com", phone: "(561) 655-6325", notes: "Med spa in West Palm Beach & Palm Beach. 320 S Quadrille Blvd, WPB FL 33401." },

  // === WELLNESS / HEALTH ===
  { brand_name: "Miami Wellness Center", email: "frontdesk@miamiwellness.com", notes: "Wellness center in Miami. IV therapy, wellness treatments." },
  { brand_name: "Healthspan Recovery", email: "info@healthspanrecovery.com", phone: "(786) 713-1222", notes: "Cryotherapy, hyperbaric oxygen, infrared sauna, red light therapy in Brickell Miami. 848 Brickell Ave Suite 210, Miami FL 33131." },
  { brand_name: "The Chic Wellness", email: "chicbeautyxbar@gmail.com", phone: "(305) 481-8304", notes: "Premium wellness center in Miami & Fort Lauderdale. IV therapy, weight management, anti-aging." },
  { brand_name: "Hyperbaric Medical Solutions", email: "info@hyperbaricmedicalsolutions.com", phone: "(954) 834-1280", notes: "Hyperbaric oxygen therapy in Fort Lauderdale. 2866 E Oakland Park Blvd, Fort Lauderdale FL 33306." },
  { brand_name: "Cheeca Lodge Spa", email: "spa@cheeca.com", phone: "(305) 517-4485", notes: "Luxury spa in Islamorada, Florida Keys. 81801 Overseas Hwy, Islamorada FL." },

  // === JEWELRY / DIAMONDS ===
  { brand_name: "Jae's Jewelers", email: "info@jaesjewelers.com", phone: "(305) 443-7724", notes: "Fine jewelry in Coral Gables since 1945. 237 Miracle Mile, Coral Gables FL 33134. GIA-graded diamonds, estate jewelry, custom engagement rings." },
  { brand_name: "Provident Jewelry", email: "customerservice@providentjewelry.com", phone: "(561) 833-7755", notes: "Luxury watches & fine jewelry in Jupiter & West Palm Beach. Flagship on Clematis Street, Downtown WPB." },
  { brand_name: "Jewels In Time", email: "customerservice@jewelsintime.com", phone: "(561) 368-1454", notes: "Fine jewelry & luxury watches in Boca Raton. Shoppes at the Sanctuary, 4400 N Federal Hwy Suite 116, Boca Raton FL 33431." },
  { brand_name: "Lexie Jordan Jewelry", email: "cheryl@lexiejordanjewelry.com", phone: "(561) 221-7456", notes: "Handcrafted custom jewelry in Boca Raton." },
  { brand_name: "Robinson's Jewelers", email: "info@robinsonsjewelers.com", phone: "(954) 258-2246", notes: "Fine jewelry on Las Olas Blvd, Fort Lauderdale. 820 E Las Olas Blvd, Fort Lauderdale FL 33301." },
  { brand_name: "Luna Jewelers", email: "lunajewelers2025@gmail.com", phone: "(954) 982-2532", notes: "Jewelry store in Fort Lauderdale. 1569 S Federal Hwy, Fort Lauderdale FL 33316." },
  { brand_name: "Diamond Banc Boca Raton", email: "bocaraton@diamondbanc.com", phone: "(561) 430-5035", notes: "Luxury diamond & jewelry dealer in Boca Raton." },

  // === BEAUTY / HAIR / NAILS ===
  { brand_name: "NailsLab", email: "nailslabmiami@gmail.com", phone: "(305) 916-1678", notes: "High-end nail salon with locations in North Miami Beach, Hallandale Beach, and Boca Raton." },
  { brand_name: "NailsLab Boca", email: "boca@nailslab.com", phone: "(561) 970-6288", notes: "High-end nail salon in Boca Raton." },
  { brand_name: "Hairmess Salon", email: "info@hairmesssalon.com", phone: "(561) 372-9218", notes: "Luxury hair salon in Boca Raton. 7531 N Federal Hwy E3, Boca Raton FL 33487." },
  { brand_name: "Holi Nails Fort Lauderdale", email: "info@holinails.com", phone: "(954) 900-4953", notes: "High-end nail salon. 917 NE 20th Ave, Fort Lauderdale FL 33304. Also in Boca Raton." },

  // === BOUTIQUES / FASHION / SWIMWEAR ===
  { brand_name: "Montce Swim", email: "shopmia@montce.com", phone: "(786) 615-3199", notes: "Luxury swimwear boutique in Miami Design District. 3810 NE 1st Ave, Miami FL 33137." },
  { brand_name: "Revival Boutique", email: "revivalboutiquegroup@gmail.com", phone: "(561) 563-8989", notes: "Women's boutique with locations in Delray Beach, Boca Raton, and Palm Beach Gardens." },
  { brand_name: "Fontainebleau Miami Beach Spa", email: "spa@fontainebleau.com", phone: "(888) 320-1699", notes: "Lapis Spa at Fontainebleau Miami Beach. Luxury spa with MediSpa facials and rejuvenating treatments." },
];

async function main() {
  // Check for existing emails to avoid duplicates
  const emails = contacts.map(c => c.email);
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing || []).map(e => e.email));

  const newContacts = contacts.filter(c => !existingEmails.has(c.email));
  console.log(`Total contacts: ${contacts.length}`);
  console.log(`Already in DB: ${contacts.length - newContacts.length}`);
  console.log(`New to insert: ${newContacts.length}`);

  if (newContacts.length === 0) {
    console.log("No new contacts to insert.");
    return;
  }

  const rows = newContacts.map(c => ({
    brand_name: c.brand_name,
    email: c.email,
    contact_name: null,
    phone: c.phone || null,
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

  console.log(`Successfully inserted ${data.length} new contacts!`);
}

main();
