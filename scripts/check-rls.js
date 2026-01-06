const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // Check RLS policies on campaign_models
  const { data: policies } = await supabase
    .rpc('pg_policies')
    .catch(() => null);
  
  // Get Miriam's user_id
  const { data: miriam } = await supabase
    .from("models")
    .select("id, user_id, username")
    .eq("username", "miriam")
    .single();
  
  console.log("Miriam:", miriam);

  if (!miriam) return;

  // Test query as Miriam would see it (simulate with service role but logging the expected RLS)
  // Check if model can read campaign_models
  const { data: cmPolicies, error: cmErr } = await supabase.rpc('exec_sql', {
    sql: `SELECT policyname, permissive, roles, cmd, qual 
          FROM pg_policies WHERE tablename = 'campaign_models'`
  }).catch(() => ({ data: null, error: 'no rpc' }));

  console.log("\ncampaign_models policies:", cmPolicies || cmErr);

  // Check if model can read offer_responses  
  const { data: orPolicies, error: orErr } = await supabase.rpc('exec_sql', {
    sql: `SELECT policyname, permissive, roles, cmd, qual 
          FROM pg_policies WHERE tablename = 'offer_responses'`
  }).catch(() => ({ data: null, error: 'no rpc' }));

  console.log("\noffer_responses policies:", orPolicies || orErr);
}

check().catch(console.error);
