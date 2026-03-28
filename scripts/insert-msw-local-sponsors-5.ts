import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === TATTOO STUDIOS ===
  { brand_name: "Love Hate Tattoo Studio", email: "lovehatetattooinfo@yahoo.com", phone: "(305) 531-4556", notes: "Famous tattoo studio in Miami Beach (Miami Ink). 1360 Washington Ave, Miami Beach FL 33139." },
  { brand_name: "Salvation Tattoo Lounge", email: "salvation.tattoo.master@gmail.com", phone: "(954) 758-5452", notes: "Tattoo studio in Miami Beach with locations in Pembroke Pines & Coral Springs. 1612 Washington Ave, Miami Beach FL 33139." },

  // === EXOTIC / LUXURY CAR RENTALS ===
  { brand_name: "BluStreet Exotic Car Rentals", email: "contactmiami@blustreetauto.com", phone: "(305) 702-7553", notes: "Exotic car & yacht rentals in Miami. Lamborghini, Ferrari, McLaren. 3666 NW 48th Terrace, Miami FL 33142." },
  { brand_name: "Prestige Luxury Rentals", email: "info@prestigeluxuryrentals.com", phone: "(305) 513-9711", notes: "Luxury & exotic car rentals in Miami Beach, Brickell, Fort Lauderdale, Boca Raton." },
  { brand_name: "Rent and Paradise", email: "info@rentandparadise.com", phone: "(305) 906-0971", notes: "Exclusive exotic car rental. Ferrari, Lamborghini. 1111 Lincoln Road #644, Miami Beach FL 33139." },
  { brand_name: "Private Label Exotics", email: "cdsanford96@yahoo.com", phone: "(706) 473-1157", notes: "Luxury & exotic car rentals across West Palm Beach, Fort Lauderdale, Miami Beach. 92 vehicles." },

  // === PHOTOGRAPHY / PRODUCTION ===
  { brand_name: "Couture Bridal Photography", email: "couturebridalphoto@gmail.com", phone: "(954) 399-0741", notes: "Top wedding & editorial photography in Fort Lauderdale. 1 N Fort Lauderdale Beach Blvd, Fort Lauderdale FL 33304." },
  { brand_name: "Under The Sun Production", email: "ivanka@underthesunproduction.com", phone: "(646) 392-5421", notes: "Fashion photography & videography in Fort Lauderdale & Miami. Fort Lauderdale FL 33308." },

  // === MAKEUP ARTISTS ===
  { brand_name: "Makeup by Ade", email: "info@makeupbyade.com", phone: "(786) 340-0005", notes: "Professional makeup artist in Miami for fashion, events, bridal." },

  // === PERMANENT MAKEUP / MICROBLADING ===
  { brand_name: "Wafa Brows", email: "info@wafabrows.com", phone: "(561) 501-1068", notes: "Microblading & permanent makeup in Boca Raton. 7400 N Federal Hwy A11, Boca Raton FL 33487." },
  { brand_name: "Beauty Glam Studio", email: "beautyglamstudio@gmail.com", phone: "(954) 507-4447", notes: "PMU, brows, lashes & skin rejuvenation in downtown Boca Raton. 303 S Federal Hwy, Boca Raton FL 33432." },

  // === LASH STUDIOS ===
  { brand_name: "Katie's Luxury Lashes", email: "katiesluxurylashes@gmail.com", phone: "(551) 222-1214", notes: "Miami's #1 lash artist. 90 SW 3rd St, Miami FL 33130." },

  // === DAY SPAS ===
  { brand_name: "Tammy Fender Holistic Spa", email: "holisticspa@tammyfender.com", phone: "(561) 278-8111", notes: "Luxury holistic spa in Delray Beach & West Palm Beach. 10 N Ocean Blvd, Delray Beach FL 33483." },
  { brand_name: "The Haven Luxe Spa", email: "info@thehavenluxespa.com", phone: "(561) 330-4084", notes: "Luxury day spa in Delray Beach. 247 SE 6th Ave #3, Delray Beach FL 33483." },

  // === SPRAY TANNING ===
  { brand_name: "Golden Touch Mobile Spray Tan", email: "goldentouchmiami@gmail.com", phone: "(305) 962-4030", notes: "Miami's #1 celebrity mobile spray tanning. 8440 N Kendall Drive, Miami." },
  { brand_name: "Natura Spa (Las Olas)", email: "naturalasolas@naturawaxspa.com", phone: "(954) 395-8130", notes: "Best waxing & sugaring in Fort Lauderdale. 270 N Federal Hwy, Fort Lauderdale FL 33301." },

  // === PLASTIC SURGERY / COSMETIC ===
  { brand_name: "Miami Beach Plastic Surgery", email: "info@miamibeachplasticsurgery.com", phone: "(305) 674-8586", notes: "Cosmetic & plastic surgery in Miami Beach. 400 Arthur Godfrey Rd Suite 305, Miami Beach FL 33140." },
  { brand_name: "Avana Plastic Surgery", email: "info@avanaplasticsurgery.com", phone: "(305) 501-6000", notes: "Top cosmetic surgery in Miami. Body contouring, BBL, breast surgery. 8700 W Flagler St Suite 250, Miami FL 33174." },

  // === EVENT VENUES ===
  { brand_name: "BOHO Social Events", email: "bohosocialinquiry@gmail.com", phone: "(954) 600-4037", notes: "Luxury beach picnics, beach weddings & event planning. Fort Lauderdale to Miami Beach to Boca Raton." },

  // === FINE DINING ===
  { brand_name: "STK South Beach", email: "events@stksteakhouse.com", notes: "Modern luxury steakhouse & lounge in South Beach Miami. Fine dining & events." },
  { brand_name: "Matador Room (EDITION)", email: "events.mia@editionhotels.com", phone: "(786) 257-4521", notes: "Michelin-starred Chef Jean-Georges restaurant at The Miami Beach EDITION." },

  // === BOUTIQUE HOTELS ===
  { brand_name: "Oasis Hotel Fort Lauderdale", email: "reservations@oasishotelftl.com", phone: "(954) 523-3043", notes: "Boutique hotel in Fort Lauderdale. 1200 S Miami Road, Fort Lauderdale FL 33316." },
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
