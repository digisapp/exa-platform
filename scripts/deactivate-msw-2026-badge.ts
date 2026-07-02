import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MSW_BADGE_ID = "58b4cd75-812d-4f54-9c8e-f1e6d96e009d";

async function main() {
  const { data, error } = await supabase
    .from("badges")
    .update({ is_active: false })
    .eq("id", MSW_BADGE_ID)
    .eq("slug", "miami-swim-week-2026") // extra guard so we only touch MSW
    .select("id, name, slug, is_active");
  if (error) { console.error("FAILED:", error); process.exit(1); }
  console.log("Updated badge:", data);
}
main().then(() => process.exit(0));
