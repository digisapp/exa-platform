import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const tourismContacts = [
  // === US DMOs ===
  {
    brand_name: "Greater Miami CVB",
    contact_name: "David Whitaker",
    email: "DWhitaker@GMCVB.com",
    email_type: "partnerships",
    phone: "305-539-3001",
    website_url: "https://www.miamiandbeaches.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Miami",
    location_country: "US",
    notes: "President & CEO. Staff directory at miamiandbeaches.com/about-gmcvb/gmcvb-staff-directory. Has dedicated Content & Creative Services and Digital Marketing teams.",
  },
  {
    brand_name: "Visit Orlando",
    contact_name: "Dipika Hernandez",
    email: "Dipika.Hernandez@visitorlando.com",
    email_type: "pr",
    phone: "407-354-5586",
    website_url: "https://www.visitorlando.org",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Orlando",
    location_country: "US",
    notes: "PR Sr. Manager. Runs 52 individual + 10 group influencer press trips annually. Also contact Amy.Rodenbrock@visitorlando.com.",
  },
  {
    brand_name: "Discover Puerto Rico",
    contact_name: "Leah Chandler",
    email: "contact@tourism.pr.gov",
    email_type: "general",
    phone: "(787) 721-2400",
    website_url: "https://www.discoverpuertorico.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "San Juan",
    location_country: "PR",
    notes: "CMO. Active influencer campaigns including 'Live Boricua' and 'United Voices'. Industry contact form at discoverpuertorico.com/industry/form/contact-us.",
  },
  {
    brand_name: "Hawaii Visitors & Convention Bureau",
    contact_name: "Lei-Ann Field",
    email: "lfield@hvcb.org",
    email_type: "pr",
    phone: "(808) 924-0208",
    website_url: "https://www.hvcb.org",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Honolulu",
    location_country: "US",
    notes: "Sr. Director, Public Relations/Communications. Also Taryn Pascua tpascua@hvcb.org (808) 924-0240. Media site: media.gohawaii.com.",
  },
  {
    brand_name: "Visit California",
    contact_name: "Kristen Bonilla",
    email: "kbonilla@visitcalifornia.com",
    email_type: "pr",
    phone: "(916) 319-5421",
    website_url: "https://www.visitcalifornia.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Sacramento",
    location_country: "US",
    notes: "Has Digital Influencer Advisory Board, seasonal influencer trips, and 'California Dreamers Program' for bloggers. Industry site: industry.visitcalifornia.com.",
  },
  {
    brand_name: "NYC Tourism + Conventions",
    contact_name: "Julia Ngo",
    email: "jngo@nyctourism.com",
    email_type: "pr",
    phone: "212-484-1263",
    website_url: "https://business.nyctourism.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "New York",
    location_country: "US",
    notes: "Director of Media. Also press@nyctourism.com. CEO Julie Coker, CMO Nancy Mammana. 350+ media visits annually, 10 group fam trips. Emmy/Webby awarded content.",
  },
  {
    brand_name: "Las Vegas CVA",
    contact_name: null,
    email: "Advertising@lvcva.com",
    email_type: "general",
    phone: null,
    website_url: "https://www.lvcva.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Las Vegas",
    location_country: "US",
    notes: "VP Brand & Integrated Marketing: Andrew Luft. Full media contacts at lvcva.com/press-and-publicity/media-contacts/. Hosted influencers for F1 race promotion.",
  },
  {
    brand_name: "Experience Scottsdale",
    contact_name: "Alleson Dunaway",
    email: "adunaway@experiencescottsdale.com",
    email_type: "partnerships",
    phone: "480-949-6281",
    website_url: "https://www.experiencescottsdale.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Scottsdale",
    location_country: "US",
    notes: "Director of Partner Development. Also VP Marketing Michelle Myers mmyers@experiencescottsdale.com. CEO Rachel Sacco rsacco@experiencescottsdale.com.",
  },
  {
    brand_name: "Visit Austin",
    contact_name: null,
    email: "tourism@visitaustin.org",
    email_type: "general",
    phone: null,
    website_url: "https://www.austintexas.org",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Austin",
    location_country: "US",
    notes: "Submit influencer/creator requests through Press Inquiry Form. Partnership inquiry form at austintexas.org/partnerships/become-partner/.",
  },

  // === CARIBBEAN ===
  {
    brand_name: "Bahamas Ministry of Tourism",
    contact_name: "Mia Weech-Lange",
    email: "mlange@bahamas.com",
    email_type: "pr",
    phone: "(954) 236-9292",
    website_url: "https://www.bahamas.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Nassau",
    location_country: "BS",
    notes: "Executive Director, Global Communications. US office: 1200 S Pine Island Rd, Suite 450, Plantation FL. Also tourism@bahamas.com. PR agency: FINN Partners.",
  },
  {
    brand_name: "Turks & Caicos Tourist Board",
    contact_name: "Jennifer Pardo",
    email: "press@turksandcaicostourism.com",
    email_type: "press",
    phone: "(649) 946-4970",
    website_url: "https://turksandcaicostourism.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Providenciales",
    location_country: "TC",
    notes: "Senior Marketing Executive. Has Guest Blogger Program with formal guidelines. PR agency: J. Wade Public Relations turksandcaicosislandspr@jwadepr.com +1(415)483-5054.",
  },
  {
    brand_name: "Jamaica Tourist Board",
    contact_name: "Donovan White",
    email: "information@visitjamaica.com",
    email_type: "general",
    phone: "(876) 929-9200",
    website_url: "https://www.visitjamaica.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Kingston",
    location_country: "JM",
    notes: "Director of Tourism. dwhite@visitjamaica.com. Press center: jamaica-tourist-board.prezly.com. US PR agency: Lou Hammond Group. Already partnered with Breeze Travel.",
  },
  {
    brand_name: "Aruba Tourism Authority",
    contact_name: null,
    email: "ata.newjersey@aruba.com",
    email_type: "general",
    phone: "+297 582 3777",
    website_url: "https://www.aruba.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Oranjestad",
    location_country: "AW",
    notes: "US contact: ata.newjersey@aruba.com. North America PR agency: Zeno Group (handles influencer partnerships). Contact page: ata.aw/contact.",
  },
  {
    brand_name: "Barbados Tourism Marketing Inc.",
    contact_name: null,
    email: "btmiinfo@visitbarbados.org",
    email_type: "general",
    phone: "246-535-3700",
    website_url: "https://www.visitbarbados.org",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Warrens",
    location_country: "BB",
    notes: "Works with international influencers around events like Crop Over festival. Corporate contact: corporate.visitbarbados.org/contact-us/.",
  },
  {
    brand_name: "USVI Department of Tourism",
    contact_name: "Alani Henneman-Todman",
    email: "ahenneman@usvitourism.vi",
    email_type: "general",
    phone: "800-372-8784",
    website_url: "https://www.visitusvi.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Charlotte Amalie",
    location_country: "VI",
    notes: "Active influencer program as part of 'Naturally in Rhythm' campaign. Marketing page: dot.vi.gov/marketing/.",
  },
  {
    brand_name: "Cancun CVB / Visit Mexico",
    contact_name: null,
    email: null,
    email_type: "general",
    phone: "998-881-2745",
    website_url: "https://www.visit-mexico.mx",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Cancun",
    location_country: "MX",
    notes: "Visit Mexico contact form: visit-mexico.mx/contact/. Marketing handled by MMGY agency. SECTUR runs 'Impulsa Turismo' influencer campaigns.",
  },

  // === INTERNATIONAL ===
  {
    brand_name: "Indonesia Ministry of Tourism (Bali)",
    contact_name: null,
    email: "info@kemenparekraf.go.id",
    email_type: "general",
    phone: null,
    website_url: "https://www.kemenparekraf.go.id/en",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Jakarta",
    location_country: "ID",
    notes: "WhatsApp: 0811-895-6767. Aggressive influencer marketing for Bali. Badung Tourism Office runs 'We Love Bali' creator campaigns.",
  },
  {
    brand_name: "Greek National Tourism Organisation",
    contact_name: null,
    email: "info@visitgreece.gr",
    email_type: "general",
    phone: "+30 210 87 07 000",
    website_url: "https://www.visitgreece.gr",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Athens",
    location_country: "GR",
    notes: "Press office: +30 210 8707654. US office: 800 Third Ave, 24th Floor, New York NY 10022. Runs fam trips, workshops, and roadshows. GNTO offices abroad: visitgreece.gr/contact/gnto_offices_abroad/.",
  },
  {
    brand_name: "Visit Dubai",
    contact_name: null,
    email: "info@visitdubai.com",
    email_type: "general",
    phone: "(971) 4 2821111",
    website_url: "https://www.visitdubai.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Dubai",
    location_country: "AE",
    notes: "One of the most aggressive creator programs. $40M Content Creators Support Fund, Creators HQ initiative (10K influencers goal), Beautiful Destinations Academy partnership. Press: visitdubai.com/en/department-of-tourism/press-centre/press-contacts.",
  },
  {
    brand_name: "Tourism Authority of Thailand",
    contact_name: null,
    email: "info@tourismthailandla.com",
    email_type: "general",
    phone: "(1 323) 461-9814",
    website_url: "https://www.tat.or.th/en",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Bangkok",
    location_country: "TH",
    notes: "Launched TAT Connex (tatconnex.com) — free influencer marketing platform connecting creators with Thai tourism businesses. Register directly. LA office email above.",
  },
  {
    brand_name: "Visit Maldives (MMPRC)",
    contact_name: null,
    email: null,
    email_type: "general",
    phone: null,
    website_url: "https://www.visitmaldives.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Male",
    location_country: "MV",
    notes: "Core activities include media/influencer/celebrity fam trips, digital marketing, PR programs. Corporate contact form: corporate.visitmaldives.com/contact-us/.",
  },
  {
    brand_name: "Turismo de Portugal",
    contact_name: "Filipa Maria Cardoso",
    email: "media@visitportugal.com",
    email_type: "press",
    phone: "+351 211 140 200",
    website_url: "https://www.visitportugal.com",
    category: "tourism_board",
    contact_type: "tourism",
    location_city: "Lisbon",
    location_country: "PT",
    notes: "Director, International Communication & Digital Marketing. US inquiries: info.usa@turismodeportugal.pt. Press room: pressroom.visitportugal.com. Serves media, journalists, bloggers, and digital influencers.",
  },
];

async function main() {
  console.log(`Inserting ${tourismContacts.length} tourism board contacts...\n`);

  let inserted = 0;
  let skipped = 0;

  for (const contact of tourismContacts) {
    // Skip contacts with no email
    if (!contact.email) {
      console.log(`  Skipping ${contact.brand_name} (no email)`);
      skipped++;
      continue;
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("brand_outreach_contacts")
      .select("id")
      .eq("email", contact.email)
      .single();

    if (existing) {
      console.log(`  Already exists: ${contact.brand_name} (${contact.email})`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("brand_outreach_contacts")
      .insert({
        ...contact,
        status: "new",
      });

    if (error) {
      console.log(`  Error inserting ${contact.brand_name}: ${error.message}`);
    } else {
      console.log(`  Inserted: ${contact.brand_name}`);
      inserted++;
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
}

main().catch(console.error);
