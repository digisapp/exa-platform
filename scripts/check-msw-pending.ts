import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title")
    .ilike("title", "%miami swim week%")
    .limit(5);

  if (!gigs?.length) {
    console.log("No gig found");
    return;
  }

  const gig = gigs[0];
  console.log("Gig:", gig.title, gig.id);

  const { data: apps, error } = await supabase
    .from("gig_applications")
    .select("id, status, model:models(id, email, first_name)")
    .eq("gig_id", gig.id)
    .eq("status", "pending");

  if (error) {
    console.log("Error:", error);
    return;
  }

  const withEmail = (apps || []).filter((a: any) => a.model?.email);
  console.log("Total pending:", apps?.length);
  console.log("With email:", withEmail.length);
  console.log(
    "First 5:",
    withEmail
      .slice(0, 5)
      .map((a: any) => `${a.model.email} (${a.model.first_name || "no name"})`)
  );
}

main().catch(console.error);
