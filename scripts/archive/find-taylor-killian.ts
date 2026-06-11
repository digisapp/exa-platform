import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve("/Users/examodels/Desktop/exa-platform/.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Search models by name, email, instagram for "killian" or "taylor"
  console.log("=== Searching models for 'killian' (name/username/instagram) ===");
  const { data: byKillian } = await supabase
    .from("models")
    .select("*")
    .or("first_name.ilike.%killian%,last_name.ilike.%killian%,username.ilike.%killian%,instagram_url.ilike.%killian%,email.ilike.%killian%");
  console.log(JSON.stringify(byKillian, null, 2));

  console.log("\n=== Searching models for email 'tkillian' ===");
  const { data: byEmail } = await supabase
    .from("models")
    .select("*")
    .ilike("email", "%tkillian%");
  console.log(JSON.stringify(byEmail, null, 2));

  console.log("\n=== Searching profiles/users for 'killian' ===");
  // try multiple possible tables
  const tables = ["profiles", "users", "user_profiles"];
  for (const t of tables) {
    const { data, error } = await supabase
      .from(t)
      .select("*")
      .or("email.ilike.%killian%,full_name.ilike.%killian%")
      .limit(10);
    if (!error) {
      console.log(`-- ${t}:`, JSON.stringify(data, null, 2));
    }
  }

  console.log("\n=== Searching first_name='Taylor' models ===");
  const { data: taylors } = await supabase
    .from("models")
    .select("id, first_name, last_name, username, email, instagram_url, city, state, country, is_approved")
    .ilike("first_name", "Taylor");
  console.log(JSON.stringify(taylors, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
