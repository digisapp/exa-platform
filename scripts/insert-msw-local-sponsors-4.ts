import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const contacts = [
  // More med spas & aesthetics
  { brand_name: "Nava Wellness & Med Spa", email: "navawellnessmedspa@gmail.com", phone: "(305) 705-2300", notes: "Med spa in North Miami Beach. 15805 Biscayne Blvd Suite 101, North Miami Beach FL 33160." },
  { brand_name: "New Image Works", email: "info-miami@newimageworks.com", phone: "(786) 438-0778", notes: "Med spa in North Miami. 2920 NE 207th St Suite 1005, Miami FL 33180." },
  { brand_name: "Med Aesthetics Miami (Coral Gables)", email: "coralgables@medaestheticsmiami.com", phone: "(305) 356-7402", notes: "Med spa in Coral Gables. 2020 Ponce de Leon Blvd Suite 106, Coral Gables FL 33134." },
  { brand_name: "Miami Medspa", email: "miamimedspa1@gmail.com", phone: "(305) 267-6145", notes: "Med spa in Miami. 974 SW 82nd Ave, Miami FL 33144." },
  { brand_name: "Lumea Med Spa", email: "support@lumeamedspa.com", phone: "(786) 604-2514", notes: "Med spa in Miami. 8950 SW 74th Ct Suite 1408, Miami FL 33156." },
  { brand_name: "Ageless Medical Aesthetics", email: "info@agelessmed.com", phone: "(954) 680-8330", notes: "Med spa in Cooper City/Davie. 10640 Griffin Rd Suite 102, Cooper City FL 33328." },
  { brand_name: "Beyond Health MedSpa", email: "info@beyondhealthmedspa.com", phone: "(786) 359-4068", notes: "Med spa in West Miami. 10344 W Flagler St, Miami FL 33174." },
  { brand_name: "Heavenly Med Spa Doral", email: "info@heavenlymedspamiami.com", phone: "(305) 265-2606", notes: "Med spa in Doral, Miami." },
  { brand_name: "Miami Elegance Medspa", email: "info@miamielegance.com", phone: "(305) 290-4792", notes: "Med spa in Doral, Miami." },
  { brand_name: "DG Rejuvenation Med Spa", email: "info@dgrejuvenation.com", phone: "(954) 408-9999", notes: "Med spa in Hollywood. 3800 S Ocean Dr Suite 206, Hollywood FL 33019." },

  // Boutiques & swimwear
  { brand_name: "LaTAN Swim", email: "info@latanswim.com", notes: "Swimwear boutique in Miami & Delray Beach. Multiple South FL locations." },
  { brand_name: "Soirée Miami Beach", email: "info@soireemiamibeach.com", notes: "Luxury swimwear boutique in Miami Beach." },
  { brand_name: "Nic Del Mar", email: "info@nicdelmar.com", notes: "Swimwear boutique in Miami Beach." },
  { brand_name: "South Ocean Beach Shop", email: "info@delraybeachshop.com", notes: "Beach & resort wear shop in Delray Beach. 40+ years serving the community." },
  { brand_name: "Deborah James Boutique", email: "info@deborahjames.com", notes: "High-end women's boutique in Fort Lauderdale. European & US designer fashions." },
  { brand_name: "Bolufe Boutique", email: "info@bolufeboutique.com", notes: "Boutique in Delray Beach. 326 E Atlantic Ave, Delray Beach FL 33483." },

  // More wellness
  { brand_name: "Liquivida Lounge Fort Lauderdale", email: "ftl@liquivida.com", phone: "(954) 909-4998", notes: "IV therapy & wellness in Fort Lauderdale. 3708 N Ocean Blvd, Fort Lauderdale FL 33308." },
  { brand_name: "Flow IV Infusion Therapy", email: "info@flowiv.co", phone: "(239) 450-8360", notes: "IV therapy across South Florida. Weston, Parkland, Hollywood, Doral, Fort Lauderdale." },
  { brand_name: "Livity Wellness", email: "info@livitywellnessfl.com", notes: "Mobile IV therapy in Miami & Fort Lauderdale." },
  { brand_name: "The Remedy IV Health + Wellness", email: "info@theremedyiv.com", notes: "IV therapy in Fort Lauderdale. Serves Broward, Miami-Dade, and Palm Beach." },

  // Salons
  { brand_name: "Peter Alexander Salon", email: "info@peteralexandersalon.com", notes: "High-end hair salon in Miami Beach. Specializes in balayage, highlights, extensions." },
  { brand_name: "Oren Salon Miami Beach", email: "info@orensalon.com", notes: "Best hair salon in Miami Beach. Balayage, Brazilian blowout, keratin, extensions." },
  { brand_name: "Salon Sora Boca Raton", email: "info@salonsora.com", phone: "(561) 338-7597", notes: "Boca Raton's most luxurious salon & spa. 1675 N Military Trail #700, Boca Raton FL 33486." },
  { brand_name: "Hair Company Boca Raton", email: "info@haircompanybocaraton.com", phone: "(561) 332-7446", notes: "Luxury hair salon in East Boca Raton." },

  // More fitness
  { brand_name: "Beau Monde Pilates", email: "info@beaumondepilates.com", notes: "Luxury Pilates studio in Miami Beach. Expert-led mat & reformer classes." },
  { brand_name: "Vault Fitness", email: "info@vault.fit", phone: "(561) 465-3841", notes: "Hot Pilates & fitness in Boca Raton & West Palm Beach." },

  // More jewelry
  { brand_name: "Regent Jewelers", email: "info@regentjewelers.net", notes: "Buy & sell jewelry in Miami. Fine jewelry & luxury watches." },
  { brand_name: "International Jewelers Exchange", email: "info@intljewelers.com", notes: "Fine jewelry in Boca Raton, Boynton Beach, and Aventura." },
  { brand_name: "By Design Jewelers", email: "info@bydesignjewelers.com", notes: "Custom jewelry design in South Florida." },
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

  if (newContacts.length === 0) return;

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
