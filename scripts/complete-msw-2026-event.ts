import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  const { data: before } = await supabase
    .from("events").select("id, slug, name, status, start_date, end_date")
    .eq("slug", "miami-swim-week-2026").single();
  console.log("Before:", before);

  const { data, error } = await supabase
    .from("events")
    .update({ status: "completed" })
    .eq("slug", "miami-swim-week-2026")
    .select("id, slug, status");
  if (error) { console.error("FAILED:", error); process.exit(1); }
  console.log("After:", data);
}
main().then(() => process.exit(0));
