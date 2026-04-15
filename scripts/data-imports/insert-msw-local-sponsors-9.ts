import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === BRIDAL / WEDDING ===
  { brand_name: "Galia Lahav Miami", email: "miami@galialahav.com", phone: "(305) 479-2279", notes: "Luxury bridal boutique in Miami Design District. 112 NE 41st St, Miami." },
  { brand_name: "Boca Raton Bridal", email: "gowns@bocaratonbridal.com", phone: "(561) 447-6541", notes: "Florida's largest couture wedding dress collection. 3591 N Federal Hwy, Boca Raton FL 33431." },
  { brand_name: "Lauderdale Bride", email: "info@lauderdalebride.com", phone: "(954) 565-0112", notes: "Intimate bridal boutique in Fort Lauderdale. 2741 E Oakland Park Blvd, Fort Lauderdale FL 33306." },
  { brand_name: "RashawnRose Bridal & Prom", email: "bridal@rashawnrose.com", phone: "(954) 577-6943", notes: "Bridal & prom shop in Davie. 12920 W State Road 84, Davie FL 33325." },

  // === HOME STAGING / INTERIOR DESIGN ===
  { brand_name: "Captiva Home Design", email: "bking@captivahomedesign.com", phone: "(954) 205-6555", notes: "Interior decorating & home staging in Broward, West Palm Beach, Palm Beach counties." },

  // === MISC HIGH-END LOCAL ===
  { brand_name: "J Del Olmo Bridal Gallery", email: "info@jdelolmobridal.com", phone: "(305) 448-3599", notes: "Luxury bridal gallery in Miami. 8820 SW 72nd St Suite A-1, Miami FL 33173." },
  { brand_name: "Coral Gables Bridals", email: "info@coralgablesbridals.com", phone: "(305) 444-8292", notes: "Luxury bridal boutique in Miami. 3530 Coral Way, Miami FL 33145." },

  // === ADDITIONAL DENTISTRY ===
  { brand_name: "White Smiles of Boca", email: "info@whitesmilesofboca.com", phone: "(561) 395-4948", notes: "Cosmetic dentistry in Boca Raton. 200 W Palmetto Park Rd #103, Boca Raton FL 33432." },

  // === WELLNESS ADDITIONAL ===
  { brand_name: "Skincare by Amy Peterson", email: "info@skincarebyamypeterson.com", notes: "Aesthetic skincare clinic in Miami Beach. 20+ years experience, personalized solutions." },
  { brand_name: "Toska Spa & Facial Bar", email: "info@toskaspa.com", notes: "Premier luxury skincare & facial bar in Miami. Founded by internationally acclaimed esthetician." },

  // === BOUTIQUE ADDITIONAL ===
  { brand_name: "Earthy Chic Boutique", email: "info@earthychic.com", phone: "(305) 496-0057", notes: "Women's fashion boutique in Coral Gables. 320 San Lorenzo Ave #1234." },
  { brand_name: "South Beach Beauty Supply", email: "info@southbeachbeautysupply.com", notes: "Beauty supply store. 843 Washington Ave, Miami Beach." },

  // === FITNESS ADDITIONAL ===
  { brand_name: "Hiperfit Miami Beach", email: "info@hiperfitmiamibeach.com", phone: "(305) 674-9899", notes: "Personal training studio in Miami Beach." },
  { brand_name: "Boca Raton Fitness Center", email: "info@bocaratonfitnesscenter.com", notes: "Luxury fitness center in Boca Raton. 20+ personal trainers." },

  // === CAR RENTAL ADDITIONAL ===
  { brand_name: "Dynasty Luxury Rentals", email: "info@dynastyluxuryrentals.com", notes: "Exotic & luxury car rental in Miami, South Beach, Orlando." },

  // === SPA / WELLNESS ADDITIONAL ===
  { brand_name: "Bella Reina Spa Delray", email: "info@bellareinaspa.com", phone: "(561) 404-7670", notes: "Bio-hacked vegan NAD-boosting spa in Delray Beach. 815 George Bush Blvd, Delray Beach FL 33483." },
  { brand_name: "Seagate Hotel & Spa", email: "info@theseagatehotel.com", phone: "(561) 665-4950", notes: "Luxury hotel & spa in Delray Beach." },

  // === JEWELRY ADDITIONAL ===
  { brand_name: "Emeralds International Key West", email: "info@emeraldsinternational.com", phone: "(305) 294-2060", notes: "Fine jewelry & watches in Key West." },

  // === ECO DRY CLEANING ===
  { brand_name: "DRYECO Miami", email: "info@dryeco.com", phone: "(305) 933-2400", notes: "Eco-friendly dry cleaning serving Miami Beach & Fort Lauderdale. Organic dry cleaning & alterations." },

  // === MED SPA ADDITIONAL ===
  { brand_name: "Skin Apeel Day Spa (Boca)", email: "hello@skinapeel.com", phone: "(561) 852-8081", notes: "Luxury day spa in Boca Raton. Massage, facials, body treatments." },

  // === BOUTIQUE HOTEL ADDITIONAL ===
  { brand_name: "The Lauderdale Boutique Hotel", email: "info@thelauderdalehotel.com", phone: "(954) 412-9080", notes: "Boutique hotel in Fort Lauderdale. 505 SE 16th St, Fort Lauderdale FL 33316." },

  // === DERMATOLOGY ADDITIONAL ===
  { brand_name: "Brilliant Dermatology Delray", email: "info@brilliantdermatology.com", phone: "(561) 877-3376", notes: "Cosmetic dermatology in Delray Beach. Botox, Dysport, fillers. 5162 Linton Blvd Suite 203, Delray Beach FL 33484." },

  // === LASH STUDIO ADDITIONAL ===
  { brand_name: "Pavlina's Eyelash Boutique", email: "info@pavlinaseyelashboutique.com", phone: "(954) 446-5516", notes: "Eyelash extensions in Miami Beach." },

  // === PHOTOGRAPHY ADDITIONAL ===
  { brand_name: "Anna Gunselman Photography", email: "info@annagunselman.com", notes: "Fashion photographer in Miami. Campaigns, lookbooks, editorials, advertising." },
];

async function main() {
  const emails = contacts.map(c => c.email.toLowerCase());
  const { data: existing } = await supabase
    .from("brand_outreach_contacts")
    .select("email")
    .in("email", emails);

  const existingEmails = new Set((existing || []).map((e: any) => e.email.toLowerCase()));
  const newContacts = contacts.filter(c => !existingEmails.has(c.email.toLowerCase()));

  console.log(`Total: ${contacts.length}, Already in DB: ${contacts.length - newContacts.length}, New: ${newContacts.length}`);

  if (newContacts.length === 0) {
    console.log("No new contacts.");
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
  console.log(`Inserted ${data.length} new contacts!`);
}

main();
