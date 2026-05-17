import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_ID = "954a4ea6-cbf0-4a42-be4f-61294c607689";

async function main() {
  const { data: before } = await supabase
    .from("gig_applications")
    .select("id, status, reviewed_at, reviewed_by, admin_note")
    .eq("id", APP_ID)
    .single();
  console.log("Before:", before);

  const { data: after, error } = await supabase
    .from("gig_applications")
    .update({ status: "pending", reviewed_at: null, reviewed_by: null })
    .eq("id", APP_ID)
    .select()
    .single();

  if (error) { console.error("Update error:", error); process.exit(1); }
  console.log("\nAfter:", { id: after.id, status: after.status, reviewed_at: after.reviewed_at, reviewed_by: after.reviewed_by });
}

main().catch((e) => { console.error(e); process.exit(1); });
