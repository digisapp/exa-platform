const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // List all models
  const { data: models } = await supabase
    .from("models")
    .select("id, username, first_name, last_name")
    .limit(20);
  
  console.log("All models:");
  models?.forEach(m => console.log(`  - ${m.username}: ${m.first_name} ${m.last_name} (${m.id})`));

  // Check all campaign_models
  const { data: campaignModels } = await supabase
    .from("campaign_models")
    .select("*, campaigns(name), models(username)");
  
  console.log("\nAll campaign_models entries:", campaignModels);

  // Check all offers
  const { data: offers } = await supabase
    .from("offers")
    .select("id, title, campaign_id, status");
  
  console.log("\nAll offers:", offers);

  // Check all offer_responses
  const { data: responses } = await supabase
    .from("offer_responses")
    .select("*, models(username), offers(title)");
  
  console.log("\nAll offer_responses:", responses);
}

check().catch(console.error);
