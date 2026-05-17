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
  const GIG = "c693fc9c-b6b4-4659-a323-0256ef3181c0";

  const { data: before } = await supabase.from("gigs").select("title, spots, spots_filled").eq("id", GIG).single();
  const { count: acceptedC } = await supabase.from("gig_applications").select("id", { count: "exact", head: true }).eq("gig_id", GIG).eq("status", "accepted");

  console.log("Before:", before, "| accepted count:", acceptedC);

  const { data: after, error } = await supabase
    .from("gigs")
    .update({ spots_filled: acceptedC ?? 0 })
    .eq("id", GIG)
    .select("title, spots, spots_filled")
    .single();

  if (error) { console.error("Update error:", error); process.exit(1); }
  console.log("After: ", after);
}

main().catch(e => { console.error(e); process.exit(1); });
