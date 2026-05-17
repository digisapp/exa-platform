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
  const { data: gig } = await supabase.from("gigs").select("title, spots, spots_filled").eq("id", GIG).single();
  console.log("Gig:", gig);

  const { count: pendingC } = await supabase.from("gig_applications").select("id", { count: "exact", head: true }).eq("gig_id", GIG).eq("status", "pending");
  const { count: acceptedC } = await supabase.from("gig_applications").select("id", { count: "exact", head: true }).eq("gig_id", GIG).eq("status", "accepted");
  const { count: rejectedC } = await supabase.from("gig_applications").select("id", { count: "exact", head: true }).eq("gig_id", GIG).eq("status", "rejected");
  const { count: cancelledC } = await supabase.from("gig_applications").select("id", { count: "exact", head: true }).eq("gig_id", GIG).eq("status", "cancelled");

  console.log("\nApplication counts by status:");
  console.log("  pending:  ", pendingC);
  console.log("  accepted: ", acceptedC);
  console.log("  rejected: ", rejectedC);
  console.log("  cancelled:", cancelledC);

  console.log("\nspots_filled currently:", gig?.spots_filled);
  console.log("accepted count:        ", acceptedC);
  console.log("delta (should be 0):   ", (gig?.spots_filled ?? 0) - (acceptedC ?? 0));
}

main().catch(e => { console.error(e); process.exit(1); });
