import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === SWIMWEAR BRANDS / MANUFACTURERS ===
  { brand_name: "Ogiis Swimwear (Manufacturer)", email: "sales@ogiis.com", phone: "(305) 778-7909", notes: "Swimwear & bikini manufacturer in Coral Gables, Miami. Private label production." },
  { brand_name: "Runway Swimwear Miami Beach", email: "runwayswimwear@gmail.com", phone: "(305) 538-7967", notes: "Luxury swimwear boutique. 3 locations on Lincoln Rd, Miami Beach FL 33139." },

  // === JEWELRY (Key West / Florida Keys) ===
  { brand_name: "Island Silver Key West", email: "sales@islandsilverkw.com", notes: "Jewelry store on Duval St, Key West. 141 Duval St, Key West FL 33040." },

  // === ELECTROLYSIS / LASER ===
  { brand_name: "NuBeauty Med Spa", email: "nubeautymedspa@gmail.com", phone: "(561) 633-1752", notes: "Electrolysis & laser hair removal in Boca Raton. 101 Plaza Real S Suite G, Boca Raton FL 33432." },

  // === LUXURY SPA (Hollywood / Hallandale) ===
  { brand_name: "eména Spa Hollywood", email: "me@emenaspa.com", phone: "(754) 707-5607", notes: "Premier eco luxury spa in Hollywood. Lyfe Resort, 4111 S Ocean Drive 9th Floor, Hollywood FL 33019." },

  // === DERMATOLOGY ===
  { brand_name: "Green Dermatology & Cosmetic Center", email: "awing@femwell.com", phone: "(954) 799-9600", notes: "Cosmetic dermatology in Deerfield Beach. Anti-aging, acne, procedures. 260 SW Natura Ave Suite 101, Deerfield Beach FL 33441." },

  // === PILATES ===
  { brand_name: "Club Pilates Coral Gables", email: "coralgables@clubpilates.com", phone: "(305) 209-5679", notes: "Reformer Pilates studio. 77 Miracle Mile, Coral Gables FL 33134." },
  { brand_name: "Club Pilates Brickell", email: "brickell@clubpilates.com", notes: "Reformer Pilates studio in Brickell, Miami." },

  // === MED AESTHETICS (Lauderdale-By-The-Sea) ===
  { brand_name: "Med Aesthetics Miami (info)", email: "info@medaestheticsmiami.com", phone: "(305) 356-7402", notes: "Med spa with locations across South Florida. Body contouring, laser, CoolSculpting." },

  // === HAIR EXTENSIONS (additional) ===
  { brand_name: "Siutse Hair Extensions", email: "info@siutsehairextensions.com", notes: "Premium hair extensions salon in Coral Gables, Miami." },

  // === BOUTIQUE FASHION ===
  { brand_name: "Aria Rose Boutique", email: "info@ariarose.com", phone: "(305) 603-8768", notes: "Women's fashion boutique in Coral Gables. 305 Palermo Ave." },

  // === CATERING ===
  { brand_name: "The Best Private Chef (Pietro Razzano)", email: "info@thebestprivatechef.com", notes: "Italian private chef for events in Miami & Fort Lauderdale." },

  // === AESTHETICS ===
  { brand_name: "Beauty Power by Irina", email: "beautypowerbyirina@gmail.com", phone: "(814) 954-2114", notes: "Permanent makeup & microblading in Deerfield Beach, serving Boca Raton, Parkland, Delray, Fort Lauderdale." },

  // === PHOTOGRAPHY ===
  { brand_name: "DSTNCT Art Media", email: "info@dstnctartmedia.com", notes: "Fashion photography & video in Miami, Boca Raton, Fort Lauderdale, West Palm Beach." },

  // === WELLNESS / CHIROPRACTIC ===
  { brand_name: "USA Sports Medicine South Beach", email: "info@usasportsmedicine.com", phone: "(305) 479-2973", notes: "Physical therapy & chiropractic in South Beach. 404 Washington Ave #120, Miami Beach FL 33139." },

  // === MASSAGE ===
  { brand_name: "Massage in Miami Beach (Deborah)", email: "massagemiamibeach@gmail.com", phone: "(305) 713-4047", notes: "Luxury mobile massage therapist in Miami Beach. Celebrity & five-star hotel clientele." },

  // === FINE DINING (Fort Lauderdale) ===
  { brand_name: "Florida Smile Studio", email: "info@floridasmilestudio.com", phone: "(954) 905-2000", notes: "Cosmetic dentist in Fort Lauderdale. Veneers, implants, whitening. 1212 E Broward Blvd Suite 200, Fort Lauderdale FL 33301." },

  // === DENTAL ===
  { brand_name: "Marchand & Zuluaga Aesthetic Smile", email: "info@marchandzuluagaestheticsmile.com", phone: "(305) 861-6414", notes: "Cosmetic dentistry in Miami Beach. Implants, veneers, whitening. 1171 71st St, Miami Beach FL." },
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
