import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// All corrections verified by cross-checking official hotel websites, PR pages, press portals
const CORRECTIONS: Array<{
  brand_name: string;
  old_email: string;
  new_email: string;
  note: string;
}> = [
  // luxury-hotels-influencer-outreach.json
  {
    brand_name: "Desa Potato Head Seminyak",
    old_email: "press@potatohead.co",
    new_email: "info@potatohead.co",
    note: "press@ not confirmed publicly; info@ is listed contact",
  },
  {
    brand_name: "Capella Ubud Bali",
    old_email: "info.ubud@capellahotels.com",
    new_email: "devina.hindom@capellahotels.com",
    note: "Devina Hindom confirmed as PR contact on official Capella Ubud press page",
  },
  {
    brand_name: "Anantara Uluwatu Bali",
    old_email: "whakim@anantara.com",
    new_email: "dprimady@anantara.com",
    note: "Wiwin Hakim moved roles; current MarCom contact is dprimady@anantara.com",
  },
  {
    brand_name: "NIHI Sumba",
    old_email: "galit@nihi.com",
    new_email: "info@nihi.com",
    note: "Galit Schwarz left NIHI (now at Villa Embrace St. Barths); use info@nihi.com",
  },

  // indonesia-hotels.json
  {
    brand_name: "Komaneka Resorts",
    old_email: "reservation@komaneka.com",
    new_email: "marketing@komaneka.com",
    note: "reservation@ is booking inbox; marketing@ is the correct outreach contact",
  },
  {
    brand_name: "COMO Uma Ubud",
    old_email: "ubu.reservations@como.bz",
    new_email: "umuubud@como.bz",
    note: "Active email is umuubud@como.bz per COMO's official contact page",
  },

  // thailand-vietnam-hotels.json
  {
    brand_name: "137 Pillars House Chiang Mai",
    old_email: "reservations@137pillarshouse.com",
    new_email: "internationalmedia@137pillarshouse.com",
    note: "Dedicated international media contact confirmed at 137pillarshotels.com/media",
  },
  {
    brand_name: "Rosewood Phnom Penh",
    old_email: "phnom.penh@rosewoodhotels.com",
    new_email: "phnompenh@rosewoodhotels.com",
    note: "Correct format is phnompenh@ (no dot) per official Rosewood contact page",
  },
  {
    brand_name: "W Koh Samui",
    old_email: "wkohsamui@whotels.com",
    new_email: "wkohsamui.welcome@whotels.com",
    note: "Confirmed W Hotels format uses .welcome@ suffix",
  },

  // mexico-caribbean-hotels-outreach.json
  {
    brand_name: "Casa Malca Tulum",
    old_email: "info@casamalca.com",
    new_email: "press@casamalca.com",
    note: "Dedicated press page exists at casamalca.com/press with press@ contact",
  },
  {
    brand_name: "Mezzanine Tulum (a Colibri Boutique Hotel)",
    old_email: "reservations@mezzaninetulum.com",
    new_email: "reservations.mezzanine@colibriboutiquehotels.com",
    note: "Current canonical email uses Colibri group domain",
  },
  {
    brand_name: "Viceroy Riviera Maya",
    old_email: "info@viceroyhotelsandresorts.com",
    new_email: "rivieramaya@purple-pr.com",
    note: "Press handled by Purple PR per official Viceroy press page",
  },
  {
    brand_name: "Grand Velas Riviera Maya",
    old_email: "reservations@velasresorts.com",
    new_email: "sterritt@kwepr.com",
    note: "KWE Partners (Megan Sterritt) is PR contact; reservations@ is wrong dept",
  },
  {
    brand_name: "Chable Hotels (Chable Yucatan + Chable Maroma)",
    old_email: "info@chablehotels.com",
    new_email: "pr.comunicacion@chablehotels.com",
    note: "Dedicated press email confirmed at chablehotels.com/chable-press",
  },

  // dubai-hotels-outreach.json
  {
    brand_name: "Bab Al Shams Desert Resort",
    old_email: "paayal.dunani@sociate.ae",
    new_email: "alice.issigonis@kerzner.com",
    note: "Acquired by Kerzner International Feb 2023; Alice Issigonis is current media contact",
  },
  {
    brand_name: "Sofitel Dubai The Palm Resort & Spa",
    old_email: "H6541-RE@sofitel.com",
    new_email: "callcentre.palmdubai@sofitel.com",
    note: "H6541-RE@ is internal backend reservations code, not a real contact",
  },

  // mallorca-croatia-hotels.json
  {
    brand_name: "Nobu Hotel Ibiza Bay",
    old_email: "reservations-ibiza@nobuhotels.com",
    new_email: "info-ibiza@nobuhotels.com",
    note: "Correct email per official Nobu Ibiza contact page",
  },

  // europe-luxury-hotels-influencer-outreach.json
  {
    brand_name: "Hôtel Martinez Cannes",
    old_email: "communication@hotel-martinez.com",
    new_email: "info@hotel-martinez.com",
    note: "communication@ could not be confirmed; info@ is verified general contact",
  },
  {
    brand_name: "Sun Gardens Dubrovnik",
    old_email: "info@sungardensdubrovnik.com",
    new_email: "media@sungardensdubrovnik.com",
    note: "Official press corner at dubrovniksungardens.com specifies media@ for all press",
  },

  // global-misc-hotels.json
  {
    brand_name: "The Reykjavik EDITION",
    old_email: "ge.rek@editionhotels.com",
    new_email: "ReykjavikEDITION@purplepr.com",
    note: "Purple PR is official press rep; confirmed on EDITION Hotels contact page",
  },
  {
    brand_name: "Hvammsvik Hot Springs",
    old_email: "info@hvammsvik.is",
    new_email: "info@hvammsvik.com",
    note: "Official domain is hvammsvik.com not .is",
  },
  {
    brand_name: "ICEHOTEL",
    old_email: "info@icehotel.com",
    new_email: "press@icehotel.com",
    note: "Dedicated press email confirmed at icehotel.com/press-media",
  },
  {
    brand_name: "Six Senses Kaplankaya",
    old_email: "reservations-kaplankaya@sixsenses.com",
    new_email: "press@sixsenses.com",
    note: "reservations@ is wrong dept; global PR is press@sixsenses.com",
  },
  {
    brand_name: "Mandarin Oriental Bodrum",
    old_email: "mobod-reservations@mohg.com",
    new_email: "corlikowski@mohg.com",
    note: "Reservations inbox replaced with global PR Director Chris Orlikowski",
  },
  {
    brand_name: "Six Senses Douro Valley",
    old_email: "reservations-dourovalley@sixsenses.com",
    new_email: "press@sixsenses.com",
    note: "reservations@ is wrong dept; global PR is press@sixsenses.com",
  },
  {
    brand_name: "Mandarin Oriental Tokyo",
    old_email: "motyo-reservations@mohg.com",
    new_email: "corlikowski@mohg.com",
    note: "Reservations inbox replaced with global PR Director Chris Orlikowski",
  },
  {
    brand_name: "HOSHINOYA Tokyo",
    old_email: "hoshinoya-tokyo@hoshinoresorts.com",
    new_email: "global@hoshinoresort.com",
    note: "Global PR contact is global@hoshinoresort.com (hoshinoresort.com domain)",
  },
  {
    brand_name: "Anantara Hotels & Resorts (Global)",
    old_email: "nrhymes@anantara.com",
    new_email: "nrhymes@minor.com",
    note: "Natasha Rhymes elevated to VP at Minor Hotels; current email is nrhymes@minor.com",
  },
  {
    brand_name: "Memmo Alfama",
    old_email: "info@memmohotels.com",
    new_email: "alfama@memmohotels.com",
    note: "info@ is group-level generic; alfama@ is property-specific contact",
  },
  {
    brand_name: "Vila Vita Parc Resort & Spa",
    old_email: "reservas@vilavitaparc.com",
    new_email: "rgoncalves@vilavitaparc.com",
    note: "Rita Goncalves is PR & Communications Manager; reservas@ is reservations",
  },
  {
    brand_name: "Soho House Istanbul",
    old_email: "reservations.istanbul@sohohouse.com",
    new_email: "press@sohohouseco.com",
    note: "press@ is global Soho House press contact; reservations@ is wrong dept",
  },
  {
    brand_name: "Small Luxury Hotels of the World (SLH)",
    old_email: "contact@slh.com",
    new_email: "pegi.amarteifio@slh.com",
    note: "Pegi Amarteifio (SVP Global Communications) confirmed at slh.com/about-slh/media",
  },
  {
    brand_name: "Museum Hotel Cappadocia",
    old_email: "reservations@museumhotel.com.tr",
    new_email: "info@museumhotel.com.tr",
    note: "reservations@ is booking inbox; info@ is general contact",
  },

  // brazil-southamerica-hotels.json
  {
    brand_name: "Fasano Trancoso",
    old_email: "reservas@reservatrancoso.com.br",
    new_email: "reservas@fasano.com.br",
    note: "reservatrancoso.com.br is a local concierge agent, not Fasano group domain",
  },
  {
    brand_name: "LK Design Hotel Florianópolis",
    old_email: "reservas@lkdesignhotel.com.br",
    new_email: "reservaslkhotel@atriohoteis.com.br",
    note: "Managed by Atrio Hotels; correct domain is atriohoteis.com.br per official page",
  },
  {
    brand_name: "Caiman Ecological Refuge",
    old_email: "caiman@caiman.com.br",
    new_email: "reservas@caiman.com.br",
    note: "Official contact is reservas@caiman.com.br per caiman.com.br/contact",
  },
  {
    brand_name: "Juma Amazon Lodge",
    old_email: "reservas@jumalodge.com.br",
    new_email: "reservas@jumahoteis.com.br",
    note: "Parent group domain is jumahoteis.com.br, confirmed on official site",
  },

  // morocco-africa-hotels.json
  {
    brand_name: "Riad Fes",
    old_email: "info@riadfes.com",
    new_email: "contact@riadfes.com",
    note: "contact@ is confirmed official email across multiple sources",
  },
  {
    brand_name: "Heure Bleue Palais",
    old_email: "contact@heure-bleue.com",
    new_email: "reservation@heure-bleue.com",
    note: "reservation@ is confirmed on heure-bleue.com/contact",
  },
  {
    brand_name: "Giraffe Manor (The Safari Collection)",
    old_email: "michelle@besandco.com",
    new_email: "info@thesafaricollection.com",
    note: "besandco.com is a design agency; Safari Collection direct is info@thesafaricollection.com",
  },
  {
    brand_name: "One&Only Gorilla's Nest",
    old_email: "info@oneandonlyresorts.com",
    new_email: "reservations@oneandonlygorillasnest.com",
    note: "Generic group inbox replaced with property-specific contact",
  },
];

// Entries to mark as do-not-contact (closed/inactive)
const DO_NOT_CONTACT: Array<{ brand_name: string; reason: string }> = [
  {
    brand_name: "Anantara Seminyak Bali",
    reason: "Property listed as CLOSED on official Anantara site",
  },
  {
    brand_name: "Nayara Springs (Nayara Resorts)",
    reason: "employments@nayararesorts.com is HR/recruitment inbox, not PR contact",
  },
];

async function main() {
  console.log("Starting email corrections...\n");

  let updated = 0;
  let notFound = 0;
  let errors = 0;

  // Apply email corrections
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

  // Mark do-not-contact entries
  console.log("\nMarking do-not-contact entries...");
  for (const entry of DO_NOT_CONTACT) {
    const { data, error } = await supabase
      .from("brand_outreach_contacts")
      .update({ status: "do_not_contact", notes: entry.reason })
      .eq("brand_name", entry.brand_name)
      .eq("category", "travel")
      .select("id");

    if (error) {
      console.error(`ERROR marking ${entry.brand_name}:`, error.message);
    } else if (!data || data.length === 0) {
      console.warn(`NOT FOUND: ${entry.brand_name}`);
    } else {
      console.log(`✓ DNC: ${entry.brand_name} — ${entry.reason}`);
    }
  }

  console.log(`\n✓ Done — ${updated} updated, ${notFound} not found, ${errors} errors`);
}

main().catch(console.error);
