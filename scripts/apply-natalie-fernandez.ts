import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const MODEL_ID = "d770b873-86f7-480b-b20a-8a5d4accf99e";
const GIG_SLUG = "miami-swim-week-2026";

async function main() {
  // Verify model
  const { data: model, error: mErr } = await supabase
    .from("models")
    .select("id, username, first_name, last_name, instagram_url, is_approved")
    .eq("id", MODEL_ID)
    .single();
  if (mErr || !model) { console.error("Model not found:", mErr); process.exit(1); }
  console.log("Model:", model);

  // Find MSW gig
  const { data: gig, error: gErr } = await supabase
    .from("gigs")
    .select("id, title, slug, status, spots, spots_filled")
    .eq("slug", GIG_SLUG)
    .single();
  if (gErr || !gig) { console.error("Gig not found:", gErr); process.exit(1); }
  console.log("\nGig:", gig);

  // Check for existing application
  const { data: existing } = await supabase
    .from("gig_applications")
    .select("id, status, applied_at")
    .eq("gig_id", gig.id)
    .eq("model_id", model.id)
    .maybeSingle();
  if (existing) { console.log("\nAlready applied:", existing); process.exit(0); }

  const { data: app, error: insErr } = await supabase
    .from("gig_applications")
    .insert({ gig_id: gig.id, model_id: model.id, status: "pending" })
    .select()
    .single();
  if (insErr) { console.error("Insert error:", insErr); process.exit(1); }
  console.log("\nApplication created:", app);
  // Do NOT touch gigs.spots_filled — it tracks accepted-only,
  // bumped by the admin review route when an application is accepted.
}

main().catch((e) => { console.error(e); process.exit(1); });
