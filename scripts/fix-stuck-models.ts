import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixStuckModels() {
  console.log("🔍 Finding stuck models (have user_id but not approved)...\n");

  // Find all models who have user_id but aren't approved
  const { data: stuckModels, error: fetchError } = await supabase
    .from("models")
    .select("id, username, email, user_id, is_approved, first_name, last_name")
    .not("user_id", "is", null)
    .or("is_approved.is.null,is_approved.eq.false");

  if (fetchError) {
    console.error("❌ Error fetching stuck models:", fetchError);
    process.exit(1);
  }

  if (!stuckModels || stuckModels.length === 0) {
    console.log("✅ No stuck models found! All models with logins are approved.");
    return;
  }

  console.log(`Found ${stuckModels.length} stuck model(s):\n`);
  stuckModels.forEach((m, i) => {
    const name = m.first_name ? `${m.first_name} ${m.last_name || ""}`.trim() : m.username;
    console.log(`  ${i + 1}. ${name} (${m.email || "no email"}) - is_approved: ${m.is_approved}`);
  });

  console.log("\n🔧 Fixing stuck models...\n");

  // Approve all stuck models
  const { error: updateError } = await supabase
    .from("models")
    .update({ is_approved: true })
    .not("user_id", "is", null)
    .or("is_approved.is.null,is_approved.eq.false");

  if (updateError) {
    console.error("❌ Error updating models:", updateError);
    process.exit(1);
  }

  console.log(`✅ Successfully approved ${stuckModels.length} model(s)!`);
  console.log("\nThese models can now access their dashboard without being stuck on pending-approval.");
}

fixStuckModels().catch(console.error);
