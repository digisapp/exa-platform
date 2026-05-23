import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TARGET = "angelina_morris@icloud.com";
const ANGELINA_USER_ID = "c05ec9ef-f24f-4ef9-8240-042c0e004e7d";

async function main() {
  let page = 1;
  const matches: Array<{ id: string; email?: string; created_at?: string }> = [];
  while (true) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data.users.length) break;
    for (const u of data.users) {
      if (u.email?.toLowerCase() === TARGET.toLowerCase()) {
        matches.push({ id: u.id, email: u.email, created_at: u.created_at });
      }
    }
    if (data.users.length < 1000) break;
    page++;
  }
  console.log("Auth users with email", TARGET, ":", matches);

  // Also check models / fans tables for the address
  const { data: modelHit } = await supabase.from("models").select("id, user_id, username, email").eq("email", TARGET);
  console.log("models rows with that email:", modelHit);

  const { data: fanHit } = await supabase.from("fans").select("id, user_id, email").eq("email", TARGET);
  console.log("fans rows with that email:", fanHit);

  console.log("\nAngelina's user_id is:", ANGELINA_USER_ID);
}

main().catch(console.error);
