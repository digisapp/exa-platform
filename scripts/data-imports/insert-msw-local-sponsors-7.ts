import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === HAIR EXTENSIONS ===
  { brand_name: "Miami Hair Extensions", email: "miamihairbysarah@gmail.com", phone: "(412) 495-1198", notes: "Hair extensions specialist in Miami. 108 SW 9th Street Suite 26, Miami FL 33130." },
  { brand_name: "Extension King Miami Beach", email: "info@extensionking.com", phone: "(305) 538-9990", notes: "Luxury hair extensions salon in Miami Beach. 915 Alton Rd, Miami Beach FL 33139." },
  { brand_name: "Meura Salon Fort Lauderdale", email: "meurasalon90@aol.com", phone: "(754) 216-0139", notes: "Luxury salon specializing in hand-tied hair extensions. 717 E Broward Blvd, Fort Lauderdale FL 33301." },

  // === PRIVATE CHEFS / CATERING ===
  { brand_name: "Epicureans of Florida", email: "info@epicureansofflorida.com", phone: "(305) 240-2256", notes: "Luxury private catering in Fort Lauderdale & Miami. 4 W Las Olas Blvd Unit 1801, Fort Lauderdale FL 33301." },
  { brand_name: "SoFlo Chefs", email: "info@soflochefs.com", phone: "(754) 799-5573", notes: "Private chef & catering services in South Florida." },
  { brand_name: "Folklore Culinary", email: "info@folkloreculinary.com", phone: "(305) 400-0070", notes: "Private chef & catering for events in Miami, Fort Lauderdale & Palm Beach." },

  // === LUXURY CONSIGNMENT / RESALE ===
  { brand_name: "Consign of the Times", email: "hello@consignofthetimes.com", phone: "(305) 535-0811", notes: "Luxury designer consignment in Miami Beach. 1935 West Ave #105, Miami Beach FL 33139." },
  { brand_name: "Encore Plus Boca Raton", email: "encoreplusinc@gmail.com", phone: "(561) 391-3812", notes: "Upscale luxury designer resale in East Boca Raton. 281 E Palmetto Park Rd, Boca Raton FL 33432." },
  { brand_name: "Posh Consignment Boca Raton", email: "poshbyveronika@gmail.com", phone: "(561) 465-5252", notes: "Luxury consignment store. 40 N Federal Hwy, Boca Raton FL 33432." },

  // === MED SPA / AESTHETICS (Jupiter & Palm Beach Gardens) ===
  { brand_name: "Begin Anew Med Spa", email: "rey@beginanewmed.com", phone: "(561) 918-3963", notes: "Luxury med spa in Jupiter. Botox, fillers, laser, HRT. 337 E Indiantown Rd Suite E-13, Jupiter FL 33477." },
  { brand_name: "Medicus Aesthetics Jupiter", email: "info@medicusaesthetics.com", phone: "(561) 624-0123", notes: "Premier medical spa in Jupiter. 3893 Military Trail Suite #2, Jupiter FL 33458." },
  { brand_name: "Refresh Medical Aesthetics Jupiter", email: "support@refreshpbma.com", phone: "(561) 250-6169", notes: "Medical aesthetics in Jupiter & Port St. Lucie." },

  // === AESTHETICS (Boca Raton) ===
  { brand_name: "ZenTox Aesthetics", email: "admin@zentoxaesthetics.com", phone: "(561) 430-3530", notes: "Botox, fillers, skincare in Boca Raton. 1200 W Yamato Rd Suite A8, Boca Raton FL 33431." },

  // === MASSAGE / WELLNESS ===
  { brand_name: "The NOW Massage Fort Lauderdale", email: "fortlauderdale@thenowmassage.com", notes: "Luxury massage boutique. 815 NE 2nd Ave Suite 410, Fort Lauderdale FL 33304." },

  // === CAR DETAILING ===
  { brand_name: "Detailing Mode LLC", email: "info@detailingmode.com", phone: "(786) 628-8978", notes: "Premium car detailing, ceramic coating in Miami-Dade & Broward. 696 W 17th St, Hialeah FL 33010." },

  // === PET GROOMING ===
  { brand_name: "Victoria Park Paw Spa", email: "info@victoriaparkpawspa.com", phone: "(954) 617-8724", notes: "Expert dog grooming in Fort Lauderdale. 630 N Federal Hwy, Fort Lauderdale FL 33304." },

  // === FLORISTS ===
  { brand_name: "Pistils and Petals Miami", email: "info@pistilsandpetals.com", phone: "(305) 534-5001", notes: "Miami's premier luxury florist since 1997. Event floral design. 5055 NW 74 Ave Unit 6, Miami FL 33166." },
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
