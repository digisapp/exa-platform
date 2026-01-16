import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  // Search for recent unapproved accounts (likely spam)
  const { data: unapproved } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name, is_approved, created_at")
    .eq("is_approved", false)
    .order("created_at", { ascending: false })
    .limit(20);

  console.log("Recent UNAPPROVED model accounts:");
  console.log("================================");
  for (const m of unapproved || []) {
    console.log(`  Username: ${m.username}`);
    console.log(`  Name: ${m.first_name} ${m.last_name}`);
    console.log(`  Email: ${m.email}`);
    console.log(`  Has login: ${m.user_id ? "YES" : "NO"}`);
    console.log(`  Created: ${m.created_at}`);
    console.log();
  }

  // Also check for the specific account mentioned
  console.log("\nSearching for 'Jsn' or 'HmA' specifically...");
  const { data: specific } = await supabase
    .from("models")
    .select("id, username, email, user_id, first_name, last_name, is_approved, created_at")
    .or("username.eq.Jsn,username.eq.jsn,first_name.eq.HmA,first_name.eq.hma");

  if (specific && specific.length > 0) {
    console.log("Found exact matches:");
    for (const m of specific) {
      console.log(`  Username: ${m.username}`);
      console.log(`  Name: ${m.first_name} ${m.last_name}`);
      console.log(`  Email: ${m.email}`);
      console.log(`  ID: ${m.id}`);
    }
  } else {
    console.log("No exact matches found for 'Jsn' or 'HmA'");
  }
}

main().catch(console.error);
