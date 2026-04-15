import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // === MED SPAS / AESTHETICS (batch 3) ===
  { brand_name: "Vivrant Medspa", email: "info@vivrantmedspa.com", phone: "(954) 745-9505", notes: "Med spa in Coral Springs. 4500 N University Dr #202, Coral Springs FL 33065." },
  { brand_name: "Coral Springs Med Spa", email: "coralspringsmedspa@gmail.com", phone: "(786) 779-1607", notes: "Med spa in Coral Springs. 993 N University Dr, Coral Springs FL 33071." },
  { brand_name: "Rebuild Med Spa", email: "info@rebuildmedspa.com", phone: "(954) 902-6371", notes: "Med spa in Lighthouse Point. 3320 N Federal Hwy #107, Lighthouse Point FL 33064." },
  { brand_name: "Sana Medical Spa", email: "sana@sanamedicalspa.com", phone: "(561) 789-2557", notes: "Med spa in Delray Beach. 8862 W Atlantic Ave C5 Suite 111, Delray Beach FL 33446." },
  { brand_name: "Medspa of Delray", email: "email@medspaofdelray.com", phone: "(561) 220-9152", notes: "Med spa in Delray Beach." },
  { brand_name: "4Ever Young Delray Beach", email: "frontdesk@4everyoungdelray.com", phone: "(561) 461-6911", notes: "Anti-aging & wellness med spa. 401 W Atlantic Ave Suite R-12, Delray Beach FL 33444." },
  { brand_name: "Millan Medspa", email: "millanmedspa@gmail.com", phone: "(561) 431-4087", notes: "Med spa in Wellington. 4095 S State Rd 7 K, Wellington FL 33449." },
  { brand_name: "Wellington Rejuvenation Center", email: "info@wellingtonrejuvenationcenter.com", phone: "(561) 878-1282", notes: "Med spa in Royal Palm Beach. 11917 Southern Blvd Suite 200, Royal Palm Beach FL 33411." },
  { brand_name: "Med Aesthetics Miami (Aventura)", email: "aventura@medaestheticsmiami.com", phone: "(305) 356-7402", notes: "Med spa in Aventura. 20200 W Dixie Hwy Ground Floor Suite G-11, Aventura FL 33180." },

  // === DERMATOLOGY / COSMETIC CLINICS ===
  { brand_name: "Ayana Dermatology & Aesthetics", email: "info@ayanaderm.com", phone: "(954) 727-5700", notes: "Board-certified cosmetic dermatology in Fort Lauderdale." },
  { brand_name: "Natura Dermatology", email: "doctor@naturadermatology.com", phone: "(954) 537-4106", notes: "Dermatology in Fort Lauderdale. 800 E Broward Blvd Suite 507, Fort Lauderdale FL 33301." },
  { brand_name: "GreeneMD Aesthetics", email: "greenemd@drryangreene.com", phone: "(954) 651-6600", notes: "Facial plastic surgeon & CoolSculpting in Weston. 2731 Executive Park Dr Suite 1, Weston FL 33331." },

  // === JEWELRY ===
  { brand_name: "Jewelry World (Aventura)", email: "info@jewelryworld.com", phone: "(305) 931-3383", notes: "Jewelry store in Aventura. 19275 Biscayne Blvd Suite 6, Aventura FL 33180." },

  // === BEAUTY / HAIR / NAILS ===
  { brand_name: "Bloom Bar Salon", email: "info@bloombarnails.com", phone: "(305) 603-7169", notes: "High-end nail & beauty salon in Coral Gables/Pinecrest. 5783 SW 40 St, Miami FL 33155." },
  { brand_name: "Kijana Salon & Blow Dry Bar", email: "kijanaspa@gmail.com", phone: "(305) 662-8080", notes: "Luxury salon & blow dry bar in South Miami/Coral Gables." },
  { brand_name: "NailsLab Hallandale", email: "nailslabhallandale@gmail.com", phone: "(305) 849-0185", notes: "High-end nail salon in Hallandale Beach." },

  // === WELLNESS / FITNESS ===
  { brand_name: "Skin Apeel Day Spa", email: "hello@skinapeel.com", phone: "(561) 852-8081", notes: "Luxury day spa in Boca Raton. Massage, facials, body treatments." },
  { brand_name: "Pilates & Or Boca Raton", email: "bocaraton@pilatesandor.com", phone: "(561) 705-7485", notes: "Pilates studio in Boca Raton. 141 NW 20th St Suite D2, Boca Raton FL 33431." },
  { brand_name: "Club Pilates Boca South", email: "bocasouth@clubpilates.com", notes: "Pilates studio in South Boca Raton." },

  // === TANNING ===
  { brand_name: "Inner Glow Airbrush Tanning", email: "info@innerglowairbrushtanning.com", phone: "(833) 413-7646", notes: "Mobile spray tanning across South Florida. Palm Beach County & surrounding areas." },
  { brand_name: "Miami Glow Tanning", email: "info@miamiglowtanning.com", phone: "(714) 747-2086", notes: "Mobile spray tanning in Fort Lauderdale & Miami Beach." },

  // === DENTAL ===
  { brand_name: "Harris Dentistry", email: "info@harrisdentistrybocaraton.com", notes: "Cosmetic dentistry & teeth whitening in Boca Raton." },
  { brand_name: "Diamond Banc West Palm Beach", email: "westpalmbeach@diamondbanc.com", notes: "Luxury diamond & jewelry dealer in West Palm Beach." },
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
