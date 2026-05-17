import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const HANDLE = "azizamajor";
const FIRST = "Aziza";
const LAST = "Major";

async function main() {
  // Find model
  const candidates: any[] = [];
  for (const q of [
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").eq("username", HANDLE).maybeSingle(),
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").eq("username", HANDLE.replace(".", "")).maybeSingle(),
    supabase.from("models").select("id, username, first_name, last_name, instagram_url, is_approved, user_id").ilike("instagram_url", `%${HANDLE}%`).maybeSingle(),
  ]) {
    const { data } = await q;
    if (data) candidates.push(data);
  }

  // Also search by name (could be multiple)
  const { data: byName } = await supabase
    .from("models")
    .select("id, username, first_name, last_name, instagram_url, is_approved, user_id, created_at")
    .ilike("first_name", FIRST)
    .ilike("last_name", LAST);
  if (byName) candidates.push(...byName);

  // Dedupe by id
  const seen = new Set<string>();
  const unique = candidates.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });

  console.log("Candidate models:", unique);

  if (unique.length === 0) {
    console.error("No model found for", HANDLE);
    process.exit(1);
  }
  if (unique.length > 1) {
    console.error("Multiple candidates — refusing to guess. Pick one and rerun.");
    process.exit(1);
  }
  const model = unique[0];

  // Find MSW 2026 gig
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, slug, status, spots, spots_filled")
    .eq("slug", "miami-swim-week-2026")
    .single();
  if (!gig) { console.error("MSW 2026 gig not found"); process.exit(1); }
  console.log("\nGig:", gig);

  // Existing?
  const { data: existing } = await supabase
    .from("gig_applications")
    .select("id, status")
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
  // Intentionally do NOT touch gigs.spots_filled — it tracks accepted-only,
  // bumped by the admin review route when an application is accepted.
}

main().catch((e) => { console.error(e); process.exit(1); });
