import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === YACHT CHARTERS ===
  { brand_name: "VOYAGER Miami Yacht Charters", email: "robert@voyagermiami.com", phone: "(305) 709-2628", notes: "Luxury yacht charters, sales & management in Miami Beach. 10800 Collins Ave, Miami Beach FL 33154." },
  { brand_name: "Prime Luxury Rentals (Yachts & Cars)", email: "info@primeluxuryrentals.com", phone: "(305) 892-3573", notes: "Yacht charters & luxury car rentals in Miami. 990 Biscayne Blvd #501, Miami FL 33132." },

  // === BARBERSHOPS / MEN'S GROOMING ===
  { brand_name: "ManCave for Men", email: "info@mancaveformen.com", phone: "(954) 314-0779", notes: "High-end men's barbershop & grooming. Multiple Fort Lauderdale locations." },
  { brand_name: "Fade Masters of Miami", email: "fademastersofmiami@yahoo.com", phone: "(786) 615-4005", notes: "Vintage-inspired luxury barbershop in Coconut Grove. 3250 Grand Ave #1, Miami FL 33133." },
  { brand_name: "Barber & Co Miami", email: "info@barberandco.miami", phone: "(786) 536-9064", notes: "Luxury barbershop in Biscayne & Pinecrest. 2699 Biscayne Blvd, Miami FL 33137." },

  // === BOUTIQUES / FASHION ===
  { brand_name: "If So Boutiques", email: "sales@ifsoboutiques.com", notes: "Women's fashion boutique in Coral Gables, Boca Raton & Aventura." },

  // === YOGA / FITNESS ===
  { brand_name: "Ima Hot Yoga Studio", email: "info@imayogastudio.com", phone: "(786) 216-7878", notes: "Hot yoga studio in Miami Beach. 1935 West Ave Suite 204-205, Miami Beach FL 33139." },
  { brand_name: "CrossFit Hype", email: "info@crossfithype.com", phone: "(561) 325-3906", notes: "CrossFit gym in East Boca Raton near the beach. 1000 NW 1st Ave, Boca Raton FL 33432." },
  { brand_name: "CrossFit West Boca", email: "info@crossfitwestboca.com", phone: "(561) 223-9764", notes: "CrossFit gym in West Boca Raton. 19575 State Rd 7 #3, Boca Raton FL 33498." },
  { brand_name: "Health-Fit Chiropractic & Sports Recovery", email: "info@healthfitchiro.com", phone: "(561) 997-8898", notes: "Sports chiropractic & recovery in Boca Raton." },
  { brand_name: "Lux Fit SoFlo", email: "contact@luxfitsoflo.com", notes: "Personal training in Boca Raton, Deerfield Beach & Delray Beach." },

  // === SKINCARE / FACIALS ===
  { brand_name: "Sana Skin Studio", email: "wynwood@sanaskinstudio.com", phone: "(305) 707-5176", notes: "Cult favorite skin studio. Locations in Wynwood, Coconut Grove, Fort Lauderdale, WPB, Aventura." },
  { brand_name: "Skin Lounge Med Spa", email: "hello@skinloungemedspa.com", phone: "(213) 526-7717", notes: "Facials & advanced skincare in Boca Raton. 2061 NW 2nd Ave #205, Boca Raton FL 33431." },
  { brand_name: "Facial Mania Med Spa", email: "info@facialmaniamedspa.com", phone: "(561) 562-5621", notes: "Med spa with 10+ South FL locations: Delray Beach, Boca Raton, Coral Gables, Kendall, Miami, Plantation." },

  // === FLORISTS ===
  { brand_name: "Pistils and Petals", email: "info@pistilsandpetals.com", phone: "(305) 534-5001", notes: "Miami's premier luxury florist since 1997. Event floral design. 5055 NW 74 Ave Unit 6, Miami FL 33166." },

  // === MED AESTHETICS (Lauderdale) ===
  { brand_name: "Med Aesthetics Miami (Lauderdale)", email: "lauderdale@medaestheticsmiami.com", phone: "(305) 356-7402", notes: "Med spa in Lauderdale-By-The-Sea. Body contouring, laser treatments." },
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
