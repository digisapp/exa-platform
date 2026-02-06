import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function addMoreBrands() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Additional brands from research
  const newBrands = [
    // Brands with verified PR/Press emails
    { brand_name: "Gottex", contact_name: null, email: "info@gottexbrand.com", email_type: "general", website_url: "https://www.gottex-swimwear.com", instagram_handle: "gottex", category: "swimwear", location_city: "Israel", location_country: "Israel", notes: "Luxury swimwear brand, multiple sub-brands including Profile, Flirtt, AuNaturel" },
    { brand_name: "Cupshe", contact_name: "Frankchesska Fortoul", email: "frankchesska@cupshe.com", email_type: "pr", website_url: "https://www.cupshe.com", instagram_handle: "cupshe", category: "swimwear", location_city: null, location_country: "USA", notes: "Major swimwear retailer, 10-year anniversary, Iskra Lawrence collab" },
    { brand_name: "SHAN", contact_name: null, email: "customercare@shan.ca", email_type: "general", website_url: "https://www.shan.ca", instagram_handle: "shanswimwear", category: "swimwear", location_city: "Quebec", location_country: "Canada", notes: "Canadian luxury swimwear since 1985, founded by Chantal Levesque" },
    { brand_name: "Dippin Daisys", contact_name: null, email: "social@dippindaisys.com", email_type: "partnerships", website_url: "https://dippindaisys.com", instagram_handle: "dippindaisys", category: "swimwear", location_city: null, location_country: "USA", notes: "Sustainable swimwear, runway at Tala Beach 1 Hotel Miami" },
    { brand_name: "Oceanus", contact_name: null, email: "customerservices@oceanusswimwear.com", email_type: "general", website_url: "https://oceanusthelabel.com", instagram_handle: "oceanusswimwear", category: "swimwear", location_city: "London", location_country: "UK", notes: "Luxury embellished swimwear, PARAISO runway headliner" },
    { brand_name: "Ema Savahl Couture", contact_name: "Ema Savahl", email: "info@emasavahl.com", email_type: "general", website_url: "https://emasavahl.com", instagram_handle: "emasavahl", category: "swimwear", location_city: "Miami", location_country: "USA", notes: "Handcrafted wearable art swimwear, Miss Universe designer" },
    { brand_name: "Badgley Mischka Swim", contact_name: "Rob Caldwell", email: "rcaldwell@badgleymischka.com", email_type: "pr", website_url: "https://www.badgleymischka.com", instagram_handle: "badgleymischka", category: "luxury", location_city: "New York", location_country: "USA", notes: "Luxury designer brand swimwear line" },
    { brand_name: "Stone Fox Swim", contact_name: null, email: "social@stonefoxswim.com", email_type: "pr", website_url: "https://stonefoxswim.com", instagram_handle: "stonefoxswim", category: "swimwear", location_city: "Redondo Beach", location_country: "USA", notes: "California sustainable swimwear by Chelsea Bell" },
    { brand_name: "Rio de Sol", contact_name: null, email: "export@riodesol.com", email_type: "wholesale", website_url: "https://riodesol.com", instagram_handle: "riodesol", category: "swimwear", location_city: "Brazil", location_country: "Brazil", notes: "Brazilian lifestyle swimwear brand" },

    // SwimShow brands
    { brand_name: "Body Glove", contact_name: null, email: "info@bodyglove.com", email_type: "general", website_url: "https://www.bodyglove.com", instagram_handle: "bodyglove", category: "swimwear", location_city: "California", location_country: "USA", notes: "Original California surf brand, wetsuits and swimwear" },
    { brand_name: "Natori", contact_name: null, email: "customerservice@natori.com", email_type: "general", website_url: "https://www.natori.com", instagram_handle: "naborisswim", category: "luxury", location_city: "New York", location_country: "USA", notes: "Designer luxury lingerie and swimwear" },
    { brand_name: "Red Carter", contact_name: null, email: "info@redcarterswim.com", email_type: "general", website_url: "https://redcarterswim.com", instagram_handle: "redcarterswim", category: "swimwear", location_city: "Miami", location_country: "USA", notes: "Miami-based designer swimwear" },
    { brand_name: "Sea Level", contact_name: null, email: "hello@sealevelswim.com", email_type: "general", website_url: "https://sealevelswim.com", instagram_handle: "sealevelswim", category: "swimwear", location_city: "Australia", location_country: "Australia", notes: "Australian D-cup swimwear specialist" },
    { brand_name: "Hale Bob", contact_name: null, email: "customerservice@halebob.com", email_type: "general", website_url: "https://www.halebob.com", instagram_handle: "halebob", category: "resort_wear", location_city: "Los Angeles", location_country: "USA", notes: "Resort wear and vibrant prints" },
    { brand_name: "Rhythm", contact_name: null, email: "hello@rhythmlivin.com", email_type: "general", website_url: "https://www.rhythmlivin.com", instagram_handle: "rhythm", category: "swimwear", location_city: "Australia", location_country: "Australia", notes: "Australian surf and swim brand" },

    // PARAISO/Miami Swim Week brands
    { brand_name: "Leslie Amon", contact_name: "Leslie Amon", email: "info@leslieamon.com", email_type: "general", website_url: "https://www.leslieamon.com", instagram_handle: "leslieamonswim", category: "swimwear", location_city: "Switzerland", location_country: "Switzerland", notes: "Swiss-Egyptian designer, made in Portugal/Italy" },
    { brand_name: "Montce", contact_name: null, email: "customerservice@montce.com", email_type: "general", website_url: "https://www.montce.com", instagram_handle: "montce", category: "swimwear", location_city: "Miami", location_country: "USA", notes: "Fit-focused swimwear designed for confidence" },
    { brand_name: "Sinesia Karol", contact_name: null, email: "info@sinesiakarol.com", email_type: "general", website_url: "https://sinesiakarol.us", instagram_handle: "sinesiakarol", category: "swimwear", location_city: "Brazil", location_country: "Brazil", notes: "100% Brazilian-made swimwear, Miami Swim Week regular" },
    { brand_name: "Salty Mermaid", contact_name: null, email: "hello@saltymermaid.com", email_type: "general", website_url: "https://saltymermaid.com", instagram_handle: "saltymermaidswim", category: "swimwear", location_city: null, location_country: "USA", notes: "Featured Sofia Jamora, Alexa Collins on runway" },
    { brand_name: "Mars the Label", contact_name: null, email: "hello@marsthelabel.com", email_type: "general", website_url: "https://marsthelabel.com", instagram_handle: "marsthelabel", category: "swimwear", location_city: "Australia", location_country: "Australia", notes: "Miami Swim Week featured brand" },
    { brand_name: "Moda Minx", contact_name: null, email: "hello@modaminx.com", email_type: "general", website_url: "https://modaminx.com", instagram_handle: "modaminx", category: "swimwear", location_city: "UK", location_country: "UK", notes: "Miami Swim Week featured brand, trendy designs" },
    { brand_name: "Lahana Swim", contact_name: null, email: "info@lahanaswim.com", email_type: "general", website_url: "https://lahanaswim.com", instagram_handle: "lahanaswim", category: "swimwear", location_city: "Australia", location_country: "Australia", notes: "Australian luxury swimwear, PARAISO featured" },

    // Additional luxury brands
    { brand_name: "Vix Paula Hermanny", contact_name: null, email: "info@vixpaulahermanny.com", email_type: "general", website_url: "https://www.vixpaulahermanny.com", instagram_handle: "vixpaulahermanny", category: "swimwear", location_city: "San Diego", location_country: "USA", notes: "Brazilian heritage luxury swimwear" },
    { brand_name: "Agua Clara", contact_name: null, email: "info@aguaclara-swimwear.com", email_type: "general", website_url: "https://www.aguaclara-swimwear.com", instagram_handle: "aguaclaraofficial", category: "swimwear", location_city: "Lima", location_country: "Peru", notes: "Peruvian luxury swimwear since 1987" },
    { brand_name: "Azulu", contact_name: null, email: "info@azulu.com", email_type: "general", website_url: "https://azulu.com", instagram_handle: "azuluoficial", category: "resort_wear", location_city: "Colombia", location_country: "Colombia", notes: "Colombian heritage resortwear, PARAISO featured" },

    // Emerging designers from PARAISO
    { brand_name: "Palondre the Label", contact_name: null, email: "info@palondrethelabel.com", email_type: "general", website_url: "https://palondrethelabel.com", instagram_handle: "palondrethelabel", category: "swimwear", location_city: null, location_country: "USA", notes: "PARAISO Poolside Pop-Up featured" },
    { brand_name: "Zemra Swim", contact_name: null, email: "info@zemraswim.com", email_type: "general", website_url: "https://zemraswim.com", instagram_handle: "zemraswim", category: "swimwear", location_city: null, location_country: "USA", notes: "PARAISO Poolside Pop-Up featured" },
    { brand_name: "Aventura Swimwear", contact_name: null, email: "info@aventuraswimwear.com", email_type: "general", website_url: "https://aventuraswimwear.com", instagram_handle: "aventuraswimwear", category: "swimwear", location_city: null, location_country: "USA", notes: "Spotlight.Fashion collective at PARAISO 2025" },
    { brand_name: "Mariella Swimwear", contact_name: null, email: "info@mariellaswimwear.com", email_type: "general", website_url: "https://mariellaswimwear.com", instagram_handle: "mariellaswimwear", category: "swimwear", location_city: null, location_country: "USA", notes: "Spotlight.Fashion collective at PARAISO 2025" },

    // More Brazilian brands
    { brand_name: "SIGAL", contact_name: null, email: "info@sigal.com.br", email_type: "general", website_url: "https://sigal.com.br", instagram_handle: "sigaloficial", category: "swimwear", location_city: "Brazil", location_country: "Brazil", notes: "Miami favorite, PARAISO featured brand" },
  ];

  console.log(`Adding ${newBrands.length} new brands to the database...`);

  let added = 0;
  let skipped = 0;

  for (const brand of newBrands) {
    // Check if brand already exists
    const { data: existing } = await supabase
      .from("brand_outreach_contacts")
      .select("id")
      .eq("brand_name", brand.brand_name)
      .single();

    if (existing) {
      console.log(`Skipping ${brand.brand_name} - already exists`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("brand_outreach_contacts").insert({
      ...brand,
      status: "new",
    });

    if (error) {
      console.error(`Error adding ${brand.brand_name}:`, error.message);
    } else {
      console.log(`Added: ${brand.brand_name}`);
      added++;
    }
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}`);

  // Get total count
  const { count } = await supabase
    .from("brand_outreach_contacts")
    .select("*", { count: "exact", head: true });

  console.log(`Total brands in database: ${count}`);
}

addMoreBrands().catch(console.error);
